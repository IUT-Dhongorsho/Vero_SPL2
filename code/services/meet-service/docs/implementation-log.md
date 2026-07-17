# Meet-Service — Implementation Decision Log

> This document records every architectural and implementation decision made during
> the development of the `meet-service` SFU. It supplements the project-level
> Architecture Decision Log (`code/docs/decisions/log1.md`).

**Date:** 2026-07-13  
**Session participants:** Developer + Antigravity AI  
**Status:** Implementation complete (v1)

---

## Decision M001 — Worker Pool Strategy

**Choice:** Pool of `os.cpus().length` workers created at startup, distributed via round-robin.

**Rationale:** The HP EliteBook 840 G7 (i7-10610U) has 4 physical cores.  
- Mediasoup maps **1 Worker = 1 CPU core** (native C++ process).  
- Round-robin ensures even distribution of rooms across cores.  
- Spawning workers on-demand was rejected: worker creation takes ~2s and is unsuitable for real-time join latency.  
- A single worker was rejected: leaves 3 cores idle and creates a bottleneck.

**Implementation:** `src/sfu/worker.ts` — `createWorkerPool()`, `getNextWorker()`  

**Capacity estimate:**  
~250 consumers per worker × 4 workers = ~1,000 simultaneous consumers → ~10 concurrent 10-person meetings comfortably.

**Worker death policy:** On `worker.died` event, the server calls `process.exit(1)`. The process manager (PM2/Docker restart/systemd) brings the entire service back cleanly. A partial pool with dead workers is unsafe (load imbalance + rooms on dead worker are lost anyway).

---

## Decision M002 — Router-to-Room Mapping

**Choice:** One mediasoup Router per room, created lazily on first join.

**Rationale:**  
- The Router owns codec negotiation for the room. All peers in the room must share one Router so their RTP capabilities can be compared.  
- Lazy creation means no Router exists until the first peer joins, keeping idle memory near zero.  
- Router destruction: when the last peer leaves, the Router is closed and the room is deleted.

**Room identity:** `roomId = moduleId` (see Decision M003).

**Implementation:** `src/services/room.service.ts` — `getOrCreateRoom()`

---

## Decision M003 — Room Identity (roomId = moduleId)

**Choice:** The `moduleId` from the application hierarchy (Workspace → Project → Module) IS the `roomId`.

**Rationale:**  
- Per Decision 007 in the project ADL, Meet is scoped to a Module.  
- One persistent room per Module aligns with the "Meet is a module feature" design.  
- The room is not ephemeral — it persists across calls. When the last peer leaves, the mediasoup room is destroyed, but the DB record stays. The next join creates a new mediasoup room with a fresh router (new `meeting` row in DB).  
- Alternative (new UUID per call) was considered but rejected: the module already provides a natural, stable identifier.

---

## Decision M004 — Transport Strategy

**Choice:** Two WebRTC transports per peer — one send (client→server) and one recv (server→client).

**Rationale:**  
- Mediasoup requires separate transports for producing and consuming.  
- The send transport carries the client's outgoing tracks (mic/camera).  
- The recv transport carries all incoming tracks from other peers.

**ICE config (locked in architecture session):**
```
listenIp:    0.0.0.0  (bind all interfaces)
announcedIp: MEDIASOUP_ANNOUNCED_IP  (server's actual LAN/public IP)
UDP preferred, TCP fallback
Port range: 40000–49999
```

**Why announcedIp matters:** If left as `0.0.0.0`, ICE candidates sent to clients are useless — they need the real server IP to connect. This is the #1 source of WebRTC connection failures in server deployments.

**Implementation:** `src/sfu/transport.ts`

---

## Decision M005 — Codec Configuration

**Choice:** Opus (audio) + VP8 + H264 (video).

| Codec | Reason |
|-------|--------|
| Opus | Mandatory. Universal browser/device support, excellent quality. |
| VP8 | Universal software fallback. Negotiated when H264 is unavailable. |
| H264 | Hardware-accelerated on most modern laptops and phones. Higher quality at same bitrate. |

VP9 was considered but rejected: rarely wins codec negotiation in practice over H264, adds complexity for no real gain in our use case.

**Implementation:** `src/sfu/router.ts` — `mediaCodecs` array

---

## Decision M006 — Consumer Creation Strategy (Server-Side Push)

