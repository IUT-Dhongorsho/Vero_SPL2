# Kanban Board — Implementation Changes

> Date: 2026-07-17
> Service: `code/services/board-service/`
> Status: Implemented and ready for testing

---

## What Was Built

The board service is now a **fully functional Kanban backend** with task CRUD, column management, drag-and-drop support, and default board initialization.

### Core Changes

**New files created (8):**
```
src/services/task.service.ts       — Task CRUD + move logic + ordering
src/services/column.service.ts     — Column CRUD + default board init
src/services/workspace.service.ts  — Workspace queries
src/services/project.service.ts    — Project queries + auto board init
src/controllers/task.controller.ts — Task HTTP handlers
src/controllers/column.controller.ts — Column HTTP handlers
src/controllers/board.controller.ts — Board init handler
src/routes/task.routes.ts          — Task endpoints
src/routes/column.routes.ts        — Column endpoints
src/routes/board.routes.ts         — Board init endpoint
```

**Files deleted (10):**
```
src/services/member.service.ts       — Replaced by workspace.service
src/services/publisher.service.ts    — Not needed yet
src/services/bidisync.service.ts     — Future feature
src/services/subscriber.service.ts   — Redis sync (add back later)
src/routes/member.routes.ts          — Not needed yet
src/routes/workspace.routes.ts       — Replaced by column.routes
src/controllers/member.controller.ts — Not needed yet
src/controllers/workspace.controller.ts — Replaced
src/middleware/auth.ts               — Skipping auth for testing
src/middleware/rateLimit.ts          — Empty, not needed
src/middleware/validate.ts           — Empty, not needed
src/routes/project.routes.ts         — Empty
src/controllers/project.controller.ts — Empty
src/middleware/ directory removed     — No middleware files left
```

**Files updated (2):**
```
src/models/task.model.ts  — Added `labels` array column, cascade delete on column
src/app.ts               — Wired all routes, removed subscriber init
```

---

## Database Schema

### Tables (6 total)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `workspaces` | Top-level container | owner → users |
| `projects` | Belongs to workspace | workspaceId → workspaces |
| `columns` | Board columns in project | projectId → projects (cascade delete) |
| `tasks` | Cards in columns | columnId → columns (cascade delete) |
| `workspace_members` | Access control | workspaceId → workspaces |
| `users` | Synced from auth service | — |

### Task Fields
```typescript
{
  id:          UUID (auto-generated)
  title:       VARCHAR(255) NOT NULL
  description: TEXT (nullable)
  order:       INTEGER — position within column
  columnId:    UUID FK → columns (cascade delete)
  assigneeId:  UUID (nullable)
  creatorId:   UUID NOT NULL
  dueDate:     TIMESTAMP (nullable)
  priority:    VARCHAR(20) — 'low' | 'medium' | 'high' | 'urgent'
  status:      VARCHAR(20) — derived from column name
  labels:      TEXT[] — array of label strings
  createdAt:   TIMESTAMP
  updatedAt:   TIMESTAMP
}
```

### Status Mapping
| Column Name | Status Value |
|-------------|-------------|
| Backlog | `backlog` |
| In Progress | `in_progress` |
| In Review | `in_review` |
| Done | `done` |

---

## API Endpoints

### Board Initialization
```
POST /api/board/init/:projectId
Response: { projectId, columns: Column[] }
Description: Creates 4 default columns if none exist
```

### Columns
```
GET    /api/board/columns/:projectId    — List columns with task counts
POST   /api/board/columns               — Create custom column
PATCH  /api/board/columns/:id           — Update name/order
DELETE /api/board/columns/:id           — Delete column + its tasks
```

### Tasks
```
GET    /api/board/tasks/:projectId      — List all tasks in project
GET    /api/board/tasks/detail/:id      — Get single task
POST   /api/board/tasks                 — Create task (auto-assigns order)
PATCH  /api/board/tasks/:id             — Update task fields
DELETE /api/board/tasks/:id             — Delete task
PATCH  /api/board/tasks/:id/move        — Move task to column/position
```

### Health
```
GET /health — { status: 'ok', service: 'board-service' }
```

---

## How Drag-and-Drop Works

1. **Frontend** calls `PATCH /api/board/tasks/:id/move` with `{ columnId, order }`
2. **Backend** recalculates order integers in both source and target columns
3. **Backend** updates task's `columnId`, `order`, and `status` (derived from column name)
4. **Frontend** re-fetches or optimistically updates

### Order Recalculation Logic
- Moving within same column: shifts affected tasks' order by ±1
- Moving to different column: decrements orders in source (fill gap), increments in target (make room)

---

## How to Test

### Prerequisites
- PostgreSQL running (Homebrew or Docker)
- Node.js 18+

### 1. Start PostgreSQL
```bash
# Homebrew (macOS)
brew services start postgresql@17

# OR Docker
docker run -d --name vero-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

### 2. Create database
```bash
createdb board_db
```

### 3. Set up the service
```bash
cd code/services/board-service

# Install dependencies
npm install

# Create .env (edit DATABASE_URL to match your PostgreSQL user)
cp .env.example .env
# For Homebrew: DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/board_db
# For Docker:   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/board_db

# Generate and run migration
npx drizzle-kit generate
npx tsx src/db/migrate.ts
```

### 4. Run automated tests (19 tests)
```bash
npx vitest run
```
Expected output:
```
 ✓ tests/task.test.ts (9 tests)
 ✓ tests/board.test.ts (4 tests)
 ✓ tests/column.test.ts (6 tests)

 Test Files  3 passed (3)
      Tests  19 passed (19)
```

### 5. Run manual API tests
```bash
# Start the server
npx tsx src/app.ts

# In another terminal, run the manual test script
bash test-manual.sh
```

### 6. Quick curl test (copy-paste)
```bash
# Health check
curl http://localhost:8002/health

# Create a project directly in DB (board service assumes project exists)
PROJ_ID=$(psql -t -A -c "INSERT INTO projects (name, description, workspace_id, owner_id) VALUES ('Test', 'Test', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001') RETURNING id;" board_db | tr -d '[:space:]')
echo "Project: $PROJ_ID"

# Initialize board (4 default columns)
curl -s -X POST "http://localhost:8002/api/board/init/$PROJ_ID" | python3 -m json.tool

# Get columns
curl -s "http://localhost:8002/api/board/columns/$PROJ_ID" | python3 -m json.tool

# Create a task (replace COLUMN_ID with actual column UUID from above)
curl -s -X POST http://localhost:8002/api/board/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Task","columnId":"COLUMN_ID","creatorId":"user-1"}' | python3 -m json.tool
```

---

## Frontend Integration Notes

The frontend `WorkspacePage.tsx` currently uses:
- `taskService.getTasks(workspaceId)` — needs to change to `getTasksByProject(projectId)`
- `taskService.createTask(data)` — needs `columnId` and `creatorId` instead of `workspaceId`
- `taskService.moveTask(id, status)` — needs to call `/move` endpoint with `columnId` and `order`
- Column definitions are hardcoded in frontend — should come from API

The frontend has 3 columns (Todo, In Progress, Done). The backend now has 4 (Backlog, In Progress, In Review, Done). The frontend will need to be updated to match.
