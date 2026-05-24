# Project Service Context

## Overview
The Project Service is the central orchestrator and "glue" of the microservice ecosystem. It manages the high-level hierarchical structure of the application: **Workspaces > Projects > Modules**. Beyond simple CRUD, it is responsible for provisioning functional resources (like chat channels) in other microservices via gRPC and ensuring eventual consistency using background job queues.

## Tech Stack
- **Framework:** Express.js
- **Database:** PostgreSQL with Drizzle ORM
- **Orchestration:** gRPC Client (calling `chat-service`)
- **Resiliency:** BullMQ (Redis-backed) for reliable background task retries
- **PubSub:** Redis (ioredis) for identity and session synchronization
- **Validation:** Zod
- **Authorization:** Custom HS256 JWT validation against a local session replica

## Core Architecture & Features

### 1. Hierarchical Data Model
- **Workspaces:** Top-level containers for organization. A default "Personal Workspace" is automatically provisioned for every user upon their first signup (triggered via Redis `USER_CREATED` event).
- **Projects:** Logical work units within a workspace. Projects manage their own member list and roles (Admin/Member).
- **Modules:** Functional building blocks within a project. A single Module acts as a container for various services:
    - Chat (gRPC provisioned)
    - Board (Planned)
    - Notes (Planned)
    - Signaling/Meeting (Planned)

### 2. Resource Orchestration (gRPC + Queue)
When a Module is created, the Project Service must provision resources in other services.
- **Synchronous Attempt:** It first attempts a gRPC call to the target service (e.g., `chat-service`).
- **Asynchronous Resiliency:** If the target service is unavailable, a job is pushed to the `resource-orchestration` BullMQ. A background worker retries the provisioning with exponential backoff until it succeeds and updates the local `resourceId`.

### 3. Identity Sync (Replica Model)
Like other services in the ecosystem, it maintains a local persistent replica of `users` and `sessions` synchronized from the `auth-service` via the `user_events` Redis channel.

### 4. Unified ID Standard
- **Format:** All primary and foreign keys use the **`text`** type.
- **Rationale:** Ensures 100% compatibility with BetterAuth's high-entropy string IDs across the entire system.

## API Endpoints

### Workspaces
- `GET /api/project/workspaces`: Lists all workspaces owned by or shared with the authenticated user.
- `GET /api/project/workspaces/:id`: Retrieves detailed metadata for a specific workspace.

### Projects
- `POST /api/project/projects`: Creates a new project within a workspace. The creator is automatically assigned the `admin` role.
- `GET /api/project/workspaces/:workspaceId/projects`: Lists all projects within a specific workspace.

### Modules
- `POST /api/project/modules`: Creates a new module and triggers the orchestration of functional resources (e.g., creating the associated chat channel).
- `GET /api/project/projects/:projectId/modules`: Lists all modules associated with a project.

## Environment Variables
- `DATABASE_URL`: Connection string for the `vero_project` database.
- `REDIS_URL`: Shared Redis instance for PubSub and BullMQ.
- `CHAT_SERVICE_GRPC_URL`: Address (e.g., `localhost:5005`) of the Chat Service gRPC server.
- `BETTER_AUTH_SECRET`: Shared secret used to verify incoming HS256 JWTs.
- `PORT`: Default 8004.