**Choice:** Server creates consumers proactively on behalf of clients.

**When consumers are created:**
1. **When peer A creates its recv transport** → server immediately creates consumers for A consuming all existing producers in the room.
2. **When peer B produces** → server creates consumers for all existing peers (that have recv transport + rtpCapabilities) consuming B's new producer.

**Why this requires `set-rtp-capabilities`:**  
To create a consumer for peer A, the server needs A's device `rtpCapabilities` (the browser's negotiated capabilities, a subset of the router's capabilities). These are stored when A emits `set-rtp-capabilities` after loading its mediasoup Device.

**Alternative rejected:** Client-side pull (client emits `consume { producerId, rtpCapabilities }` for each producer it wants). This is simpler but requires more client-side orchestration logic and creates a window where a new producer arrives but the client hasn't consumed it yet.

**Implementation:** `src/services/signal.service.ts` — `_pushExistingConsumers()`, `handleProduce()`

---

## Decision M007 — Auth Middleware (Local Session Lookup)

**Choice:** Same pattern as `chat-service` — validate against local `sessions` shadow table.

**Flow:**
```
1. Token from socket.handshake.auth.token (or Authorization header)
2. Lookup in local sessions table: WHERE (authToken = $token OR token = $token) AND expiresAt > NOW()
3. JOIN with users table for user object
4. Attach user to socket.user
```

**Why not hit auth-service REST:**  
- Network call on every WebSocket connection adds ~5-20ms latency.  
- Auth-service being down would prevent all meet-service connections.
- Local table lookup is sub-millisecond and fault-tolerant.

**Why not JWT-only validation:**  
- Token revocation wouldn't work — a logged-out user could still connect until JWT expiry.  
- The shadow table approach gives us revocation for free via `session.deleted` events.

**Implementation:** `src/ws/ws-server.ts` — `authMiddleware`

---

## Decision M008 — Screen Sharing (Deferred to v2)

**Choice:** Not implemented in v1.

**How v2 would implement it:**  
Screen share is just another Producer with `appData: { source: 'screen' }`. No special server logic — the client calls `navigator.mediaDevices.getDisplayMedia()` and produces the resulting track through the existing send transport. The `kind` is `'video'` and `appData.source` distinguishes it in the UI.

No server changes are needed for v2 screen share — only client changes.

---

## Decision M009 — TURN Server Integration

**Choice:** Optional TURN via environment variables. Not required for LAN-only operation.

**When TURN is needed:** Clients behind symmetric NAT (mobile 4G, corporate firewalls) cannot establish direct UDP connections. TURN relays their media through the server.

**Infrastructure:** `coturn` is already set up in `infra/coturn/`. Connect by setting:
```
TURN_SERVER_URL=turn:server-ip:3478
TURN_USERNAME=...
TURN_PASSWORD=...
```

**For the demo (local network):** Only `MEDIASOUP_ANNOUNCED_IP = server's LAN IP` is needed. ICE will use host candidates (local IPs) and route purely through the office switch.

**Implementation:** `src/services/signal.service.ts` — `buildIceServers()`

---

## Decision M010 — In-Memory State vs. Redis

**Choice:** All WebRTC session state (Room, Peer, transports, producers, consumers) is held entirely in RAM on the single meet-service process.

**Why not Redis:**  
Mediasoup objects (`WebRtcTransport`, `Producer`, `Consumer`) are native C++ objects. They cannot be serialized or transferred. They must live in the same process as the Worker that created them.

**Implications:**
- meet-service is stateful and cannot be horizontally scaled without a coordination layer (not needed for v1).  
- If the process restarts, all active calls drop. Clients should reconnect automatically.  
- The Redis adapter on Socket.io is included for future horizontal scaling but is not needed in v1.

---

## Decision M011 — DB Schema

**Three domain tables:**

| Table | Purpose |
|-------|---------|
| `users` | Shadow table — replicated from auth-service via Redis events |
| `sessions` | Shadow table — replicated from auth-service for socket auth |
| `meetings` | One row per call session. `roomId = moduleId`. `status: active/ended`. |
| `meeting_participants` | One row per peer join event. Tracks `joinedAt` and `leftAt`. |

**Meeting lifecycle:**  
- Created when the **first** peer joins a room with no active meeting.  
- Ended when the **last** peer leaves (room is empty → DB updated + event published).

**Implementation:** `src/models/meeting.model.ts`

