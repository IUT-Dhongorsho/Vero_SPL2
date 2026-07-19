import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useBeforeUnload } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  ScreenShare, StopCircle, MessageSquare, Users,
  CalendarDays, X, CheckCircle2, Loader2, AlertTriangle,
} from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { toast } from '../../components/Providers/ToastProvider';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';
import { useMeetStore } from '../../stores/meet.store';
import { meetService } from '../../services/meetService';

// ─── RemoteAudio: dedicated <audio> for Android compat ───────────────────────
// Exported so MeetPage can iterate them for the unlock gesture
const remoteAudioRefs: Set<HTMLAudioElement> = new Set();

const RemoteAudio: React.FC<{ track: MediaStreamTrack }> = ({ track }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    remoteAudioRefs.add(el);
    return () => { remoteAudioRefs.delete(el); };
  }, []);

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
      el.play().catch(() => {});
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
      // Always muted: remote audio is handled by dedicated <RemoteAudio> elements.
      // Muted video autoplay is universally allowed by all mobile browsers.
      muted
      className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
};

// ─── ParticipantTile ──────────────────────────────────────────────────────────
const ParticipantTile: React.FC<{
  name: string;
  avatar: string;
  videoTrack?: MediaStreamTrack | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
}> = ({ name, avatar, videoTrack, isLocal, isMuted, isSpeaking }) => (
  <div
    className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center overflow-hidden min-h-[150px] md:min-h-[200px] ${
      isSpeaking ? 'ring-2 ring-green-500' : ''
    }`}
  >
    {videoTrack ? (
      <VideoRenderer track={videoTrack} isLocal={isLocal} className="rounded-xl" />
    ) : (
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg">
          {avatar}
        </div>
        <span className="text-white/70 text-xs md:text-sm font-medium">{name}</span>
      </div>
    )}

    {/* Name badge */}
    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
      {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
      <span className="text-white text-xs font-medium truncate max-w-[100px]">
        {name}{isLocal ? ' (You)' : ''}
      </span>
    </div>

    {isSpeaking && (
      <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
    )}
  </div>
);

// ─── PRE-JOIN PAGE ────────────────────────────────────────────────────────────
const PreJoinScreen: React.FC<{ onJoin: () => void; onCancel: () => void }> = ({ onJoin, onCancel }) => {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<'checking' | 'ready' | 'denied'>('checking');
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const check = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">Ready to join?</h2>
        <p className="text-white/50 text-sm mb-6">
          Check your camera and microphone before entering the meeting.
        </p>

        {/* Video preview */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 mb-6">
          {status === 'checking' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-white/60 text-sm">Requesting camera access…</span>
            </div>
          )}
          {status === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
              <p className="text-white/80 text-sm font-medium">Camera/Microphone access was denied.</p>
              <p className="text-white/50 text-xs">
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
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-white">Camera ready</span>
              </div>
            </>
          )}
          {/* Avatar fallback overlay when no video */}
          {status !== 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onJoin}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
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
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const { sendMessage: sendChannelMessage, channels } = useChatStore();
  const user = useAuthStore((s) => s.user);

  const {
    connect, disconnect, participants,
    localVideoTrack, localScreenTrack,
    isMuted, isVideoOff, isScreenSharing,
    toggleMute, toggleVideo, toggleScreenShare,
  } = useMeetStore();

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

  // ─── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  // ─── Auto-join if a meeting is already active in this room ──────
  useEffect(() => {
    if (!moduleId) return;
    let cancelled = false;

    const checkActiveRoom = async () => {
      try {
        const roomStatus = await meetService.getRoomStatus(moduleId);
        if (cancelled) return;

        if (roomStatus.status === 'active') {
          // Meeting already in progress — try to silently get permissions
          const hasPermission = await tryAutoPermissions();
          if (cancelled) return;

          if (hasPermission) {
            // Permissions already granted → jump straight into the call
            // Mark that we need an audio unlock since no user gesture occurred
            setNeedsAudioUnlock(true);
            setMeetingMode('in-call');
            connect(moduleId);
          } else {
            // Need to show the pre-join permission screen first
            setMeetingMode('pre-join');
          }
        }
        // If idle, leave hub mode as-is so user can start/schedule
      } catch {
        // Room not found or API error — leave as hub
      }
    };

    checkActiveRoom();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // ─── Helpers ────────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const tryAutoPermissions = async (): Promise<boolean> => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return true;
    } catch {
      return false;
    }
  };

  const enterCall = () => {
    setMeetingMode('in-call');
    connect(moduleId || 'default-room');
  };

  const handleStartInstant = async () => {
    const activeChannel = channels.find((c) => c.moduleId === moduleId) || channels[0];
    if (activeChannel) {
      sendChannelMessage(
        activeChannel.id,
        `🎥 I'm starting an instant meeting! Join here: ${window.location.origin}/project/${projectId}/module/${moduleId}/meet`,
        user?.id || 'u1'
      );
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

  // ─── Build participant list ─────────────────────────────────────
  const participantList = [
    {
      id: user?.id || 'local',
      name: user?.name || 'You',
      avatar: user?.name?.[0]?.toUpperCase() || 'U',
      isMuted,
      isVideoOff,
      isSpeaking: false,
      videoTrack: localVideoTrack || undefined,
      isLocal: true,
    },
    ...Object.values(participants).map((p) => ({ ...p, isLocal: false })),
  ];

  const remotePeersWithAudio = Object.values(participants).filter((p) => p.audioTrack);

  // ─── GRID COLS ──────────────────────────────────────────────────
  const total = participantList.length;
  const gridClass =
    total === 1
      ? 'grid-cols-1'
      : total <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : total <= 4
      ? 'grid-cols-2'
      : 'grid-cols-2 lg:grid-cols-3';

  // ═══════════════════════════════════════════════════════════════
  // HUB VIEW
  // ═══════════════════════════════════════════════════════════════
  if (meetingMode === 'hub') {
    return (
      <PageContainer title="Meet" topBarActions={<ThemeToggle />}>
        <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-140px)] px-4">
          <div className="bg-card border border-border shadow-sm rounded-2xl p-8 max-w-lg w-full text-center">
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
    <div className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden">
      {/* Invisible audio sinks for remote peers — Android needs these */}
      {remotePeersWithAudio.map((p) => (
        <RemoteAudio key={p.id} track={p.audioTrack!} />
      ))}

      {/* ── Audio Unlock Banner (for auto-joined mobile/desktop autoplay policy) ── */}
      <AnimatePresence>
        {needsAudioUnlock && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={unlockAudio}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full shadow-lg cursor-pointer flex items-center gap-2 text-sm font-medium animate-bounce"
          >
            <Mic className="w-4 h-4" />
            <span>Tap anywhere to enable meeting audio</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white font-semibold text-sm">Meeting · {participantList.length} participant{participantList.length !== 1 ? 's' : ''}</span>
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            <span className="text-red-400 text-xs font-mono">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* ── Main content area ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video grid */}
        <div className="flex-1 p-3 md:p-4 overflow-y-auto">
          {/* Screen share banner */}
          {isScreenSharing && localScreenTrack && (
            <div className="mb-3 relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
              <VideoRenderer track={localScreenTrack} isLocal />
              <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">Sharing Screen</div>
            </div>
          )}

          <div className={`grid ${gridClass} gap-3 md:gap-4`}>
            {participantList.map((p) => (
              <ParticipantTile
                key={p.id}
                name={p.name}
                avatar={p.avatar}
                videoTrack={p.videoTrack}
                isLocal={p.isLocal}
                isMuted={p.isMuted}
                isSpeaking={p.isSpeaking}
              />
            ))}
          </div>
        </div>

        {/* Desktop right sidebar */}
        <div className="hidden md:flex w-72 lg:w-80 flex-col bg-gray-900/60 border-l border-white/5">
          {/* Tabs */}
          <div className="flex border-b border-white/5 shrink-0">
            {(['participants', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activePanel === tab ? 'text-white border-b-2 border-indigo-500' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'participants' ? <><Users className="w-3.5 h-3.5 inline mr-1" />Participants ({participantList.length})</> : <><MessageSquare className="w-3.5 h-3.5 inline mr-1" />Chat</>}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activePanel === 'participants' && (
              <div className="p-3 space-y-2">
                {participantList.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{p.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{p.name}{p.isLocal ? ' (You)' : ''}</p>
                      <div className="flex gap-1 mt-0.5">
                        {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                        {p.isVideoOff && <VideoOff className="w-3 h-3 text-red-400" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activePanel === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {messages.length === 0 && (
                    <p className="text-white/30 text-sm text-center mt-8">No messages yet.</p>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.userId === user?.id ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white'}`}>
                        {m.userId !== user?.id && <p className="text-xs font-semibold mb-1 text-indigo-300">{m.userName}</p>}
                        <p className="text-sm">{m.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/5 flex gap-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Message…"
                    className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button onClick={sendMessage} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">Send</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Control bar ─────────────────────────────────────── */}
      <div className="shrink-0 bg-gray-900/90 backdrop-blur-md border-t border-white/5 px-4 py-3 pb-safe-bottom">
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

          {/* Screen share — hidden on small screens */}
          <ControlButton
            onClick={toggleScreenShare}
            active={isScreenSharing}
            icon={<ScreenShare className="w-5 h-5" />}
            label="Share"
            className="hidden sm:flex"
          />

          {/* Record — hidden on small screens */}
          <ControlButton
            onClick={() => { setIsRecording((v) => !v); if (!isRecording) setRecordingTime(0); }}
            active={isRecording}
            icon={<StopCircle className="w-5 h-5" />}
            label={isRecording ? formatTime(recordingTime) : 'Record'}
            danger={isRecording}
            className="hidden sm:flex"
          />

          {/* Participants / Chat toggle (mobile only) */}
          <ControlButton
            onClick={() => { setShowPanel((v) => !v); setActivePanel('participants'); }}
            active={showPanel && activePanel === 'participants'}
            icon={<Users className="w-5 h-5" />}
            label="People"
            className="md:hidden"
          />

          {/* Chat toggle (mobile only) */}
          <ControlButton
            onClick={() => { setShowPanel((v) => !v); setActivePanel('chat'); }}
            active={showPanel && activePanel === 'chat'}
            icon={<MessageSquare className="w-5 h-5" />}
            label="Chat"
            className="md:hidden"
          />

          {/* Leave */}
          <button
            onClick={endCall}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Leave</span>
          </button>
        </div>
      </div>

      {/* ── Mobile bottom panel ──────────────────────────────── */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanel(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-white/10 rounded-t-2xl overflow-hidden"
              style={{ maxHeight: '75vh' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 px-4">
                {(['participants', 'chat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActivePanel(tab)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors capitalize ${
                      activePanel === tab ? 'text-white border-b-2 border-indigo-500' : 'text-white/40'
                    }`}
                  >
                    {tab === 'participants' ? `Participants (${participantList.length})` : 'Chat'}
                  </button>
                ))}
                <button onClick={() => setShowPanel(false)} className="p-2 text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 90px)' }}>
                {activePanel === 'participants' && (
                  <div className="p-4 space-y-2">
                    {participantList.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">{p.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{p.name}{p.isLocal ? ' (You)' : ''}</p>
                          <div className="flex gap-1 mt-0.5">
                            {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                            {p.isVideoOff && <VideoOff className="w-3 h-3 text-red-400" />}
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
                        <p className="text-white/30 text-sm text-center mt-4">No messages yet.</p>
                      )}
                      {messages.map((m) => (
                        <div key={m.id} className={`flex ${m.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.userId === user?.id ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white'}`}>
                            {m.userId !== user?.id && <p className="text-xs font-semibold mb-1 text-indigo-300">{m.userName}</p>}
                            <p className="text-sm">{m.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="sticky bottom-0 p-4 bg-gray-900 border-t border-white/5 flex gap-2">
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Message…"
                        className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button onClick={sendMessage} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">Send</button>
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
        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        : active
        ? 'bg-white/10 text-white hover:bg-white/20'
        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
    } ${className}`}
  >
    {icon}
    <span className="text-[10px] font-semibold">{label}</span>
  </button>
);
