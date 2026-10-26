import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useBeforeUnload } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  ScreenShare, StopCircle, MessageSquare, Users, FileText,
  CalendarDays, X, CheckCircle2, Loader2, AlertTriangle,
  Maximize2, Minimize2, Pin, Volume2, Volume1, VolumeX,
  ChevronLeft, ChevronRight, Activity,
} from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { useModule } from '../../hooks/useModule';
import { moduleCrumbs } from '../../lib/routes';
import { toast } from '../../components/Providers/ToastProvider';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';
import { useMeetStore } from '../../stores/meet.store';
import { meetService, RoomStatus } from '../../services/meetService';
import { useMeetingAudioCapture } from '../../features/meet-module/hooks/useMeetingAudioCapture';

// ─── Web Audio Activity Hook ──────────────────────────────────────────────────
function useAudioActivity(track?: MediaStreamTrack | null): boolean {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!track || track.readyState !== 'live' || !track.enabled) {
      setIsSpeaking(false);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number;
    let silenceTimer: any = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const stream = new MediaStream([track]);
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;

        if (average > 14) {
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
          setIsSpeaking(true);
        } else {
          if (!silenceTimer) {
            silenceTimer = setTimeout(() => {
              setIsSpeaking(false);
              silenceTimer = null;
            }, 350);
          }
        }
        animId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('[AudioActivity] Web Audio unavailable:', e);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (silenceTimer) clearTimeout(silenceTimer);
      try { source?.disconnect(); } catch (_) {}
      try { analyser?.disconnect(); } catch (_) {}
      try { audioContext?.close(); } catch (_) {}
      setIsSpeaking(false);
    };
  }, [track]);

  return isSpeaking;
}

// ─── RemoteAudio: dedicated <audio> for Android compat ───────────────────────
const remoteAudioRefs: Set<HTMLAudioElement> = new Set();

const RemoteAudio: React.FC<{ track: MediaStreamTrack; volume?: number }> = ({ track, volume = 1 }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    remoteAudioRefs.add(el);
    return () => { remoteAudioRefs.delete(el); };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    const stream = new MediaStream([track]);
    el.srcObject = stream;
    el.play().catch((e) => console.warn('[RemoteAudio] play() blocked — waiting for gesture:', e));
    return () => { el.srcObject = null; };
  }, [track]);

  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};

// ─── VideoRenderer ────────────────────────────────────────────────────────────
const VideoRenderer: React.FC<{
  track?: MediaStreamTrack | null;
  isLocal?: boolean;
  className?: string;
}> = ({ track, isLocal, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (track) {
      const stream = new MediaStream([track]);
      el.srcObject = stream;

      const playVideo = () => {
        el.play().catch(() => {});
      };

      playVideo();
      el.addEventListener('loadedmetadata', playVideo);
      track.addEventListener('unmute', playVideo);

      return () => {
        el.removeEventListener('loadedmetadata', playVideo);
        track.removeEventListener('unmute', playVideo);
        el.srcObject = null;
      };
    } else {
      el.srcObject = null;
    }
  }, [track]);

  if (!track) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
};

