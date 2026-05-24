# Chat Service Context

## Overview
The Chat Service manages real-time messaging, channel creation, and presence. It relies on a local persistent replica of users and sessions synchronized from the Auth Service via Redis PubSub.

## Tech Stack
- **Framework:** Express.js
- **Real-time:** Socket.io (with Redis Adapter for scaling)
- **Database:** PostgreSQL with Drizzle ORM
- **Internal RPC:** gRPC (for service-to-service communication)
- **Authorization:** Custom JWT (HS256) validation against local session replica.

## Core Architecture & Features

### 1. Data Replication (The "Replica" Model)
- **Users & Sessions:** This service maintains its own `users` and `sessions` tables. 
- **Sync Logic:** The `SubscriberService` listens to the `user_events` Redis channel and replicates data from the Auth Service in real-time.
- **ID Standard:** All IDs (including channels and messages) use the `text` type to match the Auth Service's high-entropy strings. Defaults are handled via `gen_random_uuid()` in SQL.

### 2. Authorization
- **Middleware:** Both REST and WebSocket routes use an `authMiddleware`.
- **Validation:** It verifies the incoming `Authorization` header against the local `sessions` table.
- **Fallback:** It supports both the custom `authToken` (JWT) and the standard BetterAuth token for maximum compatibility during transitions.

### 3. Channel Management
- **Direct Messages (DMs):** Enforces a "Unique DM" constraint. Attempting to create a DM between two users who already have one will return the existing channel (`200 OK`) instead of creating a new one (`201 Created`).
- **Groups:** Allows multiple group chats between any combination of users.
- **Enrichment:** Channel requests return full participant profiles (`members.user`) and the `lastMessage` for chat list previews.

### 4. Real-time Engine (Socket.io)
- **Rooms:** Users join rooms based on `channelId`.
- **Events:**
    - `message`: Sending/receiving chat messages.
    - `typing`: Real-time typing indicators.
    - `receipt`: Message delivery/read status.
    - `user_presence`: Online/offline status updates.
- **Persistence:** Messages are saved to the database *before* being broadcasted to ensure delivery reliability.

## API Endpoints

### Channels
- `GET /api/channels`: Returns a sorted list of the user's chats, enriched with members and the latest message.
- `POST /api/channels`: Creates a new channel (handles unique DM logic).
- `GET /api/channels/:id`: Returns detailed metadata for a specific channel.

### Messages
- `GET /api/messages/:channelId`: Fetches message history for a channel.

### Users
- `GET /api/users`: Returns a list of all synchronized users (excluding self) for starting new chats.

## Environment Variables
- `DATABASE_URL`: Local Postgres (`vero_chat`).
- `REDIS_URL`: Redis for PubSub and Socket.io scaling.
- `BETTER_AUTH_SECRET`: Must match Auth Service to verify JWTs.
- `PORT`: Default 8005.
