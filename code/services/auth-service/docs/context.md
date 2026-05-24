# Auth Service Context

## Overview
The Auth Service is the central identity and session provider. It handles user authentication (via BetterAuth), profile management, and issues custom HS256 JWTs (`authToken`) for stateless authorization across the microservice ecosystem.

## Tech Stack
- **Framework:** Express.js
- **Authentication:** [BetterAuth](https://www.better-auth.com/) (v1)
- **Database:** PostgreSQL with Drizzle ORM
- **PubSub:** Redis (ioredis) for cross-service synchronization
- **Tokens:** Custom HS256 JWTs signed with `BETTER_AUTH_SECRET`

## Core Architecture & Features

### 1. Unified ID Standard
- **Format:** All identity-related tables (`user`, `session`, `account`, `verification`, `jwks`) use the **`text`** type for primary keys.
- **Rationale:** BetterAuth generates high-entropy strings for IDs that are incompatible with strict PostgreSQL `uuid` types. Using `text` ensures 100% compatibility and stability.

### 2. Custom Token System
- **`authToken`:** A standard HS256 JWT containing `userId`, `email`, `name`, `role`, and `sessionId`. This is the primary authorization token for other microservices.
- **`refreshToken`:** A high-entropy opaque string for extending sessions.
- **Injection:** Tokens are generated in the `session.create.after` hook and persisted back to the database.

### 3. BetterAuth Customization
- **Custom Plugin:** A plugin (`custom-tokens`) is used to mark `authToken` and `refreshToken` as `public: true`, ensuring they are included in the JSON response sent to the frontend.
- **Session Strategy:** Database-backed sessions.

### 4. Cross-Service Synchronization
- **Producer:** Publishes events to the `user_events` Redis channel.
- **Events:** `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `SESSION_CREATED`, `SESSION_DELETED`.
- **Payload:** The `SESSION_CREATED` event includes the fully enriched session object with the custom `authToken`.

## API Endpoints

### Authentication
- `ALL /api/auth/*`: Standard BetterAuth routes (login, social providers, etc.).
- `GET /api/auth/session`: Returns the enriched session object containing `authToken` and `refreshToken`.

### User Profile
- `GET /api/user/profile`: Fetches the current user's profile.
- `PATCH /api/user/profile`: Updates user metadata (bio, theme, etc.).

### System
- `GET /health`: Health check.
- `loggerMiddleware`: Logs all incoming requests (method, route, status, duration).

## Environment Variables
- `BETTER_AUTH_SECRET`: Used for JWT signing and BetterAuth security.
- `DATABASE_URL`: Postgres connection.
- `REDIS_URL`: Redis connection for PubSub.
- `BETTER_AUTH_URL`: Base URL of the auth service.
