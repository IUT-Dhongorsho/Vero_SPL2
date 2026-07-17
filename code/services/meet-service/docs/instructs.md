# Meet-Service Frontend Implementation Guide

> **Target audience:** An AI agent or developer implementing the frontend WebRTC client.  
> **Stack assumed:** React + TypeScript + `mediasoup-client` + `socket.io-client`  
> **Backend:** meet-service Socket.io server on port 8007

---

## 1. Dependencies

```bash
pnpm add mediasoup-client socket.io-client
pnpm add -D @types/mediasoup-client
```

**Exact package:** `mediasoup-client` v3.x (must match server's `mediasoup` v3.x).

---

## 2. Complete Event Reference

### 2.1 Events the client EMITS (client → server)

| Event | Payload | When to emit |
|-------|---------|-------------|
| `join-room` | `{ roomId: string }` | On entering the meeting page. `roomId = moduleId` |
| `get-rtp-capabilities` | `{ roomId: string }` | After `room-joined` is received |
| `set-rtp-capabilities` | `{ roomId: string, rtpCapabilities: RtpCapabilities }` | After `device.load()` succeeds |
| `create-send-transport` | `{ roomId: string }` | After `set-rtp-capabilities` |
| `create-recv-transport` | `{ roomId: string }` | After `set-rtp-capabilities` (can be parallel with create-send-transport) |
| `connect-transport` | `{ roomId: string, transportId: string, dtlsParameters: DtlsParameters }` | Automatically — from transport `connect` event handler |
| `produce` | `{ roomId: string, kind: 'audio'\|'video', rtpParameters: RtpParameters, appData?: object }` | After send transport is connected and you have local media stream |
| `resume-consumer` | `{ roomId: string, consumerId: string }` | After calling `recvTransport.consume()` locally |
| `leave-room` | `{ roomId: string }` | On leaving the meeting page |

### 2.2 Events the client LISTENS TO (server → client)

| Event | Payload | Action required |
|-------|---------|----------------|
| `room-joined` | `{ existingProducers: Array<{ userId, producerId, kind }> }` | Store `existingProducers` for later consumption |
| `rtp-capabilities` | `{ rtpCapabilities: RtpCapabilities }` | Call `device.load({ routerRtpCapabilities })` |
| `send-transport-created` | `{ id, iceParameters, iceCandidates, dtlsParameters, iceServers }` | Call `device.createSendTransport(...)` |
| `recv-transport-created` | `{ id, iceParameters, iceCandidates, dtlsParameters, iceServers }` | Call `device.createRecvTransport(...)` |
| `produced` | `{ producerId: string }` | Store `producerId` for this track |
| `consume` | `{ consumerId, producerId, kind, rtpParameters, userId }` | Call `recvTransport.consume(...)`, then emit `resume-consumer` |
| `consumer-closed` | `{ consumerId: string }` | Remove the track from that peer's UI |
| `new-producer` | `{ userId, producerId, kind }` | **UI only** — update participant panel. Server already pushed `consume` event. |
| `peer-joined` | `{ userId: string }` | Add peer to participant list |
| `peer-left` | `{ userId: string, producerIds: string[] }` | Remove peer + their tracks from UI |
| `sfu-error` | `{ message: string, code: string }` | Show error toast / handle gracefully |
| `producer-score` | `{ producerId, score }` | Optional — display connection quality indicator |

---

## 3. TypeScript Types

```typescript
import type { Device, RtpCapabilities, DtlsParameters, RtpParameters, MediaKind } from 'mediasoup-client/lib/types';
import type { Transport, Producer, Consumer } from 'mediasoup-client/lib/types';

// Payload types (matching server)
interface ExistingProducer {
  userId: string;
  producerId: string;
  kind: MediaKind;
}

interface TransportOptions {
  id: string;
  iceParameters: object;
  iceCandidates: object[];
  dtlsParameters: DtlsParameters;
  iceServers: RTCIceServer[];
}

interface ConsumePayload {
  consumerId: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  userId: string;
}
```

---

## 4. Complete Implementation (Step-by-Step)

### Step 0 — Socket connection

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://meet-server:8007', {
  auth: { token: authToken }, // Bearer token from your auth system
  transports: ['websocket'],
});
```

### Step 1 — Join the room

```typescript
socket.emit('join-room', { roomId: moduleId });

socket.once('room-joined', ({ existingProducers }) => {
  // Store for use after recv transport is ready
  window._existingProducers = existingProducers;
  
  // Immediately request router capabilities
  socket.emit('get-rtp-capabilities', { roomId: moduleId });
});
```

### Step 2 — Load the mediasoup Device

```typescript
import { Device } from 'mediasoup-client';
const device = new Device();

