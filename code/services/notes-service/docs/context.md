# Notes Service Context

## Overview
The Notes Service manages collaborative documents and blocks. Like other services, it maintains a local persistent replica of users and sessions synchronized from the Auth Service via Redis PubSub.

## Tech Stack
- **Framework:** Express.js
- **Real-time:** Socket.io (for collaboration)
- **Database:** PostgreSQL with Drizzle ORM
- **Authorization:** Custom JWT (HS256) validation against local session replica.

## Core Architecture & Features

### 1. Data Replication
- **Users & Sessions:** Replicated from `auth-service` via Redis `user_events` channel.
- **ID Standard:** All IDs use the `text` type for full compatibility with BetterAuth.

### 2. Authorization
- **Middleware:** `authMiddleware` verifies the `authToken` (JWT) or standard token against the local replica.

### 3. Collaboration
- **Socket.io:** Integrated for real-time note editing and presence within documents.

## API Endpoints (Planned)
- `GET /health`: Basic health check.

## Environment Variables
- `DATABASE_URL`: Local Postgres (`vero_notes`).
- `REDIS_URL`: Redis connection.
- `BETTER_AUTH_SECRET`: Shared secret for JWT verification.
- `PORT`: Default 8003.