// ─── ParticipantTile ──────────────────────────────────────────────────────────
interface ParticipantTileProps {
  id: string;
  name: string;
  avatar: string;
  videoTrack?: MediaStreamTrack | null;
  audioTrack?: MediaStreamTrack | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isSpotlight?: boolean;
  isCompact?: boolean;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  onToggleSpotlight?: () => void;
  onSpeakingChange?: (id: string, isSpeaking: boolean) => void;
  className?: string;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({
  id,
  name,
  avatar,
  videoTrack,
  audioTrack,
  isLocal,
  isMuted,
  isSpeaking: parentSpeaking,
  isSpotlight,
  isCompact,
  volume = 100,
  onVolumeChange,
  onToggleSpotlight,
  onSpeakingChange,
  className = '',
}) => {
  const detectedSpeaking = useAudioActivity(isMuted ? null : audioTrack);
  const isSpeaking = parentSpeaking || detectedSpeaking;
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    onSpeakingChange?.(id, isSpeaking);
  }, [id, isSpeaking, onSpeakingChange]);

  return (
    <motion.div
      layout
      onDoubleClick={onToggleSpotlight}
      className={`group relative bg-card/90 dark:bg-card border rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300 select-none cursor-pointer ${
        isSpeaking
          ? 'ring-2 ring-emerald-500 border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
          : 'border-border hover:border-border-strong'
      } ${className}`}
    >
      {/* Video or Avatar */}
      {videoTrack ? (
        <VideoRenderer track={videoTrack} isLocal={isLocal} className="rounded-2xl" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div
            className={`${
              isCompact ? 'w-10 h-10 text-base' : isSpotlight ? 'w-24 h-24 text-3xl' : 'w-16 h-16 text-xl'
            } rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold shadow-md ring-4 ring-border`}
          >
            {avatar}
          </div>
          {!isCompact && (
            <span className="text-foreground text-xs md:text-sm font-medium">{name}</span>
          )}
        </div>
      )}

      {/* Top Left: Individual Volume Control (remote participants only) */}
      {!isLocal && onVolumeChange && (
        <div
          className={`absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-background/80 dark:bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-border transition-opacity ${
            showVolumeSlider ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onVolumeChange(volume === 0 ? 100 : 0)}
            className="text-foreground/80 hover:text-foreground transition-colors"
            title={volume === 0 ? 'Unmute locally' : 'Mute locally'}
          >
            {volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-destructive" />
            ) : volume < 50 ? (
              <Volume1 className="w-3.5 h-3.5 text-foreground/80" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-foreground/80" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-16 h-1 bg-border accent-accent rounded-lg cursor-pointer"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          />
          <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">{volume}%</span>
        </div>
      )}

      {/* Top Right: Pin / Spotlight Button */}
      {onToggleSpotlight && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSpotlight();
            }}
            title={isSpotlight ? 'Exit Spotlight' : 'Spotlight card (double-click)'}
            className="bg-background/80 hover:bg-background dark:bg-black/60 dark:hover:bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-border text-foreground/80 hover:text-foreground transition-all shadow-md"
          >
            {isSpotlight ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Bottom Left: Name Badge & Speaking Waveform */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-background/85 dark:bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border max-w-[85%] shadow-sm">
        {isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-destructive shrink-0" />
        ) : isSpeaking ? (
          <div className="flex items-center gap-0.5 px-0.5">
            <span className="w-1 h-2.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-3.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        ) : null}
        <span className="text-foreground text-xs font-medium truncate">
          {name}{isLocal ? ' (You)' : ''}
        </span>
      </div>

      {/* Green border audio activity glow */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500 pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
};

// ─── PRE-JOIN PAGE ────────────────────────────────────────────────────────────
const PreJoinScreen: React.FC<{ onJoin: () => void; onCancel: () => void }> = ({ onJoin, onCancel }) => {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<'checking' | 'ready' | 'denied'>('checking');
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const check = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, facingMode: 'user' },
          audio: true,
        });
        setStatus('ready');
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
      } catch {
        setStatus('denied');
      }
    };
    check();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl text-foreground">
        <h2 className="text-xl font-bold text-foreground mb-1">Ready to join?</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Check your camera and microphone before entering the meeting.
        </p>

        {/* Video preview */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border border-border mb-6">
          {status === 'checking' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <span className="text-muted-foreground text-sm">Requesting camera access…</span>
            </div>
          )}
          {status === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-foreground text-sm font-medium">Camera/Microphone access was denied.</p>
              <p className="text-muted-foreground text-xs">
                You can still join without media. Enable permissions in your browser settings to use your camera and mic.
              </p>
            </div>
          )}
          {status === 'ready' && (
            <>
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-background/80 dark:bg-black/60 px-2.5 py-1 rounded-full border border-border text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-medium">Camera ready</span>
              </div>
            </>
          )}
          {/* Avatar fallback overlay when no video */}
          {status !== 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-2xl font-bold shadow-md">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground/80 hover:text-foreground hover:bg-muted text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onJoin}
            className="flex-1 py-2.5 rounded-xl bg-accent hover:opacity-90 text-accent-foreground text-sm font-bold transition-all shadow-md"
          >
            Join Meeting
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN MEET PAGE ───────────────────────────────────────────────────────────
export const MeetPage: React.FC = () => {
  const { projectId, moduleId } = useParams();
  const { module } = useModule(moduleId);
  const [meetingMode, setMeetingMode] = useState<'hub' | 'pre-join' | 'in-call'>('hub');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('Weekly Sync');
  const [scheduleDate, setScheduleDate] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<'participants' | 'chat'>('participants');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  // True when user auto-joined without a gesture — audio needs unlock tap
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [duplicateDisconnectReason, setDuplicateDisconnectReason] = useState<string | null>(null);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const [showSidebar, setShowSidebar] = useState(false);
  const recordingInterval = useRef<any | null>(null);

  const getVolume = useCallback(
    (id: string) => (participantVolumes[id] !== undefined ? participantVolumes[id] : 100),
    [participantVolumes]
  );
  const setVolume = useCallback(
    (id: string, vol: number) => setParticipantVolumes((prev) => ({ ...prev, [id]: vol })),
    []
  );
  const handleSpeakingChange = useCallback((id: string, isSpeaking: boolean) => {
    setSpeakingMap((prev) => {
      if (prev[id] === isSpeaking) return prev;
      return { ...prev, [id]: isSpeaking };
    });
  }, []);

  const { sendMessage: sendChannelMessage, channels } = useChatStore();
  const user = useAuthStore((s) => s.user);

  const {
    connect, disconnect, participants,
    localVideoTrack, localAudioTrack, localScreenTrack,
    isMuted, isVideoOff, isScreenSharing,
    toggleMute, toggleVideo, toggleScreenShare,
    isTranscribing, isCapturer, capturerName, meetingNoteId,
    startTranscription, stopTranscription,
  } = useMeetStore();

  // Active audio capture streamer when this attendee is the capturer
  useMeetingAudioCapture(moduleId);

  const isInCall = meetingMode === 'in-call';

  // ─── Navigation guard ───────────────────────────────────────────
  useBeforeUnload(
    useCallback(
      (e) => {
        if (isInCall) e.preventDefault();
      },
      [isInCall]
    )
  );

  // Guard in-app navigation
  useEffect(() => {
    if (!isInCall) return;
    const handler = (_e: PopStateEvent) => {
      const confirmed = window.confirm('Leave meeting? Others will still be in the call.');
      if (confirmed) {
        disconnect();
      } else {
        // Push state back so we stay on the page
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isInCall, disconnect]);

  // ─── Recording timer ────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } else {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    }
    return () => { if (recordingInterval.current) clearInterval(recordingInterval.current); };
  }, [isRecording]);

  // ─── Cleanup on unmount & duplicate device kick listener ───────
  useEffect(() => {
    useMeetStore.getState().setOnDisconnected((reason) => {
      if (reason === 'duplicate') {
        setDuplicateDisconnectReason(
          'You were disconnected because this account joined the meeting from another device or window.'
        );
      }
      setMeetingMode('hub');
    });
    return () => {
      useMeetStore.getState().setOnDisconnected(null);
      disconnect();
    };
  }, [disconnect]);

  // ─── Poll active room status for this module ───────────────────
  useEffect(() => {
    if (!moduleId) return;
    let cancelled = false;

    const checkActiveRoom = async () => {
      try {
        const status = await meetService.getRoomStatus(moduleId);
        if (cancelled) return;
        setRoomStatus(status);
      } catch {
        // Room not found or API error
      }
    };

    checkActiveRoom();
    const interval = setInterval(checkActiveRoom, 3500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [moduleId]);

  // ─── Helpers ────────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const tryAutoPermissions = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, facingMode: 'user' },
        audio: true,
      });
      // Release camera/microphone immediately so hardware light turns off
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  };

  const enterCall = () => {
    setDuplicateDisconnectReason(null);
    setMeetingMode('in-call');
    connect(moduleId || 'default-room');
  };

  const handleStartInstant = async () => {
    const isAlreadyActive = roomStatus?.status === 'active' && (roomStatus?.livePeerCount ?? 0) > 0;

    // Only broadcast chat notification if starting a brand new meeting
    if (!isAlreadyActive) {
      const activeChannel = channels.find((c) => c.moduleId === moduleId) || channels[0];
      if (activeChannel) {
        sendChannelMessage(
          activeChannel.id,
          `🎥 I'm starting an instant meeting! Join here: ${window.location.origin}/project/${projectId}/module/${moduleId}/meet`,
          user?.id || 'u1'
        );
      }
    }

    // Try silently to get media — if it works skip the pre-join UI
    const hasPermission = await tryAutoPermissions();
    if (hasPermission) {
      enterCall();
    } else {
      setMeetingMode('pre-join');
    }
  };

  const unlockAudio = useCallback(() => {
    remoteAudioRefs.forEach((el) => {
      el.play().catch((e) => console.warn('[AudioUnlock] play failed:', e));
    });
    setNeedsAudioUnlock(false);
  }, []);

  // Global listener: first click/tap anywhere unlocks all audio elements
  useEffect(() => {
    if (!needsAudioUnlock) return;
    const handleGesture = () => {
      unlockAudio();
    };
    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [needsAudioUnlock, unlockAudio]);

  const handlePreJoinConfirm = () => { enterCall(); };
  const handlePreJoinCancel = () => { setMeetingMode('hub'); };

  const endCall = () => {
    const confirmed = window.confirm('Leave meeting? Others will still be in the call.');
    if (!confirmed) return;
    disconnect();
    toast.success('Call ended');
    setMeetingMode('hub');
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), userId: user?.id, userName: user?.name, message: newMessage, timestamp: new Date() },
    ]);
    setNewMessage('');
  };

  // ─── Assemble Participant Models & Dynamic Priority Sort ─────────
  const localParticipant = useMemo(
    () => ({
      id: 'local',
      name: user?.name || 'You',
      avatar: user?.name?.[0]?.toUpperCase() || 'U',
      isMuted,
      isVideoOff,
      isSpeaking: speakingMap['local'] || false,
      videoTrack: localVideoTrack || undefined,
      audioTrack: isMuted ? undefined : (localAudioTrack || undefined),
      isLocal: true,
    }),
    [user?.name, isMuted, isVideoOff, speakingMap, localVideoTrack, localAudioTrack]
  );

  const remoteParticipantList = useMemo(() => {
    return Object.values(participants).map((p) => ({
      ...p,
      isLocal: false,
      isSpeaking: speakingMap[p.id] || false,
    }));
  }, [participants, speakingMap]);

  // Priority sorting for remote attendees:
  // 1. Speaking (isSpeaking === true)
  // 2. Screen sharing
  // 3. Video active
  // 4. Alphabetical tie-breaker
  const sortedRemote = useMemo(() => {
    return [...remoteParticipantList].sort((a, b) => {
      const getScore = (p: any) => {
        let score = 0;
        if (speakingMap[p.id]) score += 100;
        if (p.isScreenSharing) score += 75;
        if (p.videoTrack && !p.isVideoOff) score += 50;
        return score;
      };
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [remoteParticipantList, speakingMap]);

  // Mobile list: remote users sorted by priority first, local user at the very bottom
  const mobileList = useMemo(() => {
    return [...sortedRemote, localParticipant];
  }, [sortedRemote, localParticipant]);

  const totalAttendees = 1 + sortedRemote.length;

  // Desktop list:
  // When < 6 attendees: flex centered (remote first, local at bottom/end)
  // When >= 6 attendees: strict 2 rows x 3 columns grid
  // Page 0: top 5 remote attendees + local user at index 5 (last slot, row 2)
  // Page 1+: next slices of 6 remote attendees
  const totalPages = Math.max(1, 1 + Math.ceil(Math.max(0, sortedRemote.length - 5) / 6));

  const currentDesktopPageCards = useMemo(() => {
    if (totalAttendees < 6) return [...sortedRemote, localParticipant];
    if (currentPage === 0) {
      return [...sortedRemote.slice(0, 5), localParticipant];
    }
    const startIndex = 5 + (currentPage - 1) * 6;
    return sortedRemote.slice(startIndex, startIndex + 6);
  }, [totalAttendees, sortedRemote, localParticipant, currentPage]);

  // Spotlight Models
  const allAttendees = useMemo(
    () => [localParticipant, ...sortedRemote],
    [localParticipant, sortedRemote]
  );
  const participantList = allAttendees;

  const remotePeersWithAudio = useMemo(() => {
    return Object.values(participants).filter((p) => !!p.audioTrack);
  }, [participants]);

  const spotlightParticipant = useMemo(
    () => allAttendees.find((p) => p.id === spotlightId) || null,
    [allAttendees, spotlightId]
  );
  const otherParticipants = useMemo(
    () => allAttendees.filter((p) => p.id !== spotlightId),
    [allAttendees, spotlightId]
  );

  // Keyboard Escape listener to exit spotlight mode
  useEffect(() => {
    if (!spotlightId) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSpotlightId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [spotlightId]);

  // Keyboard pagination navigation
  useEffect(() => {
    if (totalPages <= 1 || spotlightId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentPage((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, spotlightId]);

  // Reset pagination if totalPages shrinks
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  // ═══════════════════════════════════════════════════════════════
  // HUB VIEW
  // ═══════════════════════════════════════════════════════════════
  if (meetingMode === 'hub') {
    const isMeetingActive = roomStatus?.status === 'active' && (roomStatus?.livePeerCount ?? 0) > 0;
    const peerCount = roomStatus?.livePeerCount ?? 0;

    return (
      <PageContainer title={module?.name ?? 'Meet'} crumbs={moduleCrumbs(module)}>
        <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-var(--shell-top)-4.5rem)] px-4">
          <div className="max-w-lg w-full">
            {/* Duplicate login warning banner */}
            {duplicateDisconnectReason && (
              <div className="mb-4 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-start justify-between gap-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  <span>{duplicateDisconnectReason}</span>
                </div>
                <button
                  onClick={() => setDuplicateDisconnectReason(null)}
                  className="p-1 hover:bg-amber-500/20 rounded text-amber-400/80 hover:text-amber-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className={`bg-card border ${isMeetingActive ? 'border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20' : 'border-border shadow-sm'} rounded-2xl p-8 text-center`}>
              {isMeetingActive ? (
                <>
                  <div className="relative w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                    <Video className="w-8 h-8" />
                    <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Meeting in Progress · {peerCount} in call</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Ongoing Meeting</h2>
                  <p className="text-muted-foreground mb-8">
                    A meeting is currently active in this module. Meeting rooms are unique per module, so creating a new meeting is disabled.
                  </p>
                  <AnimatedButton
                    variant="primary"
                    size="lg"
                    onClick={handleStartInstant}
                    className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white"
                  >
                    <Video className="w-5 h-5 mr-2" /> Join Ongoing Meeting
                  </AnimatedButton>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Video className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Team Meetings</h2>
                  <p className="text-muted-foreground mb-8">
                    Start an instant meeting or schedule one for later.
                  </p>
                  <div className="flex flex-col gap-4">
                    <AnimatedButton variant="primary" size="lg" onClick={handleStartInstant} className="w-full justify-center">
                      <Video className="w-5 h-5 mr-2" /> Start Instant Meeting
                    </AnimatedButton>
                    <AnimatedButton variant="outline" size="lg" onClick={() => setShowScheduleModal(true)} className="w-full justify-center">
                      <CalendarDays className="w-5 h-5 mr-2" /> Schedule Meeting
                    </AnimatedButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border shadow-xl rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-foreground mb-4">Schedule Meeting</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Meeting Title</label>
                  <input type="text" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date & Time</label>
                  <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <AnimatedButton variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</AnimatedButton>
                <AnimatedButton variant="primary" onClick={() => { toast.success('Meeting scheduled!'); setShowScheduleModal(false); }}>Schedule</AnimatedButton>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PRE-JOIN VIEW
  // ═══════════════════════════════════════════════════════════════
  if (meetingMode === 'pre-join') {
    return <PreJoinScreen onJoin={handlePreJoinConfirm} onCancel={handlePreJoinCancel} />;
  }

  // ═══════════════════════════════════════════════════════════════
  // IN-CALL VIEW
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col overflow-hidden select-none">
      {/* Invisible audio sinks for remote peers with dynamic per-participant volume */}
      {remotePeersWithAudio.map((p) => (
        <RemoteAudio key={p.id} track={p.audioTrack!} volume={getVolume(p.id) / 100} />
      ))}

      {/* ── Audio Unlock Banner (for auto-joined mobile/desktop autoplay policy) ── */}
      <AnimatePresence>
        {needsAudioUnlock && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={unlockAudio}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-accent hover:opacity-90 text-accent-foreground px-4 py-2 rounded-full shadow-lg cursor-pointer flex items-center gap-2 text-sm font-medium animate-bounce"
          >
            <Mic className="w-4 h-4" />
            <span>Tap anywhere to enable meeting audio</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-md border-b border-border shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-foreground font-semibold text-sm">
            Meeting · {participantList.length} participant{participantList.length !== 1 ? 's' : ''}
          </span>
          {spotlightId && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent border border-accent/20">
              <Pin className="w-3 h-3 rotate-45" />
              Spotlight Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-destructive/15 border border-destructive/30 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
              <span className="text-destructive text-xs font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}

          {isTranscribing && (
            <div className="flex items-center gap-2 bg-accent-soft border border-accent/30 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-accent text-xs font-medium">
                {isCapturer ? 'Transcribing to Notes' : `Transcribing (${capturerName || 'Attendee'})`}
              </span>
              {meetingNoteId && (
                <a
                  href={`/project/${projectId}/module/${moduleId}/notes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline ml-1 font-semibold"
                >
                  View Note
                </a>
              )}
            </div>
          )}

          {/* Desktop Sidebar Toggle in Top Bar */}
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              showSidebar
                ? 'bg-accent border-accent text-accent-foreground shadow-sm'
                : 'bg-secondary border-border text-secondary-foreground hover:bg-muted'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sidebar</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* === MOBILE VIEW (< md) === */}
        <div className="flex md:hidden flex-1 flex-col overflow-y-auto p-3 pb-24 w-full">
          {/* Screen share banner on mobile if local sharing */}
          {isScreenSharing && localScreenTrack && (
            <div className="mb-3 relative rounded-xl overflow-hidden bg-card aspect-video shrink-0 border border-border">
              <VideoRenderer track={localScreenTrack} isLocal />
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Sharing Screen
              </div>
            </div>
          )}

          {spotlightId && spotlightParticipant ? (
            /* Mobile Spotlight: Spotlight card on top, others stacked below */
            <div className="flex flex-col gap-3">
              <div className="relative w-full aspect-video shrink-0">
                <ParticipantTile
                  id={spotlightParticipant.id}
                  name={spotlightParticipant.name}
                  avatar={spotlightParticipant.avatar}
                  videoTrack={spotlightParticipant.videoTrack}
                  audioTrack={spotlightParticipant.audioTrack}
                  isLocal={spotlightParticipant.isLocal}
                  isMuted={spotlightParticipant.isMuted}
                  isSpeaking={spotlightParticipant.isSpeaking}
                  isSpotlight
                  volume={getVolume(spotlightParticipant.id)}
                  onVolumeChange={spotlightParticipant.isLocal ? undefined : (vol) => setVolume(spotlightParticipant.id, vol)}
                  onToggleSpotlight={() => setSpotlightId(null)}
                  onSpeakingChange={handleSpeakingChange}
                  className="w-full h-full shadow-2xl"
                />
                <button
                  onClick={() => setSpotlightId(null)}
                  className="absolute top-2 right-2 z-30 bg-card/90 dark:bg-black/70 hover:bg-card dark:hover:bg-black/90 text-foreground dark:text-white text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1 backdrop-blur-md shadow-md"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              </div>

              {otherParticipants.length > 0 && (
                <div className="flex flex-col gap-3 pt-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Other Attendees ({otherParticipants.length})
                  </div>
                  {otherParticipants.map((p) => (
                    <ParticipantTile
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      avatar={p.avatar}
                      videoTrack={p.videoTrack}
                      audioTrack={p.audioTrack}
                      isLocal={p.isLocal}
                      isMuted={p.isMuted}
                      isSpeaking={p.isSpeaking}
                      volume={getVolume(p.id)}
                      onVolumeChange={p.isLocal ? undefined : (vol) => setVolume(p.id, vol)}
                      onToggleSpotlight={() => setSpotlightId(p.id)}
                      onSpeakingChange={handleSpeakingChange}
                      className="w-full aspect-video shrink-0"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Mobile Normal: Single column stacked vertically, local user at lowest position (bottom) */
            <div className="flex flex-col gap-3 w-full">
              {mobileList.map((p) => (
                <ParticipantTile
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  avatar={p.avatar}
                  videoTrack={p.videoTrack}
                  audioTrack={p.audioTrack}
                  isLocal={p.isLocal}
                  isMuted={p.isMuted}
                  isSpeaking={p.isSpeaking}
                  volume={getVolume(p.id)}
                  onVolumeChange={p.isLocal ? undefined : (vol) => setVolume(p.id, vol)}
                  onToggleSpotlight={() => setSpotlightId(p.id)}
                  onSpeakingChange={handleSpeakingChange}
                  className="w-full aspect-video shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        {/* === DESKTOP VIEW (md & lg+) === */}
        <div className="hidden md:flex flex-1 overflow-hidden relative">
          {spotlightId && spotlightParticipant ? (
            /* Desktop Spotlight Mode: Main stage left, collapsed thumbnail column right */
            <div className="flex flex-1 h-full min-h-0 overflow-hidden">
              {/* Main Stage */}
              <div className="flex-1 h-full min-h-0 relative p-4 flex items-center justify-center">
                <ParticipantTile
                  id={spotlightParticipant.id}
                  name={spotlightParticipant.name}
                  avatar={spotlightParticipant.avatar}
                  videoTrack={spotlightParticipant.videoTrack}
                  audioTrack={spotlightParticipant.audioTrack}
                  isLocal={spotlightParticipant.isLocal}
                  isMuted={spotlightParticipant.isMuted}
                  isSpeaking={spotlightParticipant.isSpeaking}
                  isSpotlight
                  volume={getVolume(spotlightParticipant.id)}
                  onVolumeChange={spotlightParticipant.isLocal ? undefined : (vol) => setVolume(spotlightParticipant.id, vol)}
                  onToggleSpotlight={() => setSpotlightId(null)}
                  onSpeakingChange={handleSpeakingChange}
                  className="w-full h-full max-h-[calc(100vh-170px)] aspect-video object-contain shadow-2xl"
                />
                {/* Exit Spotlight Floating Button */}
                <button
                  onClick={() => setSpotlightId(null)}
                  className="absolute top-7 right-7 z-30 bg-card/90 dark:bg-black/70 hover:bg-card dark:hover:bg-black/90 text-foreground dark:text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-border flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg hover:scale-105"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit Spotlight (Esc)</span>
                </button>
              </div>

              {/* Right Collapsed Single Column */}
              <div className="w-72 lg:w-80 flex flex-col gap-3 overflow-y-auto p-4 shrink-0 border-l border-border bg-card/40">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Attendees ({otherParticipants.length})
                </div>
                {otherParticipants.map((p) => (
                  <ParticipantTile
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    avatar={p.avatar}
                    videoTrack={p.videoTrack}
                    audioTrack={p.audioTrack}
                    isLocal={p.isLocal}
                    isMuted={p.isMuted}
                    isSpeaking={p.isSpeaking}
                    isCompact
                    volume={getVolume(p.id)}
                    onVolumeChange={p.isLocal ? undefined : (vol) => setVolume(p.id, vol)}
                    onToggleSpotlight={() => setSpotlightId(p.id)}
                    onSpeakingChange={handleSpeakingChange}
                    className="w-full aspect-video shrink-0 hover:ring-2 hover:ring-accent"
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Desktop Normal Mode: Flex (< 6) OR Strict 2x3 Grid (>= 6) */
            <div className="flex-1 h-full min-h-0 relative flex flex-col justify-center items-center overflow-hidden p-4">
              {/* Screen share banner if active */}
              {isScreenSharing && localScreenTrack && (
                <div className="mb-3 relative rounded-xl overflow-hidden bg-card max-w-xl w-full aspect-video shrink-0 border border-border">
                  <VideoRenderer track={localScreenTrack} isLocal />
                  <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                    You are sharing your screen
                  </div>
                </div>
              )}

              {/* Left Pagination Arrow */}
              {totalPages > 1 && currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-card/90 hover:bg-card border border-border text-foreground shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                  title="Previous page (Left arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Right Pagination Arrow */}
              {totalPages > 1 && currentPage < totalPages - 1 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-card/90 hover:bg-card border border-border text-foreground shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                  title="Next page (Right arrow)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Video Cards Container */}
              {totalAttendees < 6 ? (
                /* Flex layout when < 6 attendees: centered, fixed size cards */
                <div className="flex flex-wrap justify-center items-center gap-4 w-full max-w-6xl max-h-[calc(100vh-170px)] overflow-y-auto content-center p-2">
                  {currentDesktopPageCards.map((p) => (
                    <ParticipantTile
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      avatar={p.avatar}
                      videoTrack={p.videoTrack}
                      audioTrack={p.audioTrack}
                      isLocal={p.isLocal}
                      isMuted={p.isMuted}
                      isSpeaking={p.isSpeaking}
                      volume={getVolume(p.id)}
                      onVolumeChange={p.isLocal ? undefined : (vol) => setVolume(p.id, vol)}
                      onToggleSpotlight={() => setSpotlightId(p.id)}
                      onSpeakingChange={handleSpeakingChange}
                      className="w-[330px] lg:w-[360px] xl:w-[400px] aspect-video max-h-[230px] shrink-0"
                    />
                  ))}
                </div>
              ) : (
                /* Strict 2 rows x 3 columns grid when >= 6 attendees */
                <div className="grid grid-cols-3 grid-rows-2 gap-4 w-full max-w-6xl h-full max-h-[calc(100vh-180px)] place-items-stretch content-center p-2">
                  {currentDesktopPageCards.map((p) => (
                    <ParticipantTile
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      avatar={p.avatar}
                      videoTrack={p.videoTrack}
                      audioTrack={p.audioTrack}
                      isLocal={p.isLocal}
                      isMuted={p.isMuted}
                      isSpeaking={p.isSpeaking}
                      volume={getVolume(p.id)}
                      onVolumeChange={p.isLocal ? undefined : (vol) => setVolume(p.id, vol)}
                      onToggleSpotlight={() => setSpotlightId(p.id)}
                      onSpeakingChange={handleSpeakingChange}
                      className="w-full h-full min-h-[170px] max-h-[260px] aspect-video"
                    />
                  ))}
                </div>
              )}

              {/* Pagination Dots & Page Indicator */}
              {totalPages > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-card/90 dark:bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border dark:border-white/10 text-xs text-foreground/80 dark:text-white/70 shadow-lg">
                  <span className="font-mono text-[11px]">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1.5 ml-1">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentPage ? 'w-5 bg-accent' : 'w-2 bg-border dark:bg-white/30 hover:bg-muted-foreground/60'
                        }`}
                        title={`Go to page ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop Right Sidebar (Toggleable Participants / Chat) ── */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden md:flex flex-col bg-card/95 backdrop-blur-md border-l border-border shrink-0 overflow-hidden z-30 text-foreground"
            >
              {/* Sidebar Header & Tabs */}
              <div className="flex items-center border-b border-border shrink-0 px-2">
                {(['participants', 'chat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActivePanel(tab)}
                    className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      activePanel === tab
                        ? 'text-foreground border-b-2 border-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'participants' ? (
                      <>
                        <Users className="w-3.5 h-3.5 inline mr-1" />
                        People ({participantList.length})
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                        Chat
                      </>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors ml-1"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Body */}
              <div className="flex-1 overflow-y-auto">
                {activePanel === 'participants' && (
                  <div className="p-3 space-y-2">
                    {participantList.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
                      >
                        <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shrink-0">
                          {p.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {p.name}
                            {p.isLocal ? ' (You)' : ''}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.isMuted ? (
                              <MicOff className="w-3 h-3 text-destructive" />
                            ) : p.isSpeaking ? (
                              <span className="text-[10px] text-emerald-500 font-medium">Speaking</span>
                            ) : (
                              <Mic className="w-3 h-3 text-muted-foreground" />
                            )}
                            {p.isVideoOff && <VideoOff className="w-3 h-3 text-destructive" />}
                          </div>
                        </div>
                        {!p.isLocal && (
                          <button
                            onClick={() => setSpotlightId((curr) => (curr === p.id ? null : p.id))}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                            title={spotlightId === p.id ? 'Exit Spotlight' : 'Spotlight user'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${spotlightId === p.id ? 'text-accent' : ''}`} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activePanel === 'chat' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                      {messages.length === 0 && (
                        <p className="text-muted-foreground text-sm text-center mt-8">No messages yet.</p>
                      )}
                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                              m.userId === user?.id
                                ? 'bg-accent text-accent-foreground rounded-tr-none'
                                : 'bg-secondary text-secondary-foreground rounded-tl-none border border-border'
                            }`}
                          >
                            {m.userId !== user?.id && (
                              <p className="text-[11px] font-semibold mb-0.5 text-accent">
                                {m.userName}
                              </p>
                            )}
                            <p className="leading-snug">{m.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-border flex gap-2 bg-card/80">
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Message everyone…"
                        className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                      <button
                        onClick={sendMessage}
                        className="bg-accent hover:opacity-90 text-accent-foreground px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Control Bar ─────────────────────────────────────── */}
      <div className="shrink-0 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 pb-safe-bottom z-20 shadow-lg">
        <div className="flex items-center justify-center gap-2 md:gap-3 max-w-xl mx-auto">
          {/* Mic */}
          <ControlButton
            onClick={toggleMute}
            active={!isMuted}
            icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            label={isMuted ? 'Unmute' : 'Mute'}
            danger={isMuted}
          />

          {/* Camera */}
          <ControlButton
            onClick={toggleVideo}
            active={!isVideoOff}
            icon={isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            label={isVideoOff ? 'Start Video' : 'Stop Video'}
            danger={isVideoOff}
          />

          {/* Screen Share */}
          <ControlButton
            onClick={toggleScreenShare}
            active={isScreenSharing}
            icon={<ScreenShare className="w-5 h-5" />}
            label="Share"
            className="hidden sm:flex"
          />

          {/* Record */}
          <ControlButton
            onClick={() => {
              setIsRecording((v) => !v);
              if (!isRecording) setRecordingTime(0);
            }}
            active={isRecording}
            icon={<StopCircle className="w-5 h-5" />}
            label={isRecording ? formatTime(recordingTime) : 'Record'}
            danger={isRecording}
            className="hidden sm:flex"
          />

          {/* Participants toggle (works for mobile bottom sheet and desktop sidebar) */}
          <ControlButton
            onClick={() => {
              if (window.innerWidth < 768) {
                setShowPanel((v) => !v);
                setActivePanel('participants');
              } else {
                if (showSidebar && activePanel === 'participants') {
                  setShowSidebar(false);
                } else {
                  setShowSidebar(true);
                  setActivePanel('participants');
                }
              }
            }}
            active={(showPanel || showSidebar) && activePanel === 'participants'}
            icon={<Users className="w-5 h-5" />}
            label="People"
          />

          {/* Chat toggle (works for mobile bottom sheet and desktop sidebar) */}
          <ControlButton
            onClick={() => {
              if (window.innerWidth < 768) {
                setShowPanel((v) => !v);
                setActivePanel('chat');
              } else {
                if (showSidebar && activePanel === 'chat') {
                  setShowSidebar(false);
                } else {
                  setShowSidebar(true);
                  setActivePanel('chat');
                }
              }
            }}
            active={(showPanel || showSidebar) && activePanel === 'chat'}
            icon={<MessageSquare className="w-5 h-5" />}
            label="Chat"
          />

          {/* Live Transcription Button */}
          {isTranscribing ? (
            isCapturer ? (
              <ControlButton
                onClick={stopTranscription}
                active={true}
                danger={true}
                icon={<StopCircle className="w-5 h-5 text-destructive animate-pulse" />}
                label="Stop Transcribe"
                className="bg-destructive/15 border border-destructive/30"
              />
            ) : (
              <ControlButton
                onClick={() => {}}
                active={false}
                icon={<FileText className="w-5 h-5 text-amber-500" />}
                label={capturerName ? `Transcribing (${capturerName})` : 'Transcribing...'}
                className="opacity-60 cursor-not-allowed"
              />
            )
          ) : (
            <ControlButton
              onClick={() => startTranscription(moduleId)}
              active={false}
              icon={<FileText className="w-5 h-5 text-accent" />}
              label="Transcribe"
            />
          )}

          {/* Leave */}
          <button
            onClick={endCall}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-destructive hover:opacity-90 text-destructive-foreground transition-all shadow-md"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Leave</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Panel (Participants / Chat Sheet) ──── */}
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanel(false)}
              className="md:hidden fixed inset-0 bg-background/80 z-40 backdrop-blur-sm"
            />
            <motion.div
              key="panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl overflow-hidden shadow-2xl text-foreground"
              style={{ maxHeight: '75vh' }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>

              <div className="flex border-b border-border px-4">
                {(['participants', 'chat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActivePanel(tab)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors capitalize ${
                      activePanel === tab ? 'text-foreground border-b-2 border-accent' : 'text-muted-foreground'
                    }`}
                  >
                    {tab === 'participants' ? `Participants (${participantList.length})` : 'Chat'}
                  </button>
                ))}
                <button onClick={() => setShowPanel(false)} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 90px)' }}>
                {activePanel === 'participants' && (
                  <div className="p-4 space-y-2">
                    {participantList.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60">
                        <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shrink-0">
                          {p.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {p.name}
                            {p.isLocal ? ' (You)' : ''}
                          </p>
                          <div className="flex gap-1 mt-0.5">
                            {p.isMuted && <MicOff className="w-3 h-3 text-destructive" />}
                            {p.isVideoOff && <VideoOff className="w-3 h-3 text-destructive" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activePanel === 'chat' && (
                  <div>
                    <div className="p-4 space-y-3">
                      {messages.length === 0 && (
                        <p className="text-muted-foreground text-sm text-center mt-4">No messages yet.</p>
                      )}
                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 ${
                              m.userId === user?.id ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground border border-border'
                            }`}
                          >
                            {m.userId !== user?.id && (
                              <p className="text-xs font-semibold mb-1 text-accent">{m.userName}</p>
                            )}
                            <p className="text-sm">{m.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="sticky bottom-0 p-4 bg-card border-t border-border flex gap-2">
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Message…"
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                      <button
                        onClick={sendMessage}
                        className="bg-accent hover:opacity-90 text-accent-foreground px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── ControlButton helper ─────────────────────────────────────────────────────
const ControlButton: React.FC<{
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  className?: string;
}> = ({ onClick, active, icon, label, danger, className = '' }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
      danger
        ? 'bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/20'
        : active
        ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25'
        : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50'
    } ${className}`}
  >
    {icon}
    <span className="text-[10px] font-semibold">{label}</span>
  </button>
);