socket.once('rtp-capabilities', async ({ rtpCapabilities }) => {
  // Load the device with the router's capabilities
  await device.load({ routerRtpCapabilities: rtpCapabilities });
  
  // Send our device capabilities to the server
  socket.emit('set-rtp-capabilities', {
    roomId: moduleId,
    rtpCapabilities: device.rtpCapabilities,
  });
  
  // Proceed to create transports
  await createTransports(device, socket, moduleId);
});
```

### Step 3 — Create send and recv transports

```typescript
let sendTransport: Transport;
let recvTransport: Transport;

async function createTransports(device: Device, socket: Socket, roomId: string) {
  // Request both transports (can be parallel)
  socket.emit('create-send-transport', { roomId });
  socket.emit('create-recv-transport', { roomId });

  await Promise.all([
    setupSendTransport(device, socket, roomId),
    setupRecvTransport(device, socket, roomId),
  ]);
}

async function setupSendTransport(device: Device, socket: Socket, roomId: string) {
  return new Promise<void>((resolve) => {
    socket.once('send-transport-created', async (options: TransportOptions) => {
      sendTransport = device.createSendTransport({
        id: options.id,
        iceParameters: options.iceParameters,
        iceCandidates: options.iceCandidates,
        dtlsParameters: options.dtlsParameters,
        iceServers: options.iceServers,
      });

      // CRITICAL: This event fires when the first produce() is called.
      // You MUST call socket.emit('connect-transport') here.
      sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', {
          roomId,
          transportId: sendTransport.id,
          dtlsParameters,
        });
        // The callback must be called when the server confirms the connection.
        // Use a one-time ack or just call callback immediately — mediasoup
        // handles the DTLS handshake asynchronously.
        callback();
      });

      // This fires when transport.produce() is called.
      sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        socket.emit('produce', { roomId, kind, rtpParameters, appData });
        socket.once('produced', ({ producerId }) => {
          callback({ id: producerId }); // resolve the produce() promise
        });
      });

      resolve();
    });
  });
}

async function setupRecvTransport(device: Device, socket: Socket, roomId: string) {
  return new Promise<void>((resolve) => {
    socket.once('recv-transport-created', async (options: TransportOptions) => {
      recvTransport = device.createRecvTransport({
        id: options.id,
        iceParameters: options.iceParameters,
        iceCandidates: options.iceCandidates,
        dtlsParameters: options.dtlsParameters,
        iceServers: options.iceServers,
      });

      // CRITICAL: This fires on the first consume() call.
      recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', {
          roomId,
          transportId: recvTransport.id,
          dtlsParameters,
        });
        callback();
      });

      resolve();
    });
  });
}
```

### Step 4 — Publish local audio/video

```typescript
async function publishLocalStream(stream: MediaStream, roomId: string) {
  for (const track of stream.getTracks()) {
    const producer: Producer = await sendTransport.produce({
      track,
      // Optional: codec preferences
      encodings: track.kind === 'video'
        ? [
            { maxBitrate: 100_000 },  // low
            { maxBitrate: 300_000 },  // medium
            { maxBitrate: 900_000 },  // high
          ]
        : undefined,
      codecOptions: track.kind === 'video'
        ? { videoGoogleStartBitrate: 1000 }
        : undefined,
    });
    
    // Store producer reference for later (e.g., mute/unmute)
    producerMap.set(producer.id, producer);
  }
}
```

### Step 5 — Consume incoming streams (server-pushed)

```typescript
// The server pushes `consume` events automatically — no need to request manually.
// Set this listener up BEFORE createRecvTransport resolves.
const peerStreams = new Map<string, MediaStream>(); // userId → MediaStream

socket.on('consume', async ({
  consumerId,
  producerId,
  kind,
  rtpParameters,
  userId,
}: ConsumePayload) => {
  const consumer: Consumer = await recvTransport.consume({
    id: consumerId,
    producerId,
    kind,
    rtpParameters,
  });

  // Add to peer's stream
  if (!peerStreams.has(userId)) {
    peerStreams.set(userId, new MediaStream());
  }
  peerStreams.get(userId)!.addTrack(consumer.track);

  // Update UI: render the stream in a <video> element
  renderPeerStream(userId, peerStreams.get(userId)!);

  // Tell server to start forwarding RTP (consumer starts paused)
  socket.emit('resume-consumer', { roomId: moduleId, consumerId });

  // Handle consumer closed (producer stopped)
  consumer.on('transportclose', () => {
    removePeerTrack(userId, consumer.track);
  });
  consumer.on('trackended', () => {
    removePeerTrack(userId, consumer.track);
  });
});
```

### Step 6 — Handle peer events (UI updates)

```typescript
socket.on('peer-joined', ({ userId }) => {
  addParticipantToUI(userId);
});

