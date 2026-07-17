# Board Service — Architecture & Implementation Plan

> Service: `code/services/board-service/`
> Port: 8002
> Database: PostgreSQL (via Drizzle ORM)

---

## 1. What This Service Does

The Board Service manages Kanban boards for projects. Each project gets a board with customizable columns. Tasks live inside columns and can be dragged between them.

**Core flow:**
```
Project → Board (auto-created with 4 default columns)
         Column → Task (many tasks per column)
```

---

## 2. Database Schema

### Tables

**workspaces** — Top-level container (synced from auth events)
```
id          UUID PK (default random)
name        VARCHAR(255) NOT NULL
description TEXT
ownerId     UUID NOT NULL
createdAt   TIMESTAMP (default now)
updatedAt   TIMESTAMP (default now)
```

**projects** — Belongs to a workspace
```
id          UUID PK (default random)
name        VARCHAR(255) NOT NULL
description TEXT
workspaceId UUID FK → workspaces.id NOT NULL
ownerId     UUID NOT NULL
createdAt   TIMESTAMP (default now)
updatedAt   TIMESTAMP (default now)
```

**columns** — Board columns within a project
```
id          UUID PK (default random)
name        VARCHAR(255) NOT NULL
order       INTEGER NOT NULL (determines column position left→right)
projectId   UUID FK → projects.id NOT NULL
createdAt   TIMESTAMP (default now)
updatedAt   TIMESTAMP (default now)
```

**tasks** — Cards within a column
```
id          UUID PK (default random)
title       VARCHAR(255) NOT NULL
description TEXT
order       INTEGER NOT NULL (position within column)
columnId    UUID FK → columns.id NOT NULL
assigneeId  UUID (nullable — task may be unassigned)
creatorId   UUID NOT NULL
dueDate     TIMESTAMP (nullable)
priority    VARCHAR(20) DEFAULT 'medium' — 'low' | 'medium' | 'high' | 'urgent'
status      VARCHAR(20) DEFAULT 'backlog' — derived from column position
labels      TEXT[] (array of label strings)
createdAt   TIMESTAMP (default now)
updatedAt   TIMESTAMP (default now)
```

**workspace_members** — Who has access
```
id          UUID PK (default random)
workspaceId UUID FK → workspaces.id NOT NULL
userId      UUID NOT NULL
role        VARCHAR(50) DEFAULT 'member' — 'owner' | 'admin' | 'member' | 'guest'
joinedAt    TIMESTAMP (default now)
```

**users** — Synced from auth service via Redis
```
id          UUID PK
name        VARCHAR(255) NOT NULL
avatarUrl   VARCHAR(512)
updatedAt   TIMESTAMP (default now)
```

### Default Columns (created when board is initialized)

| order | name          | status     |
|-------|---------------|------------|
| 0     | Backlog       | backlog    |
| 1     | In Progress   | in_progress|
| 2     | In Review     | in_review  |
| 3     | Done          | done       |

The `status` field on tasks is derived from which column the task is in. When a task moves to a new column, its status updates to match the column's status.

---

## 3. API Endpoints

No auth middleware for now. All endpoints are open for testing.

### Columns

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| GET | `/api/board/columns/:projectId` | — | Column[] | Get all columns for a project (with task counts) |
| POST | `/api/board/columns` | { name, projectId } | Column | Create a new column |
| PATCH | `/api/board/columns/:id` | { name?, order? } | Column | Update column name or reorder |
| DELETE | `/api/board/columns/:id` | — | 204 | Delete column and its tasks |

### Tasks

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| GET | `/api/board/tasks/:projectId` | — | Task[] | Get all tasks for a project |
| GET | `/api/board/tasks/detail/:id` | — | Task | Get single task with full details |
| POST | `/api/board/tasks` | { title, columnId, ... } | Task | Create a new task (auto-assigns order) |
| PATCH | `/api/board/tasks/:id` | { title?, description?, priority?, ... } | Task | Update task fields |
| DELETE | `/api/board/tasks/:id` | — | 204 | Delete a task |
| PATCH | `/api/board/tasks/:id/move` | { columnId, order } | Task | Move task to different column/position |

### Board Initialization

| Method | Path | Body | Response | Description |
|--------|------|------|----------|-------------|
| POST | `/api/board/init/:projectId` | — | Board | Initialize board with 4 default columns |

### Health

| Method | Path | Response | Description |
|--------|------|----------|-------------|
| GET | `/health` | { status: 'ok' } | Health check |

---

## 4. Service Layer

