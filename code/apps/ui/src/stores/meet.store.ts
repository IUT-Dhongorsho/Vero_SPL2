import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { useAuthStore } from './auth.store';
import { toast } from '../components/Providers/ToastProvider';

export interface Participant {
  id: string;
  peerId?: string;
  userId?: string;
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
  videoProducer: mediasoupClient.types.Producer | null;
  audioProducer: mediasoupClient.types.Producer | null;
  screenProducer: mediasoupClient.types.Producer | null;

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
  // Map of consumerId -> { participantKey, kind } for cleanup
  _consumerMap: Map<string, { participantKey: string; kind: string }>;

  connect: (roomId: string) => Promise<void>;
  disconnect: () => void;
  setLocalTracks: (video: MediaStreamTrack | null, audio: MediaStreamTrack | null) => void;

  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;

  todayMeetings: any[];
  fetchTodayMeetings: () => Promise<void>;

  onDisconnected?: ((reason?: string) => void) | null;
  setOnDisconnected: (cb: ((reason?: string) => void) | null) => void;
}

export const useMeetStore = create<MeetState>((set, get) => ({
  socket: null,
  device: null,
  sendTransport: null,
  recvTransport: null,
  videoProducer: null,
  audioProducer: null,
  screenProducer: null,

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
  onDisconnected: null,
  setOnDisconnected: (cb) => set({ onDisconnected: cb }),
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
      peerId,
      userId,
      userName,
    }: any) => {
      const { device, recvTransport } = get();
      if (!device || !recvTransport) return;

      const participantKey = peerId || userId;

      try {
        const consumer = await recvTransport.consume({
          id: consumerId,
          producerId,
          kind,
          rtpParameters,
        });

        set((state) => {
          // Track consumerId → participantKey mapping for cleanup
          const newMap = new Map(state._consumerMap);
          newMap.set(consumerId, { participantKey, kind });

          const existing = state.participants[participantKey] || {
            id: participantKey,
            peerId: participantKey,
            userId,
            name: userName || `User ${userId?.substring(0, 4) || 'Peer'}`,
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
            participants: { ...state.participants, [participantKey]: updated },
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

    socket.on('disconnected-duplicate', ({ message }: any) => {
      console.warn('⚠️ [MeetStore] Disconnected: joined from another device');
      toast.error(message || 'You were disconnected because this account joined from another device or window.');
      get().disconnect();
      get().onDisconnected?.('duplicate');
    });

    socket.on('peer-joined', ({ peerId, userId, userName }: any) => {
      const participantKey = peerId || userId;
      set((state) => ({
        participants: {
          ...state.participants,
          [participantKey]: state.participants[participantKey] || {
            id: participantKey,
            peerId: participantKey,
            userId,
            name: userName || `User ${userId?.substring(0, 4) || 'Peer'}`,
            avatar: (userName || 'U').charAt(0).toUpperCase(),
            isMuted: true,
            isVideoOff: true,
            isSpeaking: false,
          },
        },
      }));
    });

    socket.on('peer-left', ({ peerId, userId }: any) => {
      set((state) => {
        const next = { ...state.participants };
        if (peerId && next[peerId]) {
          delete next[peerId];
        } else if (userId && next[userId]) {
          delete next[userId];
        }
        return { participants: next };
      });
    });

    socket.on('room-joined', async ({ existingPeers }: any) => {
      // Immediately populate participant list with known peers (even if media-less)
      if (existingPeers?.length > 0) {
        set((state) => {
          const next = { ...state.participants };
          existingPeers.forEach((p: any) => {
            const participantKey = p.peerId || p.userId;
            next[participantKey] = next[participantKey] || {
              id: participantKey,
              peerId: participantKey,
              userId: p.userId,
              name: p.userName || `User ${p.userId?.substring(0, 4) || 'Peer'}`,
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
          socket.emit(
            'connect-transport',
            { roomId, transportId: transport.id, dtlsParameters },
            () => {
              callback();
            }
          );
        } catch (e: any) {
          errback(e);
        }
      });

      transport.on('produce', async (parameters, callback, errback) => {
        try {
          socket.emit(
            'produce',
            {
              roomId,
              kind: parameters.kind,
              rtpParameters: parameters.rtpParameters,
              appData: parameters.appData,
            },
            (response: any) => {
              if (response?.id) {
                callback({ id: response.id });
              } else if (response?.error) {
                errback(new Error(response.error));
              }
            }
          );
        } catch (e: any) {
          errback(e);
        }
      });

      set({ sendTransport: transport });

      // Produce existing local tracks (if user already enabled mic/cam before connect)
      const { localVideoTrack, localAudioTrack } = get();
      if (localVideoTrack) {
        try {
          const vp = await transport.produce({
            track: localVideoTrack,
            encodings: [
              { maxBitrate: 800_000, scaleResolutionDownBy: 1 },
            ],
            codecOptions: {
              videoGoogleStartBitrate: 500,
            },
          });
          set({ videoProducer: vp });
        } catch (_) {}
      }
      if (localAudioTrack) {
        try {
          const ap = await transport.produce({ track: localAudioTrack });
          set({ audioProducer: ap });
        } catch (_) {}
      }
    });

    socket.on('recv-transport-created', async (params: any) => {
      const device = get().device;
      if (!device) return;

      const transport = device.createRecvTransport(params);

      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit(
            'connect-transport',
            { roomId, transportId: transport.id, dtlsParameters },
            () => {
              callback();
            }
          );
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
        const participant = state.participants[entry.participantKey];
        if (!participant) return { _consumerMap: newMap };

        const updated = { ...participant };
        if (entry.kind === 'audio') { updated.audioTrack = undefined; updated.isMuted = true; }
        if (entry.kind === 'video') { updated.videoTrack = undefined; updated.isVideoOff = true; }

        return {
          _consumerMap: newMap,
          participants: { ...state.participants, [entry.participantKey]: updated },
        };
      });
    });
  },

  disconnect: () => {
    const { socket, localVideoTrack, localAudioTrack, localScreenTrack, videoProducer, audioProducer, screenProducer } = get();
    localVideoTrack?.stop();
    localAudioTrack?.stop();
    localScreenTrack?.stop();
    try { videoProducer?.close(); } catch (_) {}
    try { audioProducer?.close(); } catch (_) {}
    try { screenProducer?.close(); } catch (_) {}
    socket?.disconnect();

    set({
      socket: null,
      device: null,
      sendTransport: null,
      recvTransport: null,
      videoProducer: null,
      audioProducer: null,
      screenProducer: null,
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
    const { sendTransport, localVideoTrack, isVideoOff, videoProducer } = get();

    if (!isVideoOff && localVideoTrack) {
      // Turn camera OFF: stop media track so hardware detaches, close producer
      localVideoTrack.stop();
      if (videoProducer) {
        try { videoProducer.close(); } catch (_) {}
      }
      set({ localVideoTrack: null, videoProducer: null, isVideoOff: true });
    } else {
      // Turn camera ON: request camera device from navigator.mediaDevices with mobile-friendly constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user',
          },
        });
        const track = stream.getVideoTracks()[0];
        track.onended = () => {
          get().toggleVideo();
        };

        let newProducer: mediasoupClient.types.Producer | null = null;
        if (sendTransport) {
          try {
            newProducer = await sendTransport.produce({
              track,
              encodings: [
                { maxBitrate: 800_000, scaleResolutionDownBy: 1 },
              ],
              codecOptions: {
                videoGoogleStartBitrate: 500,
              },
            });
          } catch (e) {
            console.error('[MeetStore] Failed to produce video track:', e);
          }
        }
        set({ localVideoTrack: track, videoProducer: newProducer, isVideoOff: false });
      } catch {
        toast.error('Could not access camera');
      }
    }
  },

  toggleMute: async () => {
    const { sendTransport, localAudioTrack, isMuted, audioProducer } = get();

    if (!isMuted && localAudioTrack) {
      // Turn mic OFF: stop media track so microphone hardware detaches, close producer
      localAudioTrack.stop();
      if (audioProducer) {
        try { audioProducer.close(); } catch (_) {}
      }
      set({ localAudioTrack: null, audioProducer: null, isMuted: true });
    } else {
      // Turn mic ON: request microphone from navigator.mediaDevices
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        track.onended = () => {
          get().toggleMute();
        };

        let newProducer: mediasoupClient.types.Producer | null = null;
        if (sendTransport) {
          try {
            newProducer = await sendTransport.produce({ track });
          } catch (e) {
            console.error('[MeetStore] Failed to produce audio track:', e);
          }
        }
        set({ localAudioTrack: track, audioProducer: newProducer, isMuted: false });
      } catch {
        toast.error('Could not access microphone');
      }
    }
  },

  toggleScreenShare: async () => {
    const { sendTransport, localScreenTrack, isScreenSharing, screenProducer } = get();

    if (isScreenSharing && localScreenTrack) {
      localScreenTrack.stop();
      if (screenProducer) {
        try { screenProducer.close(); } catch (_) {}
      }
      set({ localScreenTrack: null, screenProducer: null, isScreenSharing: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        track.onended = () => set({ localScreenTrack: null, screenProducer: null, isScreenSharing: false });

        let newProducer: mediasoupClient.types.Producer | null = null;
        if (sendTransport) {
          try {
            newProducer = await sendTransport.produce({ track, appData: { type: 'screen' } });
          } catch (e) {
            console.error('[MeetStore] Failed to produce screen track:', e);
          }
        }
        set({ localScreenTrack: track, screenProducer: newProducer, isScreenSharing: true });
      } catch {
        toast.error('Could not access screen share');
      }
    }
  },
}));