socket.on('peer-left', ({ userId, producerIds }) => {
  removeParticipantFromUI(userId);
  peerStreams.delete(userId);
});

socket.on('new-producer', ({ userId, producerId, kind }) => {
  // UI-only: update "X is sharing video/audio" indicator
  // The actual consume event was already sent by the server
  updateParticipantStatus(userId, kind, 'producing');
});

socket.on('consumer-closed', ({ consumerId }) => {
  // A track stopped — find and remove it from the UI
  for (const [userId, stream] of peerStreams) {
    // ... find track by consumerId and remove from stream
  }
});

socket.on('sfu-error', ({ message, code }) => {
  console.error(`[SFU Error] ${code}: ${message}`);
  showErrorToast(message);
});
```

### Step 7 — Mute / unmute / stop

```typescript
// Mute audio
const audioProducer = [...producerMap.values()].find(p => p.kind === 'audio');
audioProducer?.pause();    // stops sending audio
audioProducer?.resume();   // resumes sending audio

// Stop camera
const videoProducer = [...producerMap.values()].find(p => p.kind === 'video');
videoProducer?.close();    // permanently stops

// Leave meeting
producerMap.forEach(p => p.close());
sendTransport.close();
recvTransport.close();
socket.emit('leave-room', { roomId: moduleId });
socket.disconnect();
```

---

## 5. Complete Component Skeleton (React + TypeScript)

```typescript
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import type { Transport, Producer, Consumer } from 'mediasoup-client/lib/types';

