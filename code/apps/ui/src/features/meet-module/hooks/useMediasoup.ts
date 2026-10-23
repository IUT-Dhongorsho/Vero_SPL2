import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import type { types } from 'mediasoup-client';
import { useSFUStore } from '../store/useSFUStore';

export function useMediasoup(socketRef: React.MutableRefObject<Socket | null>, moduleId: string) {
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<types.Transport | null>(null);
  const recvTransportRef = useRef<types.Transport | null>(null);
  const producersRef = useRef<Map<string, types.Producer>>(new Map());
  const consumersRef = useRef<Map<string, types.Consumer>>(new Map());

  const {
    localStream,
    setConnectionState,
    addPeerTrack,
    removePeerTrack,
  } = useSFUStore();

  const consumeQueueRef = useRef<any[]>([]);
  const isTransportReadyRef = useRef(false);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !moduleId || !localStream) return;

    let cancelled = false;
    setConnectionState('connecting');

    // ---------------------------------------------------------
    // 1. Setup listeners for server-pushed events
    // ---------------------------------------------------------
    const processConsumeQueue = async () => {
      const queue = consumeQueueRef.current;
      consumeQueueRef.current = [];
      for (const item of queue) {
        await handleConsume(item);
      }
    };

    const handleConsume = async ({ consumerId, producerId, kind, rtpParameters, peerId, userId }: any) => {
      if (cancelled || !recvTransportRef.current) return;
      
      try {
        const consumer = await recvTransportRef.current.consume({
          id: consumerId,
          producerId,
          kind,
          rtpParameters,
        });

        consumersRef.current.set(consumerId, consumer);
        const participantKey = peerId || userId;
        addPeerTrack(participantKey, consumer.track);

        // Tell server to start sending media
        socket.emit('resume-consumer', { roomId: moduleId, consumerId });
      } catch (err) {
        console.error('[Mediasoup] Error consuming track:', err);
      }
    };

    const onConsume = async (data: any) => {
      if (!isTransportReadyRef.current) {
        consumeQueueRef.current.push(data);
      } else {
        await handleConsume(data);
      }
    };

    const onConsumerClosed = ({ consumerId }: { consumerId: string }) => {
      const consumer = consumersRef.current.get(consumerId);
      if (consumer) {
        consumer.close();
        consumersRef.current.delete(consumerId);
        // Track removal happens in store via peer-left or trackended,
        // but it's safe to also remove it here if we had a reference to the userId
      }
    };

    socket.on('consume', onConsume);
    socket.on('consumer-closed', onConsumerClosed);

    // ---------------------------------------------------------
    // 2. Main Join Sequence
    // ---------------------------------------------------------
    async function joinRoom() {
      if (!socket) return;
      
      // Step A: Join signaling room
      socket.emit('join-room', { roomId: moduleId });
      await new Promise<void>(resolve => {
        socket.once('room-joined', () => resolve());
      });

      // Step B: Get Router Capabilities
      socket.emit('get-rtp-capabilities', { roomId: moduleId });
      const { rtpCapabilities } = await new Promise<any>(resolve => {
        socket.once('rtp-capabilities', resolve);
      });

      // Step C: Load Device
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      
      // Send our capabilities back
      socket.emit('set-rtp-capabilities', { 
        roomId: moduleId, 
        rtpCapabilities: device.rtpCapabilities 
      });

      // Step D: Create Transports (Parallel)
      socket.emit('create-send-transport', { roomId: moduleId });
      socket.emit('create-recv-transport', { roomId: moduleId });

      const [sendOpts, recvOpts] = await Promise.all([
        new Promise<any>(r => socket.once('send-transport-created', r)),
        new Promise<any>(r => socket.once('recv-transport-created', r)),
      ]);

      if (cancelled) return;

      // -- Setup Send Transport --
      const sendTransport = device.createSendTransport(sendOpts);
      sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', { roomId: moduleId, transportId: sendTransport.id, dtlsParameters });
        callback();
      });
      sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        socket.emit('produce', { roomId: moduleId, kind, rtpParameters, appData });
        socket.once('produced', ({ producerId }) => callback({ id: producerId }));
      });
      sendTransportRef.current = sendTransport;

      // -- Setup Recv Transport --
      const recvTransport = device.createRecvTransport(recvOpts);
      recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', { roomId: moduleId, transportId: recvTransport.id, dtlsParameters });
        callback();
      });
      recvTransportRef.current = recvTransport;
      isTransportReadyRef.current = true;
      processConsumeQueue();

      // Step E: Publish Local Media
      for (const track of (localStream?.getTracks() || [])) {
        const producer = await sendTransport.produce({ 
          track,
          encodings: track.kind === 'video' 
            ? [{ maxBitrate: 100_000 }, { maxBitrate: 300_000 }, { maxBitrate: 900_000 }]
            : undefined,
        });
        producersRef.current.set(track.kind, producer);
      }

      setConnectionState('connected');
    }

    joinRoom().catch(err => {
      console.error('[Mediasoup] Join failed:', err);
      setConnectionState('error');
    });

    return () => {
      cancelled = true;
      socket.off('consume', onConsume);
      socket.off('consumer-closed', onConsumerClosed);
      
      producersRef.current.forEach(p => p.close());
      producersRef.current.clear();
      consumersRef.current.forEach(c => c.close());
      consumersRef.current.clear();
      sendTransportRef.current?.close();
      sendTransportRef.current = null;
      recvTransportRef.current?.close();
      recvTransportRef.current = null;
    };
  }, [socketRef, moduleId, addPeerTrack, removePeerTrack, setConnectionState]);

  // Synchronize local media tracks with Mediasoup producers when tracks are toggled
  useEffect(() => {
    const sendTransport = sendTransportRef.current;
    if (!sendTransport || !localStream) return;

    const currentTracks = localStream.getTracks();
    const activeKinds = new Set(currentTracks.map((t) => t.kind));

    // Close producers for stopped/removed tracks
    for (const [kind, producer] of Array.from(producersRef.current.entries())) {
      if (!activeKinds.has(kind)) {
        producer.close();
        producersRef.current.delete(kind);
      }
    }

    // Produce new tracks
    for (const track of currentTracks) {
      if (!producersRef.current.has(track.kind)) {
        sendTransport
          .produce({
            track,
            encodings:
              track.kind === 'video'
                ? [{ maxBitrate: 100_000 }, { maxBitrate: 300_000 }, { maxBitrate: 900_000 }]
                : undefined,
          })
          .then((producer) => {
            producersRef.current.set(track.kind, producer);
          })
          .catch((err) => {
            console.error(`[Mediasoup] Error producing ${track.kind} track:`, err);
          });
      }
    }
  }, [localStream]);
}