### task.service.ts
- `getTasksByProject(projectId)` — JOIN tasks with columns, return grouped by column
- `getTaskById(id)` — Single task with column info
- `createTask(data)` — Insert task, auto-calculate order (append to end of column)
- `updateTask(id, data)` — Partial update
- `deleteTask(id)` — Delete task
- `moveTask(id, columnId, order)` — Move task to new column, reindex orders in both source and target columns

### column.service.ts
- `getColumnsByProject(projectId)` — All columns with task counts
- `createColumn(data)` — Insert column at end
- `updateColumn(id, data)` — Rename or reorder
- `deleteColumn(id)` — Delete column + cascade delete its tasks
- `initializeBoard(projectId)` — Create 4 default columns if none exist

### workspace.service.ts
- `getWorkspacesByUser(userId)` — List workspaces for a user
- `createWorkspace(data)` — Create workspace
- `getWorkspaceById(id)` — Get workspace

### project.service.ts
- `getProjectsByWorkspace(workspaceId)` — List projects in workspace
- `getProjectById(id)` — Get project with board info
- `createProject(data)` — Create project + auto-init board

---

## 5. File Structure (After Implementation)

```
board-service/
├── src/
│   ├── app.ts                    ← Express app, mounts routes
│   ├── config/
│   │   └── env.ts                ← Zod env validation (KEEP)
│   ├── db/
│   │   ├── client.ts             ← Drizzle client (KEEP)
│   │   └── migrate.ts            ← Migration runner (KEEP)
│   ├── models/
│   │   ├── task.model.ts         ← Task table (UPDATE — add labels)
│   │   ├── column.model.ts       ← Column table (KEEP)
│   │   ├── project.model.ts      ← Project table (KEEP)
│   │   ├── workspace.model.ts    ← Workspace table (KEEP)
│   │   ├── member.model.ts       ← Workspace members (KEEP)
│   │   └── user.model.ts         ← Users + sessions (KEEP)
│   ├── services/
│   │   ├── task.service.ts       ← NEW — Task CRUD + move
│   │   ├── column.service.ts     ← NEW — Column CRUD + init
│   │   ├── workspace.service.ts  ← NEW — Workspace queries
│   │   ├── project.service.ts    ← NEW — Project queries
│   │   └── subscriber.service.ts ← KEEP — Redis event sync
│   ├── routes/
│   │   ├── task.routes.ts        ← NEW — Task endpoints
│   │   ├── column.routes.ts      ← NEW — Column endpoints (renamed from workspace)
│   │   └── board.routes.ts       ← NEW — Board init endpoint
│   └── controllers/
│       ├── task.controller.ts    ← NEW — Task handlers
│       ├── column.controller.ts  ← NEW — Column handlers
│       └── board.controller.ts   ← NEW — Board init handler
├── tests/
│   ├── task.test.ts              ← NEW — Task CRUD tests
│   ├── column.test.ts            ← NEW — Column CRUD tests
│   └── board.test.ts             ← NEW — Integration tests
└── package.json                  ← KEEP
```

### Files to DELETE (not needed):
```
src/services/member.service.ts     — Using workspace.service instead
src/services/publisher.service.ts  — Not needed yet (no real-time)
src/services/bidisync.service.ts   — Future feature
src/routes/member.routes.ts        — Not needed yet
src/routes/workspace.routes.ts     — Renamed to column.routes.ts
src/controllers/member.controller.ts — Not needed yet
src/controllers/workspace.controller.ts — Replaced
src/middleware/auth.ts             — Skipping auth for now
src/middleware/rateLimit.ts        — Empty, not needed yet
src/middleware/validate.ts         — Empty, not needed yet
```

---

## 6. Key Design Decisions

1. **Status is derived from column** — The `tasks.status` field is set based on which column the task is in. Default columns map: Backlog→backlog, In Progress→in_progress, In Review→in_review, Done→done.

2. **Order field for drag-and-drop** — Both columns and tasks have an `order` integer. When reordering, we shift affected items' order values. This lets the frontend sort by order.

3. **No auth middleware** — All endpoints are open for testing. Auth will be added later.

4. **Auto-init board** — When a project is created or first accessed, 4 default columns are auto-created if the project has no columns yet.

5. **Board is project-scoped** — The frontend passes `projectId` (or `workspaceId` for backward compat). We'll support both but project-scoped is the correct model.

---

## 7. Testing Strategy

### Unit Tests (vitest)
- Task service: create, read, update, delete, move
- Column service: create, read, update, delete, initialize
- Task ordering: verify order integers shift correctly on move

### Integration Tests
- Full flow: init board → create task → move task → verify column counts
- Column deletion: verify tasks are deleted too
- Multiple projects: verify isolation

### How to Run
```bash
cd code/services/board-service
pnpm install
pnpm run migrate    # Create tables
pnpm run dev        # Start on port 8002
pnpm test           # Run tests
```