export function MeetRoom({ moduleId, authToken }: { moduleId: string; authToken: string }) {
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producersRef = useRef<Map<string, Producer>>(new Map());
  const consumersRef = useRef<Map<string, Consumer>>(new Map());
  
  const [peers, setPeers] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const socket = io('http://localhost:8007', {
      auth: { token: authToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    const roomId = moduleId; // roomId === moduleId per architecture decision

    // --- Listener: consume (server-pushed, set up BEFORE joining) -----------
    socket.on('consume', async ({ consumerId, producerId, kind, rtpParameters, userId }) => {
      if (cancelled || !recvTransportRef.current) return;
      const consumer = await recvTransportRef.current.consume({
        id: consumerId, producerId, kind, rtpParameters,
      });
      consumersRef.current.set(consumerId, consumer);
      setPeers(prev => {
        const next = new Map(prev);
        const stream = next.get(userId) ?? new MediaStream();
        stream.addTrack(consumer.track);
        next.set(userId, stream);
        return next;
      });
      socket.emit('resume-consumer', { roomId, consumerId });
    });

    socket.on('peer-joined', ({ userId }) => {
      setPeers(prev => {
        if (prev.has(userId)) return prev;
        return new Map(prev).set(userId, new MediaStream());
      });
    });

    socket.on('peer-left', ({ userId }) => {
      setPeers(prev => { const n = new Map(prev); n.delete(userId); return n; });
    });

    socket.on('consumer-closed', ({ consumerId }) => {
      consumersRef.current.get(consumerId)?.close();
      consumersRef.current.delete(consumerId);
    });

    // --- Main join sequence --------------------------------------------------
    async function join() {
      // 1. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      setLocalStream(stream);

      // 2. Join room
      socket.emit('join-room', { roomId });
      
      await new Promise<void>(resolve => {
        socket.once('room-joined', ({ existingProducers }) => {
          // existingProducers are handled via server-pushed consume events
          resolve();
        });
      });

      // 3. Get router RTP capabilities
      socket.emit('get-rtp-capabilities', { roomId });
      const { rtpCapabilities: routerRtpCaps } = await new Promise<any>(resolve =>
        socket.once('rtp-capabilities', resolve)
      );

      // 4. Load mediasoup Device
      const device = new Device();
      await device.load({ routerRtpCapabilities: routerRtpCaps });
      deviceRef.current = device;
      socket.emit('set-rtp-capabilities', { roomId, rtpCapabilities: device.rtpCapabilities });

      // 5. Create transports (parallel)
      socket.emit('create-send-transport', { roomId });
      socket.emit('create-recv-transport', { roomId });

      const [sendOpts, recvOpts] = await Promise.all([
        new Promise<any>(r => socket.once('send-transport-created', r)),
        new Promise<any>(r => socket.once('recv-transport-created', r)),
      ]);

      const sendTransport = device.createSendTransport(sendOpts);
      sendTransport.on('connect', ({ dtlsParameters }, cb) => {
        socket.emit('connect-transport', { roomId, transportId: sendTransport.id, dtlsParameters });
        cb();
      });
      sendTransport.on('produce', ({ kind, rtpParameters, appData }, cb) => {
        socket.emit('produce', { roomId, kind, rtpParameters, appData });
        socket.once('produced', ({ producerId }) => cb({ id: producerId }));
      });
      sendTransportRef.current = sendTransport;

      const recvTransport = device.createRecvTransport(recvOpts);
      recvTransport.on('connect', ({ dtlsParameters }, cb) => {
        socket.emit('connect-transport', { roomId, transportId: recvTransport.id, dtlsParameters });
        cb();
      });
      recvTransportRef.current = recvTransport;

      // 6. Publish local tracks
      for (const track of stream.getTracks()) {
        const producer = await sendTransport.produce({ track });
        producersRef.current.set(producer.id, producer);
      }
    }

    join().catch(console.error);

    return () => {
      cancelled = true;
      producersRef.current.forEach(p => p.close());
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      socket.emit('leave-room', { roomId });
      socket.disconnect();
    };
  }, [moduleId, authToken]);

  return (
    <div>
      {/* Local video */}
      <video
        ref={el => { if (el && localStream) el.srcObject = localStream; }}
        autoPlay muted playsInline
      />
      {/* Remote peers */}
      {[...peers.entries()].map(([userId, stream]) => (
        <video
          key={userId}
          ref={el => { if (el) el.srcObject = stream; }}
          autoPlay playsInline
        />
      ))}
    </div>
  );
}
```

---

## 6. Sequence Diagram

```
Client                              Server (meet-service)
  │                                        │
  │── connect { auth: { token } } ────────►│ [auth middleware: sessions table]
  │                                        │
  │── join-room { roomId } ───────────────►│ getOrCreateRoom, addPeer, DB insert
  │◄── room-joined { existingProducers } ──│
  │                                        │
  │── get-rtp-capabilities ───────────────►│
  │◄── rtp-capabilities { rtpCaps } ───────│
  │  [device.load(routerRtpCaps)]          │
  │── set-rtp-capabilities { devCaps } ───►│ peer.rtpCapabilities = devCaps
  │                                        │
  │── create-send-transport ──────────────►│ router.createWebRtcTransport()
  │◄── send-transport-created { ... } ─────│
  │                                        │
  │── create-recv-transport ──────────────►│ router.createWebRtcTransport()
  │◄── recv-transport-created { ... } ─────│
  │◄── consume { ... } × N ────────────────│ [server pushes existing producers]
  │                                        │
  │  [transport.on('connect') fires]        │
  │── connect-transport { send, dtls } ───►│ sendTransport.connect()
  │── connect-transport { recv, dtls } ───►│ recvTransport.connect()
  │                                        │
  │── produce { kind, rtpParams } ────────►│ sendTransport.produce()
  │◄── produced { producerId } ────────────│
  │                         [others] ◄── consume + new-producer ──│
  │                                        │
  │── resume-consumer { consumerId } ─────►│ consumer.resume()
  │  [media flows from server to client]   │
  │                                        │
  │── leave-room / disconnect ────────────►│ removePeer, DB update, publish events
  │                     [others] ◄── peer-left ──────────────────│
```

---

## 7. Common Pitfalls & Debugging

### ICE connection fails (no video/audio)
- **Cause:** `MEDIASOUP_ANNOUNCED_IP` is wrong (0.0.0.0 or localhost).  
- **Fix:** Set it to the server's LAN IP (run `ip addr` on the server to find it, e.g. `192.168.1.100`).

### `device.load()` throws "not supported"
- **Cause:** Browser doesn't support the advertised codecs.  
- **Check:** The router's `mediaCodecs` must include at least one codec the browser supports (VP8 is universal).

### Consumer never starts playing
- **Cause:** `resume-consumer` was never emitted, or emitted before `recvTransport.consume()` completed.  
- **Fix:** Emit `resume-consumer` only AFTER `await recvTransport.consume(...)` resolves.

### `produce` callback never called
- **Cause:** The `produce` event handler on the transport didn't call `callback({ id: producerId })`.  
- **Fix:** Ensure `socket.once('produced', ...)` is set inside the `produce` handler, not outside.

### Existing peers' streams not showing on join
- **Cause:** The `consume` listener was registered AFTER `recv-transport-created` (server already pushed consume events before the listener was attached).  
- **Fix:** Always register the `socket.on('consume', ...)` listener BEFORE emitting `join-room`.

### Both transports use the same DTLS parameters
- **Cause:** `connect-transport` handler identifies transport by `transportId` — ensure the correct `transportId` is passed for each transport.

---

## 8. REST Endpoints (for pre-join state)

Before connecting via WebSocket, the UI may want to check if a meeting is active:

```
GET /rooms/:roomId
→ { status: 'idle' | 'active', livePeerCount, meeting: { ... } | null }

GET /rooms/:roomId/history
→ { history: [{ id, startedAt, endedAt, participants }] }

GET /signal/info
→ { wsUrl, transport, events: { emit: [...], on: [...] } }
```
