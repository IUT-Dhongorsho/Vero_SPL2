# Chat Service Specifications & Requirements

## Tech Stack
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript (ESM - `type: "module"`)
- **API Framework:** Express.js
- **Real-time:** Socket.io (with Redis Adapter for horizontal scaling)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Caching & Event Bus:** Redis (ioredis)
- **Inter-service Communication:** 
  - gRPC (Synchronous creation of channels/rooms)
  - Redis Pub/Sub (Asynchronous user data propagation)
- **Monitoring:** Prometheus (`prom-client`)
- **Validation:** Zod

## Functional Requirements (FR)
1. **1-on-1 Direct Messaging:** Support for private messaging between two users.
2. **Multi-user Chatrooms:** Support for group chats with Role-Based Access Control (RBAC - admin/member).
3. **Automated Room Creation:** Automated creation of project and module-specific chat rooms via gRPC calls from `project-service`.
4. **Presence Management:** Real-time online/offline status tracking and broadcasting.
5. **Typing Indicators:** Real-time feedback when a user is typing in a channel.
6. **Read Receipts:** Persistence and broadcasting of message delivery and read statuses.
7. **Message Persistence:** All messages and receipts are persisted in PostgreSQL before broadcasting.
8. **Health Monitoring:** Deep health checks for database and Redis connectivity.
9. **Metrics Collection:** Prometheus-formatted metrics for HTTP latency, active socket connections, and message throughput.

## Non-Functional Requirements (NFR)
1. **Scalability:** Horizontal scaling supported via Redis Socket.io adapter.
2. **Decentralized Authentication:** Independent JWT verification using a shared secret.
3. **Data Isolation (User-Ref Strategy):** Replicated `users` table maintained locally for fast lookups and foreign key integrity.
4. **Eventual Consistency:** Real-time sync of user data via Redis Event Bus (`user_events` channel).
5. **Observability:** Industry-standard monitoring endpoints (`/health`, `/metrics`).
6. **"Persist First" Mandate:** Architectural guarantee that data is saved before emission to prevent data loss.

## Workflow
1. **Initialization:** `project-service` initializes a project and calls `ChatService.CreateChannel` via gRPC to set up the root project room and module-specific rooms.
2. **User Sync:** `auth-service` publishes user events to Redis; `chat-service` consumes these events to sync its local `users` reference table.
3. **Real-time Interaction:** Users connect via Socket.io with JWT handshake. Messages flow through handlers that persist to DB and then broadcast to the appropriate Socket.io room.
