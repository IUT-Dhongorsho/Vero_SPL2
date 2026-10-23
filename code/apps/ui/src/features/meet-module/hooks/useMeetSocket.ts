import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSFUStore } from '../store/useSFUStore';

// In dev and tunneled setups, connect through the Vite proxy relative path
const MEET_SERVICE_URL = import.meta.env.VITE_MEET_SERVICE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8007');

export function useMeetSocket(authToken: string, moduleId: string) {
  const socketRef = useRef<Socket | null>(null);
  const setErrorMessage = useSFUStore((s) => s.setErrorMessage);
  const removePeer = useSFUStore((s) => s.removePeer);

  useEffect(() => {
    if (!authToken || !moduleId) return;

    const socket = io(MEET_SERVICE_URL, {
      path: '/api/meet/socket.io/',
      auth: { token: authToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[MeetSocket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[MeetSocket] Connection error:', err.message);
      setErrorMessage(`Connection failed: ${err.message}`);
    });

    socket.on('sfu-error', ({ message, code }) => {
      console.error(`[MeetSocket] SFU Error (${code}):`, message);
      setErrorMessage(message);
    });

    socket.on('disconnected-duplicate', ({ message }: any) => {
      console.warn('[MeetSocket] Disconnected because connected from another device');
      setErrorMessage(message || 'You were disconnected because this account joined from another device or window.');
      useSFUStore.getState().clearState();
    });

    socket.on('peer-left', ({ userId }) => {
      console.log('[MeetSocket] Peer left:', userId);
      removePeer(userId);
    });

    // We don't dispatch peer-joined here because the mediasoup logic
    // handles track additions via `consume` events. 
    // However, we could listen to it if we want to show blank tiles early.
    socket.on('peer-joined', ({ userId }) => {
      console.log('[MeetSocket] Peer joined:', userId);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId: moduleId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [authToken, moduleId, setErrorMessage, removePeer]);

  return socketRef;
}
