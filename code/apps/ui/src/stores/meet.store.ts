import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { useAuthStore } from './auth.store';
import { toast } from '../components/Providers/ToastProvider';

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
}

interface MeetState {
  socket: Socket | null;
  device: mediasoupClient.Device | null;
  sendTransport: mediasoupClient.types.Transport | null;
  recvTransport: mediasoupClient.types.Transport | null;

  participants: Record<string, Participant>;
  localVideoTrack: MediaStreamTrack | null;
  localAudioTrack: MediaStreamTrack | null;
  localScreenTrack: MediaStreamTrack | null;

  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;

  // Internal queue for consume events arriving before recv transport is ready
  _consumeQueue: any[];
  _isRecvTransportReady: boolean;
  // Map of consumerId -> userId for cleanup
  _consumerMap: Map<string, { userId: string; kind: string }>;

  connect: (roomId: string) => Promise<void>;
  disconnect: () => void;
  setLocalTracks: (video: MediaStreamTrack | null, audio: MediaStreamTrack | null) => void;

  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;

  todayMeetings: any[];
  fetchTodayMeetings: () => Promise<void>;
}

export const useMeetStore = create<MeetState>((set, get) => ({
  socket: null,
  device: null,
  sendTransport: null,
  recvTransport: null,

  participants: {},
  localVideoTrack: null,
  localAudioTrack: null,
  localScreenTrack: null,

  isMuted: true,
  isVideoOff: true,
  isScreenSharing: false,

  _consumeQueue: [],
  _isRecvTransportReady: false,
  _consumerMap: new Map(),

  todayMeetings: [],
  fetchTodayMeetings: async () => {
    set({
      todayMeetings: [
        { id: '1', title: 'Daily Standup', time: '10:00 AM', attendees: 4 },
        { id: '2', title: 'Product Review', time: '2:00 PM', attendees: 6 },
      ],
    });
  },

  setLocalTracks: (video, audio) => {
    set({ localVideoTrack: video, localAudioTrack: audio });
  },

  connect: async (roomId: string) => {
    const authState = useAuthStore.getState();
    const token = authState.token || localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required to join meeting');
      return;
    }

    // Clean up any old socket first
    const { socket: oldSocket } = get();
    if (oldSocket) oldSocket.disconnect();

    const socket = io(window.location.origin, {
      path: '/api/meet/socket.io/',
      auth: { token },
      transports: ['websocket'],
    });

    set({
      socket,
      _consumeQueue: [],
      _isRecvTransportReady: false,
      _consumerMap: new Map(),
      participants: {},
    });

    // ─── Internal helpers ──────────────────────────────────────────
    const processQueue = async () => {
      const queue = get()._consumeQueue;
      if (queue.length === 0) return;
      set({ _consumeQueue: [] });
      for (const item of queue) {
        await handleConsume(item);
      }
    };

    const handleConsume = async ({
      consumerId,
      producerId,
      kind,
      rtpParameters,
      userId,
      userName,
    }: any) => {
      const { device, recvTransport, _consumerMap } = get();
      if (!device || !recvTransport) return;

      try {
        const consumer = await recvTransport.consume({
          id: consumerId,
          producerId,
          kind,
          rtpParameters,
        });

        // Track consumerId → userId mapping for cleanup
        const newMap = new Map(_consumerMap);
        newMap.set(consumerId, { userId, kind });

        set((state) => {
          const existing = state.participants[userId] || {
            id: userId,
            name: userName || `User ${userId.substring(0, 4)}`,
            avatar: (userName || 'U').charAt(0).toUpperCase(),
            isMuted: true,
            isVideoOff: true,
            isSpeaking: false,
          };

          const updated = { ...existing };
          if (kind === 'audio') {
            updated.audioTrack = consumer.track;
            updated.isMuted = false;
          } else if (kind === 'video') {
            updated.videoTrack = consumer.track;
            updated.isVideoOff = false;
          }

          return {
            participants: { ...state.participants, [userId]: updated },
            _consumerMap: newMap,
          };
        });

        socket.emit('resume-consumer', { roomId, consumerId });
      } catch (error) {
        console.error('[MeetStore] Failed to consume track:', error);
      }
    };

    // ─── Socket events ─────────────────────────────────────────────
    socket.on('connect', () => {
      console.log('✅ [MeetStore] Connected — joining room', roomId);
      socket.emit('join-room', { roomId });
    });

    socket.on('connect_error', (err) => {
      console.error('[MeetStore] Socket connection error:', err.message);
      toast.error('Could not connect to meeting server');
    });

    socket.on('sfu-error', (error) => {
      console.error('[MeetStore] SFU Error:', error);
      toast.error(`Meeting Error: ${error.message}`);
    });

    socket.on('peer-joined', ({ userId, userName }: any) => {
      set((state) => ({
        participants: {
          ...state.participants,
          [userId]: state.participants[userId] || {
            id: userId,
            name: userName || `User ${userId.substring(0, 4)}`,
            avatar: (userName || 'U').charAt(0).toUpperCase(),
            isMuted: true,
            isVideoOff: true,
            isSpeaking: false,
          },
        },
      }));
    });

    socket.on('peer-left', ({ userId }: any) => {
      set((state) => {
        const next = { ...state.participants };
        delete next[userId];
        return { participants: next };
      });
    });

    socket.on('room-joined', async ({ existingPeers }: any) => {
      // Immediately populate participant list with known peers (even if media-less)
      if (existingPeers?.length > 0) {
        set((state) => {
          const next = { ...state.participants };
          existingPeers.forEach((p: any) => {
            next[p.userId] = next[p.userId] || {
              id: p.userId,
              name: p.userName || `User ${p.userId.substring(0, 4)}`,
              avatar: (p.userName || 'U').charAt(0).toUpperCase(),
              isMuted: true,
              isVideoOff: true,
              isSpeaking: false,
            };
          });
          return { participants: next };
        });
      }

      socket.emit('get-rtp-capabilities', { roomId });
    });

    socket.on('rtp-capabilities', async ({ rtpCapabilities }: any) => {
      try {
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        set({ device });

        socket.emit('set-rtp-capabilities', { roomId, rtpCapabilities: device.rtpCapabilities });
        socket.emit('create-send-transport', { roomId });
        socket.emit('create-recv-transport', { roomId });
      } catch (error) {
        console.error('[MeetStore] Failed to load device:', error);
        toast.error('Failed to initialize WebRTC device');
      }
    });

    socket.on('send-transport-created', async (params: any) => {
      const device = get().device;
      if (!device) return;

      const transport = device.createSendTransport(params);

      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit('connect-transport', { roomId, transportId: transport.id, dtlsParameters });
          callback();
        } catch (e: any) {
          errback(e);
        }
      });

      transport.on('produce', async (parameters, callback, errback) => {
        try {
          socket.emit('produce', {
            roomId,
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
          });
          const onProduced = ({ producerId }: any) => {
            socket.off('produced', onProduced);
            callback({ id: producerId });
          };
          socket.on('produced', onProduced);
        } catch (e: any) {
          errback(e);
        }
      });

      set({ sendTransport: transport });

      // Produce existing local tracks (if user already enabled mic/cam before connect)
      const { localVideoTrack, localAudioTrack } = get();
      if (localVideoTrack) {
        try { await transport.produce({ track: localVideoTrack }); } catch (_) {}
      }
      if (localAudioTrack) {
        try { await transport.produce({ track: localAudioTrack }); } catch (_) {}
      }
    });

    socket.on('recv-transport-created', async (params: any) => {
      const device = get().device;
      if (!device) return;

      const transport = device.createRecvTransport(params);

      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit('connect-transport', { roomId, transportId: transport.id, dtlsParameters });
          callback();
        } catch (e: any) {
          errback(e);
        }
      });

      set({ recvTransport: transport, _isRecvTransportReady: true });

      // Drain queue now that transport is ready
      await processQueue();
    });

    socket.on('consume', async (data: any) => {
      const { _isRecvTransportReady } = get();
      if (!_isRecvTransportReady) {
        set((state: any) => ({ _consumeQueue: [...state._consumeQueue, data] }));
      } else {
        await handleConsume(data);
      }
    });

    socket.on('consumer-closed', ({ consumerId }: any) => {
      const { _consumerMap } = get();
      const entry = _consumerMap.get(consumerId);
      if (!entry) return;

      const newMap = new Map(_consumerMap);
      newMap.delete(consumerId);

      set((state) => {
        const participant = state.participants[entry.userId];
        if (!participant) return { _consumerMap: newMap };

        const updated = { ...participant };
        if (entry.kind === 'audio') { updated.audioTrack = undefined; updated.isMuted = true; }
        if (entry.kind === 'video') { updated.videoTrack = undefined; updated.isVideoOff = true; }

        return {
          _consumerMap: newMap,
          participants: { ...state.participants, [entry.userId]: updated },
        };
      });
    });
  },

  disconnect: () => {
    const { socket, localVideoTrack, localAudioTrack, localScreenTrack } = get();
    localVideoTrack?.stop();
    localAudioTrack?.stop();
    localScreenTrack?.stop();
    socket?.disconnect();

    set({
      socket: null,
      device: null,
      sendTransport: null,
      recvTransport: null,
      participants: {},
      localVideoTrack: null,
      localAudioTrack: null,
      localScreenTrack: null,
      isMuted: true,
      isVideoOff: true,
      isScreenSharing: false,
      _consumeQueue: [],
      _isRecvTransportReady: false,
      _consumerMap: new Map(),
    } as any);
  },

  toggleVideo: async () => {
    const { sendTransport, localVideoTrack, isVideoOff } = get();

    if (!isVideoOff && localVideoTrack) {
      localVideoTrack.stop();
      set({ localVideoTrack: null, isVideoOff: true });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        set({ localVideoTrack: track, isVideoOff: false });
        if (sendTransport) {
          await sendTransport.produce({ track });
        }
      } catch {
        toast.error('Could not access camera');
      }
    }
  },

  toggleMute: async () => {
    const { sendTransport, localAudioTrack, isMuted } = get();

    if (!isMuted && localAudioTrack) {
      localAudioTrack.stop();
      set({ localAudioTrack: null, isMuted: true });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        set({ localAudioTrack: track, isMuted: false });
        if (sendTransport) {
          await sendTransport.produce({ track });
        }
      } catch {
        toast.error('Could not access microphone');
      }
    }
  },

  toggleScreenShare: async () => {
    const { sendTransport, localScreenTrack, isScreenSharing } = get();

    if (isScreenSharing && localScreenTrack) {
      localScreenTrack.stop();
      set({ localScreenTrack: null, isScreenSharing: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        track.onended = () => set({ localScreenTrack: null, isScreenSharing: false });
        set({ localScreenTrack: track, isScreenSharing: true });
        if (sendTransport) {
          await sendTransport.produce({ track, appData: { type: 'screen' } });
        }
      } catch {
        toast.error('Could not access screen share');
      }
    }
  },
}));