---

## Decision M012 — Redis Events Published

| Channel | Payload | Trigger |
|---------|---------|---------|
| `meeting.started` | `{ meetingId, roomId, startedBy, startedAt }` | First peer joins an empty room |
| `meeting.ended` | `{ meetingId, roomId, endedAt }` | Last peer leaves |
| `peer.joined` | `{ meetingId, userId }` | Any peer joins |
| `peer.left` | `{ meetingId, userId, roomId }` | Any peer leaves |

Consumers: `notification-service` (mentions/alerts), future analytics service.

---

## Signaling Sequence (Final, Locked)

```
CLIENT                               SERVER
  |                                     |
  |── connect (auth token) ───────────► |  [auth middleware: session lookup]
  |                                     |
  |── join-room { roomId } ───────────► |  getOrCreateRoom, addPeer, DB insert
  |◄─ room-joined { existingProducers } |
  |                                     |
  |── get-rtp-capabilities ───────────► |
  |◄─ rtp-capabilities { rtpCaps }      |  [client loads mediasoup Device]
  |                                     |
  |── set-rtp-capabilities { devCaps } ►|  [peer.rtpCapabilities stored]
  |                                     |
  |── create-send-transport ──────────► |  router.createWebRtcTransport()
  |◄─ send-transport-created { ... }    |
  |                                     |
  |── create-recv-transport ──────────► |  router.createWebRtcTransport()
  |◄─ recv-transport-created { ... }    |
  |◄─ consume { ... } × N              |  [server pushes existing consumers]
  |                                     |
  |── connect-transport (send) ───────► |  sendTransport.connect(dtlsParams)
  |── connect-transport (recv) ───────► |  recvTransport.connect(dtlsParams)
  |                                     |
  |── produce { kind, rtpParameters } ►|  sendTransport.produce()
  |◄─ produced { producerId }           |  [server creates consumers for others]
  |   [others receive consume event]    |
  |                                     |
  |── resume-consumer { consumerId } ──►|  consumer.resume()
  |                                     |
  |── leave-room / disconnect ────────► |  cleanup, DB update, publish events
  |   [others receive peer-left]        |
```

---

## File Structure

```
meet-service/
├── src/
│   ├── app.ts                      ← Express + HTTP + Socket.io + SFU bootstrap
│   ├── config/env.ts               ← Zod-validated env vars
│   ├── db/
│   │   ├── client.ts               ← Drizzle + pg pool
│   │   └── migrate.ts              ← Migration runner
│   ├── models/
│   │   ├── meeting.model.ts        ← DB schema (Drizzle)
│   │   ├── peer.model.ts           ← In-memory types (Room, Peer)
│   │   └── recording.model.ts      ← v2 placeholder
│   ├── sfu/
│   │   ├── worker.ts               ← Worker pool (round-robin)
│   │   ├── router.ts               ← Router factory (codec config)
│   │   ├── transport.ts            ← WebRtcTransport factory (ICE config)
│   │   └── producer-consumer.ts    ← Consumer factory
│   ├── services/
│   │   ├── sfu.service.ts          ← Worker pool lifecycle
│   │   ├── room.service.ts         ← In-memory room state
│   │   ├── signal.service.ts       ← All signaling logic
│   │   ├── publisher.service.ts    ← Redis publish
│   │   └── subscriber.service.ts   ← Redis subscribe (shadow table sync)
│   ├── ws/
│   │   ├── ws-server.ts            ← Socket.io server + auth middleware
│   │   └── message-router.ts       ← Event → handler mapping
│   ├── middleware/
│   │   ├── logger.ts               ← Request logger
│   │   ├── monitor.middleware.ts   ← Prometheus middleware
│   │   ├── validate.ts             ← Zod validation factory
│   │   └── rateLimit.ts            ← Simple in-memory rate limiter
│   ├── monitoring/metrics.ts       ← Prometheus metrics registry
│   ├── controllers/
│   │   ├── room.controller.ts      ← REST: room status + history
│   │   ├── signal.controller.ts    ← REST: signal info endpoint
│   │   └── metrics.controller.ts   ← REST: /metrics
│   └── routes/room.routes.ts       ← Express router
└── docs/
    ├── context.md                  ← Original architecture summary
    ├── implementation-log.md       ← This file
    └── instructs.md                ← Frontend implementation guide
```
