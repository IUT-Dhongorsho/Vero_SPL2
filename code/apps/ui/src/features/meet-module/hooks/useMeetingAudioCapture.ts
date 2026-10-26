import { useEffect, useRef } from 'react';
import { useMeetStore } from '../../../stores/meet.store';
import { useAuthStore } from '../../../stores/auth.store';

/**
 * Handles browser audio mixing and 6-second chunked streaming for the active
 * transcription capturer in the meeting.
 */
export function useMeetingAudioCapture(roomId: string | undefined) {
  const isCapturer = useMeetStore((s) => s.isCapturer);
  const isTranscribing = useMeetStore((s) => s.isTranscribing);
  const socket = useMeetStore((s) => s.socket);
  const localAudioTrack = useMeetStore((s) => s.localAudioTrack);
  const isMuted = useMeetStore((s) => s.isMuted);
  const participants = useMeetStore((s) => s.participants);
  const user = useAuthStore((s) => s.user);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourceNodesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());

  useEffect(() => {
    if (!isCapturer || !isTranscribing || !socket || !roomId) {
      // Clean up if transcription was turned off or user is no longer capturer
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      mediaRecorderRef.current = null;

      sourceNodesRef.current.forEach((node) => {
        try {
          node.disconnect();
        } catch (_) {}
      });
      sourceNodesRef.current.clear();

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
      audioContextRef.current = null;
      destinationRef.current = null;
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[AudioCapture] Web Audio API not supported in this browser');
        return;
      }

      const audioCtx = new AudioCtx();
      const destination = audioCtx.createMediaStreamDestination();
      audioContextRef.current = audioCtx;
      destinationRef.current = destination;

      // 1. Connect local mic track if unmuted
      if (localAudioTrack && !isMuted && localAudioTrack.readyState === 'live') {
        const localSource = audioCtx.createMediaStreamSource(new MediaStream([localAudioTrack]));
        localSource.connect(destination);
        sourceNodesRef.current.set('local', localSource);
      }

      // 2. Connect incoming audio tracks from all remote participants
      Object.values(participants).forEach((p) => {
        if (p.audioTrack && p.audioTrack.readyState === 'live' && !p.isMuted) {
          try {
            const remoteSource = audioCtx.createMediaStreamSource(new MediaStream([p.audioTrack]));
            remoteSource.connect(destination);
            sourceNodesRef.current.set(p.id, remoteSource);
          } catch (err) {
            console.warn(`[AudioCapture] Could not connect audio track for ${p.id}:`, err);
          }
        }
      });

      // 3. Initialize MediaRecorder with mixed audio
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      recorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 500) {
          try {
            const arrayBuffer = await e.data.arrayBuffer();
            const currentSocket = useMeetStore.getState().socket;
            if (currentSocket && currentSocket.connected) {
              currentSocket.emit('transcription-audio-chunk', {
                roomId,
                chunk: arrayBuffer,
                speakerName: user?.name || 'Attendee',
                timestamp: new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
              });
            }
          } catch (chunkErr) {
            console.warn('[AudioCapture] Failed to send audio chunk:', chunkErr);
          }
        }
      };

      // Slice audio into 6000ms buffers for transcription
      recorder.start(6000);
      mediaRecorderRef.current = recorder;
      console.log('🎙️ [AudioCapture] Recording mixed meeting audio stream for Whisper...');
    } catch (setupErr) {
      console.error('[AudioCapture] Failed to setup audio recorder:', setupErr);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      mediaRecorderRef.current = null;

      sourceNodesRef.current.forEach((node) => {
        try {
          node.disconnect();
        } catch (_) {}
      });
      sourceNodesRef.current.clear();

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
      audioContextRef.current = null;
      destinationRef.current = null;
    };
  }, [isCapturer, isTranscribing, socket, roomId, localAudioTrack, isMuted, participants, user?.name]);
}
