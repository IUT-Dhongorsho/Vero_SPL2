# VERO — 3-Person Team Workflow

> Generated: 2026-07-17
> Team size: 3 members
> Strategy: Backend-first, parallel tracks, zero file overlap

---

## 1. Core Strategy: Backend First, Then Frontend

**Why backend first?**
Every frontend page currently uses mock data. Writing more frontend code without real APIs is wasted effort — you'll just rip out the mocks later. The correct order:

```
Phase 0: Shared types + API contracts (1 day, all 3 together)
Phase 1: Backend services (parallel, 3 people) + minimal frontend wiring
Phase 2: Frontend integration (connect everything to real backends)
Phase 3: Cross-module features (checklist↔task sync, notifications, search)
Phase 4: AI, polish, infrastructure
```

**The golden rule:** No one touches another person's files. Ever. If you need something from another person's domain, you ask for it via the API contract, not by editing their code.

---

## 2. The 3 Roles

### Person A — Backend Foundation
**Owns:** shared types, project-service, board-service, Docker Compose, Redis/PostgreSQL setup

**Why this person goes first:** Project Service and Board Service are the backbone. Everything else (notes, meet, frontend) depends on workspace/project/task CRUD existing.

**Files owned (DO NOT edit these unless you are Person A):**
```
code/packages/shared/src/**           → shared TypeScript types
code/services/project-service/**      → workspace/project/module/member CRUD
code/services/board-service/**        → column/task CRUD + Socket.io real-time
code/infra/docker/**                  → Docker Compose configs
```

### Person B — Backend Collaboration
**Owns:** notes-service, meet-service, chat-service, ai-worker

**Why this person is parallel:** These services are independent. They communicate with other services via Redis Pub/Sub events, not direct API calls. They only need shared types from Person A (Phase 0).

**Files owned (DO NOT edit these unless you are Person B):**
```
code/services/notes-service/**        → Yjs CRDT, documents, slash commands backend
code/services/meet-service/**         → mediasoup SFU, WebRTC signaling, rooms
code/services/chat-service/**         → channels, messages, real-time chat
code/ai-worker/**                     → Gemini task extraction, Whisper transcription
```

### Person C — Frontend & Integration
**Owns:** All UI stores, hooks, services, pages, components

**Why this person starts slightly later:** Frontend needs API contracts (from Phase 0) before it can connect to real backends. But this person can still refactor components, clean up dead code, and build new UI while waiting.

**Files owned (DO NOT edit these unless you are Person C):**
```
code/apps/ui/src/stores/**            → Zustand stores (board, notes, meet)
code/apps/ui/src/hooks/**             → useWebRTC, useYjs, useSocket, etc.
code/apps/ui/src/services/**          → API service functions (replace mocks)
code/apps/ui/src/pages/**             → All page components
code/apps/ui/src/components/**        → All UI components
code/apps/ui/src/utils/**             → Utilities, apiClient
```

---

## 3. Phase 0 — API Contracts & Shared Types (Day 1)

**All 3 people meet. This is the ONLY time everyone edits the same area.**

**What happens:**
1. Person A defines shared TypeScript interfaces in `packages/shared/src/types/`
2. Person B and C review and agree on the shapes
3. Person C defines what API endpoints the frontend needs
4. Person A and B agree on which endpoints each service exposes

**Deliverable:** A complete API contract document + shared types package.

### Shared Types to Define

```typescript
// packages/shared/src/types/

// Workspace & Project
Workspace    { id, name, description, ownerId, createdAt, updatedAt }
Project      { id, name, description, workspaceId, ownerId, visibility, createdAt }
Module       { id, projectId, name, type: 'notes'|'board'|'meet', resourceId }
Member       { id, userId, workspaceId?, projectId?, role: 'admin'|'manager'|'member' }

// Board
Column       { id, name, order, projectId }
Task         { id, title, description, columnId, order, assigneeId, creatorId,
               dueDate, priority: 'low'|'medium'|'high'|'urgent',
               status, labels: string[], createdAt, updatedAt }

// Notes
Document     { id, title, workspaceId, projectId, createdBy, createdAt, updatedAt }
DocumentBlock { id, documentId, blockId, type, content, order }

// Meet
Room         { id, projectId, title, createdBy, isActive, startedAt, endedAt }
Peer         { id, roomId, userId, displayName, isActive, joinedAt }

// Chat
Channel      { id, name, type: 'direct'|'group'|'public', workspaceId }
Message      { id, channelId, senderId, content, isEdited, createdAt }

// Notifications
Notification { id, userId, type, entityType, entityId, title, body, isRead, createdAt }

// Events (Redis Pub/Sub)
EventType    'USER_CREATED'|'USER_DELETED'|'TASK_CREATED'|'TASK_UPDATED'|
             'DOCUMENT_UPDATED'|'ROOM_CREATED'|'MESSAGE_SENT'|...
```

### API Endpoint Contracts

**Project Service (port 8004):**
```
POST   /api/workspaces                    → Create workspace
GET    /api/workspaces                    → List user's workspaces
GET    /api/workspaces/:id                → Get workspace
PATCH  /api/workspaces/:id                → Update workspace
DELETE /api/workspaces/:id                → Delete workspace

POST   /api/workspaces/:wid/projects      → Create project
GET    /api/workspaces/:wid/projects      → List projects in workspace
GET    /api/projects/:id                  → Get project with modules
PATCH  /api/projects/:id                  → Update project
DELETE /api/projects/:id                  → Delete project

POST   /api/projects/:pid/modules         → Create module (notes/board/meet)
GET    /api/projects/:pid/modules         → List modules
DELETE /api/modules/:id                   → Delete module

POST   /api/workspaces/:wid/members       → Add member
GET    /api/workspaces/:wid/members       → List members
DELETE /api/workspaces/:wid/members/:uid  → Remove member
PATCH  /api/workspaces/:wid/members/:uid  → Update role
```

**Board Service (port 8002):**
```
POST   /api/projects/:pid/columns         → Create column
GET    /api/projects/:pid/columns         → List columns (with tasks)
PATCH  /api/columns/:id                   → Update column (rename, reorder)
DELETE /api/columns/:id                   → Delete column

POST   /api/columns/:cid/tasks            → Create task
GET    /api/columns/:cid/tasks            → List tasks in column
GET    /api/projects/:pid/tasks           → List all tasks in project
GET    /api/tasks/:id                     → Get task detail
PATCH  /api/tasks/:id                     → Update task
DELETE /api/tasks/:id                     → Delete task
PATCH  /api/tasks/:id/move                → Move task (column + order)

WebSocket /ws/board                       → Real-time task updates
```

**Notes Service (port 8003):**
```
POST   /api/documents                     → Create document
GET    /api/documents                     → List documents (by project/workspace)
GET    /api/documents/:id                 → Get document with blocks
PATCH  /api/documents/:id                 → Update title/metadata
DELETE /api/documents/:id                 → Delete document

WebSocket /ws/yjs/:documentId             → Yjs CRDT sync + awareness
```

**Meet Service (port 8004 — check actual port):**
```
POST   /api/rooms                         → Create room
GET    /api/rooms/:id                     → Get room info
POST   /api/rooms/:id/join                → Join room
POST   /api/rooms/:id/leave               → Leave room
POST   /api/rooms/:id/end                 → End room

WebSocket /ws/meet/:roomId                → WebRTC signaling
```

**Chat Service (port 8005):**
```
POST   /api/channels                      → Create channel
GET    /api/channels                      → List channels
GET    /api/channels/:id                  → Get channel with messages
POST   /api/channels/:id/messages         → Send message
GET    /api/channels/:id/messages         → List messages (paginated)
PATCH  /api/messages/:id                  → Edit message
DELETE /api/messages/:id                  → Delete message

WebSocket /ws/chat                        → Real-time messaging
```

**Frontend API calls (what Person C needs):**
```
authService.ts        → Already wired to port 8001 ✓
projectService.ts     → Calls project-service (port 8004)
workspaceService.ts   → Calls project-service (port 8004) for workspace CRUD
taskService.ts        → Calls board-service (port 8002)
memberService.ts      → Calls project-service (port 8004)
notesService.ts       → NEW — calls notes-service (port 8003)
meetService.ts        → NEW — calls meet-service
chatService.ts        → NEW — calls chat-service (port 8005)
```

---

## 4. Phase 1 — Parallel Backend Build (Weeks 1-2)

Everyone works simultaneously on their own files. No overlap.

### Person A's Week 1-2

**Day 1-2: Docker Compose + Dev Environment**
```
Write: code/infra/docker/docker-compose.dev.yml
  - PostgreSQL (port 5432) with databases for each service
  - Redis (port 6379)
  - All 6 services with hot-reload
  - Health checks
Write: code/infra/docker/docker-compose.yml (production)
```

**Day 2-4: Project Service Implementation**
```
Implement: code/services/project-service/src/services/workspace.service.ts
  - createWorkspace, getWorkspaces, updateWorkspace, deleteWorkspace
Implement: code/services/project-service/src/services/project.service.ts
  - createProject, getProjects, getProject, updateProject, deleteProject
Implement: code/services/project-service/src/services/module.service.ts
  - createModule, getModules, deleteModule
Implement: code/services/project-service/src/services/member.service.ts
  - addMember, getMembers, removeMember, updateRole
Implement: code/services/project-service/src/controllers/*.ts
  - Wire controllers to services
Implement: code/services/project-service/src/routes/*.ts
  - Wire routes to controllers
Implement: code/services/project-service/src/middleware/auth.ts
  - JWT verification using internal /api/internal/verify endpoint
Wire: code/services/project-service/src/app.ts
  - Mount all routes
Test: Postman/curl all endpoints
```

**Day 5-7: Board Service Implementation**
```
Implement: code/services/board-service/src/services/workspace.service.ts
Implement: code/services/board-service/src/services/project.service.ts
Implement: code/services/board-service/src/services/task.service.ts
  - createTask, getTasks, updateTask, deleteTask, moveTask
Implement: code/services/board-service/src/services/member.service.ts
Implement: code/services/board-service/src/controllers/*.ts
Implement: code/services/board-service/src/routes/*.ts
Implement: code/services/board-service/src/middleware/auth.ts
Implement: Socket.io real-time in app.ts
  - On task created/updated/deleted → broadcast to project room
Wire: code/services/board-service/src/app.ts
Test: Full CRUD + WebSocket broadcasts
```

**Day 8-10: Integration Testing (A's own services)**
```
Write: code/services/project-service/tests/unit/*.test.ts
Write: code/services/board-service/tests/unit/*.test.ts
Write: code/services/project-service/tests/integration/*.test.ts
Write: code/services/board-service/tests/integration/*.test.ts
Run: docker-compose up → test all endpoints end-to-end
```

### Person B's Week 1-2

**Day 1-3: Notes Service**
```
Write DB migration: code/services/notes-service/src/db/migrations/
  - documents table (id, title, projectId, workspaceId, createdBy, timestamps)
  - document_blocks table (for non-CRDT metadata)
Implement: code/services/notes-service/src/services/document.service.ts
  - createDocument, getDocuments, getDocument, updateDocument, deleteDocument
Implement: code/services/notes-service/src/services/crdt.service.ts
  - Yjs document initialization, persistence to PostgreSQL
Implement: code/services/notes-service/src/services/awareness.service.ts
  - Cursor/selection tracking per user
Implement: code/services/notes-service/src/ws/yjs-server.ts
  - WebSocket server for Yjs sync (using y-websocket protocol)
Implement: code/services/notes-service/src/ws/awareness-handler.ts
Implement: code/services/notes-service/src/controllers/document.controller.ts
Implement: code/services/notes-service/src/routes/document.routes.ts
Implement: code/services/notes-service/src/middleware/auth.ts
Wire: code/services/notes-service/src/app.ts
  - HTTP routes + Yjs WebSocket server on same Express app
Test: Create document → connect WebSocket → edit → verify persistence
```

**Day 4-6: Meet Service (SFU + Signaling)**
```
Write: code/services/meet-service/package.json
  - mediasoup, socket.io, express, etc.
Implement: code/services/meet-service/src/sfu/worker.ts
  - Create mediasoup worker with CPU cores
Implement: code/services/meet-service/src/sfu/router.ts
  - Create router with media codecs
Implement: code/services/meet-service/src/sfu/transport.ts
  - Create WebRTC transports (send/receive)
Implement: code/services/meet-service/src/sfu/producer-consumer.ts
  - Handle produce/consume for audio/video/screen
Implement: code/services/meet-service/src/services/room.service.ts
  - createRoom, joinRoom, leaveRoom, endRoom
Implement: code/services/meet-service/src/services/signal.service.ts
  - WebRTC signaling (offer/answer/ice-candidate via WebSocket)
Implement: code/services/meet-service/src/services/sfu.service.ts
  - Orchestrate mediasoup operations
Implement: code/services/meet-service/src/ws/ws-server.ts
  - WebSocket server for signaling
Implement: code/services/meet-service/src/ws/message-router.ts
  - Route WebSocket messages to appropriate handlers
Implement: code/services/meet-service/src/controllers/*.ts
Implement: code/services/meet-service/src/routes/room.routes.ts
Wire: code/services/meet-service/src/app.ts
Test: Create room → join → verify mediasoup transport creation
```

**Day 7-8: Chat Service**
```
Implement: code/services/chat-service/src/services/channel.service.ts
  - createChannel, getChannels, getChannel, addMember
Implement: code/services/chat-service/src/services/message.service.ts
  - sendMessage, getMessages, editMessage, deleteMessage
Implement: code/services/chat-service/src/ws/socket-server.ts
  - Socket.io with Redis adapter for multi-instance
Implement: code/services/chat-service/src/ws/handlers/*.ts
  - connection, message, receipt, typing handlers
Implement: code/services/chat-service/src/ws/emitters/*.ts
Implement: code/services/chat-service/src/controllers/*.ts
Implement: code/services/chat-service/src/routes/*.ts
Wire: code/services/chat-service/src/app.ts
Test: Create channel → send message → verify real-time delivery
```

**Day 9-10: Integration Testing (B's own services)**
```
Write: code/services/notes-service/tests/unit/*.test.ts
Write: code/services/meet-service/tests/unit/*.test.ts
Write: code/services/chat-service/tests/unit/*.test.ts
Write: code/services/notes-service/tests/integration/*.test.ts
Test: Yjs sync between two browser tabs
Test: mediasoup worker creation + transport lifecycle
```

### Person C's Week 1-2

**Day 1-2: Clean Up + Prepare**
```
Delete dead code (unused components that duplicate page implementations):
  - Review code/apps/ui/src/components/board/ vs WorkspacePage inline Kanban
  - Review code/apps/ui/src/components/notes/ vs NotesPage inline TipTap
  - Review code/apps/ui/src/components/meet/ vs MeetPage inline implementation
  - Keep the BETTER version, delete the other
  - Decision: keep page-inline versions (they're what's actually rendered)

Refactor apiClient.ts:
  - Ensure it's ready to point to all service ports
  - Add request/response interceptors for logging
```

**Day 3-5: Zustand Stores (write using API contract shapes, not mocks)**
```
Implement: code/apps/ui/src/stores/board.store.ts
  - columns: Column[], tasks: Task[]
  - fetchColumns(projectId), createColumn, updateColumn, deleteColumn
  - fetchTasks(projectId), createTask, updateTask, deleteTask, moveTask
  - subscribeToUpdates(projectId) — Socket.io listener

Implement: code/apps/ui/src/stores/notes.store.ts
  - documents: Document[], activeDocument: Document | null
  - fetchDocuments(projectId), createDocument, deleteDocument
  - setActiveDocument(id)

Implement: code/apps/ui/src/stores/meet.store.ts
  - rooms: Room[], activeRoom: Room | null, peers: Peer[]
  - fetchRooms(projectId), createRoom, joinRoom, leaveRoom, endRoom

Implement: code/apps/ui/src/stores/navigationStore.ts (expand)
  - currentWorkspace, currentProject, currentModule
```

**Day 5-7: Hooks**
```
Implement: code/apps/ui/src/hooks/useSocket.ts
  - Initialize Socket.io connection to board-service
  - Join project room, listen for task/column updates
  - Return socket instance + connected status

Implement: code/apps/ui/src/hooks/useNotifications.ts (fix — currently empty)
  - Connect to notification-service Socket.io
  - Listen for notification events
  - Mark as read, delete

Implement: code/apps/ui/src/hooks/useAuth.ts (fix — currently empty)
  - Wrapper around auth store + Better-Auth session
  - Auto-refresh token
```

**Day 8-10: API Service Functions (replace mocks)**
```
Rewrite: code/apps/ui/src/services/projectService.ts
  - Replace all setTimeout mocks with real axios calls to project-service
  - createWorkspace, getWorkspaces, createProject, getProjects, etc.

Rewrite: code/apps/ui/src/services/workspaceService.ts
  - Merge into projectService or keep separate — decide based on API contracts

Rewrite: code/apps/ui/src/services/taskService.ts
  - Replace mocks with real axios calls to board-service
  - createTask, getTasks, updateTask, deleteTask, moveTask

Rewrite: code/apps/ui/src/services/memberService.ts
  - Replace mocks with real calls to project-service member endpoints
```

---

## 5. Phase 2 — Frontend Integration (Week 3)

By now Person A's services are running, Person B's services are running. Person C connects everything.

### Person C's Week 3

**Day 1-2: Dashboard & Project Pages**
```
Update: code/apps/ui/src/pages/DashboardPage.tsx
  - Already calls projectService — just verify it works with real backend
  - Fix any API response shape mismatches

Update: code/apps/ui/src/pages/ProjectPage.tsx
  - Verify workspace listing works with real backend
  - Verify create workspace modal works
```

**Day 3-4: Workspace/Kanban Page**
```
Update: code/apps/ui/src/pages/WorkspacePage.tsx
  - Replace inline state with board.store
  - Use useSocket hook for real-time updates
  - Verify drag-and-drop sends real API calls (PATCH /api/tasks/:id/move)
  - Verify new task creation hits real backend
  - Verify column CRUD hits real backend
```

**Day 5-6: Notes Page**
```
Update: code/apps/ui/src/pages/notes/NotesPage.tsx
  - Replace mock document list with notes.store fetchDocuments()
  - Connect TipTap editor to Yjs WebSocket (useYjs hook)
  - Verify: create document → edit → changes persist → reload → still there

Implement: code/apps/ui/src/hooks/useYjs.ts
  - Connect to Yjs WebSocket server (notes-service port 8003)
  - Initialize Yjs document, bind to TipTap editor
  - Handle awareness (cursors)

Implement: code/apps/ui/src/hooks/useMediaDevices.ts
  - Enumerate cameras/microphones
  - Used by MeetPage
```

**Day 7: Meet Page (basic)**
```
Update: code/apps/ui/src/pages/meet/MeetPage.tsx
  - Replace simulated participants with real room management
  - Connect to meet-service WebSocket for signaling
  - Basic: create room → join → show local video → show remote videos

Implement: code/apps/ui/src/hooks/useWebRTC.ts
  - Create mediasoup device
  - Create send/receive transports
  - Produce local audio/video
  - Consume remote streams
  - Handle screen sharing toggle
```

**Day 8: Settings + Remaining Pages**
```
Update: code/apps/ui/src/pages/SettingsPage.tsx tabs
  - ProfileTab: call real auth service profile endpoint
  - MembersTab: call real memberService (project-service)
  - WorkspaceTab: call real workspaceService

Update: code/apps/ui/src/pages/TasksPage.tsx
  - Replace mock data with board.store
  - Show tasks from all columns across projects

Update: code/apps/ui/src/pages/CalendarPage.tsx
  - Fetch tasks with due dates from board service
  - Fetch meet schedules from meet service
  - Render real events on calendar
```

**Day 9-10: Smoke Testing**
```
Test full flow:
  1. Login → Dashboard shows real projects
  2. Create workspace → appears in list
  3. Create project → appears in workspace
  4. Open project → Kanban board loads
  5. Create column → appears
  6. Create task → appears in column
  7. Drag task to another column → order updates
  8. Create note document → opens editor
  9. Type in editor → persists on reload
  10. Create meet room → joins → video appears
```

### Person A's Week 3

**While C integrates, A does:**
```
- Fix any bugs C reports from integration testing
- Add RBAC middleware to project-service (check role before write operations)
- Write proper error responses (consistent error shape across services)
- Add request validation (Zod schemas for all endpoints)
- Write integration tests for board-service + project-service together
- Handle edge cases: delete project → cascade delete columns/tasks/modules
```

### Person B's Week 3

**While C integrates, B does:**
```
- Fix any bugs C reports from notes/meet/chat services
- Implement Redis persistence for Yjs documents (survive server restart)
- Add proper error handling to mediasoup operations
- Write integration tests for notes-service + Yjs sync
- Test meet-service with actual browsers (WebRTC is browser-dependent)
- Implement chat message receipts (delivered/read status)
```

---

## 6. Phase 3 — Cross-Module Features (Week 4)

This is where services need to talk to each other. Still no file overlap — each person works in their own service, using Redis Pub/Sub events.

### The Checklist ↔ Task Sync (FR-15) — Person B + Person C

**How it works without file overlap:**

Person B (backend):
```
In notes-service:
  - When a checklist item is created/updated/deleted in a document
  - Publish Redis event: CHECKLIST_ITEM_CREATED, CHECKLIST_ITEM_UPDATED, CHECKLIST_ITEM_DELETED
  - Payload: { documentId, itemId, text, isChecked, projectId }

In board-service (Person A handles):
  - Subscribe to CHECKLIST_ITEM_* events
  - Create/update/delete corresponding tasks in the board
  - When task status changes → publish TASK_UPDATED event

In notes-service:
  - Subscribe to TASK_UPDATED events
  - Update checklist item checked status in the document
```

Person A (backend):
```
In board-service:
  - Add Redis subscriber for CHECKLIST_ITEM_* events
  - Implement sync logic in task.service.ts
  - Publish TASK_UPDATED when checklist triggers task changes
```

Person C (frontend):
```
In useYjs.ts:
  - When checklist item changes in TipTap → Yjs updates → WebSocket sends to server
  - Server handles the rest (backend sync)

In board store:
  - Listen for Socket.io task updates (from checklist sync)
  - Update UI in real-time

No need to write sync logic in frontend — it's all backend events.
```

### Notifications Integration — Person A + Person B + Person C

Person A (board-service):
```
After task created/updated/deleted → publish to Redis:
  notification-service subscribes and creates notifications
```

Person B (notes-service + meet-service):
```
After document shared/room created → publish to Redis
  notification-service subscribes
```

Person C (frontend):
```
notification.store.ts already has WebSocket integration
Just verify notifications arrive from all services
```

### Global Search — Person C

```
Implement: code/apps/ui/src/components/workspace/GlobalSearch.tsx
  - Calls a search endpoint that queries across services
  - Person A adds: GET /api/search?q=... to project-service
    (aggregates results from its own DB + calls board/notes services)
```

---

## 7. Phase 4 — AI, Polish, Infrastructure (Weeks 5-6)

### Person B: AI Worker
```
Implement: code/ai-worker/src/services/gemini.service.ts
  - Task extraction from text
  - Meeting summarization
Implement: code/ai-worker/src/services/whisper.service.ts
  - Audio transcription
Implement: code/ai-worker/src/jobs/*.ts
  - Job queue processing (BullMQ)
Wire: code/ai-worker/src/worker.ts
Test with real Gemini API key
```

### Person A: Infrastructure & Deployment
```
Write: All Dockerfiles (currently 0 bytes)
Write: code/infra/nginx/nginx.conf
  - Reverse proxy: /api/auth → :8001, /api/board → :8002, etc.
Write: code/infra/prometheus/prometheus.yml
Write: code/infra/docker/docker-compose.yml (production)
  - All services + PostgreSQL + Redis + Nginx
Write: .github/workflows/ci.yml
  - Lint → Type Check → Test → Build → Deploy
```

### Person C: Polish & New UI
```
Build: GlobalSearch component with real search API
Build: File upload/download page (if file service exists)
Polish: Loading states, error states, empty states for all pages
Polish: Mobile responsiveness
Build: ForgotPassword real flow (connect to auth service)
```

---

## 8. Git Workflow — Preventing Merge Conflicts

### Branch Strategy

```
main                          ← production-ready code
├── develop                   ← integration branch (merges from feature branches)
│   ├── feat/shared-types     ← Person A (Phase 0)
│   ├── feat/project-service  ← Person A
│   ├── feat/board-service    ← Person A
│   ├── feat/docker-setup     ← Person A
│   ├── feat/notes-service    ← Person B
│   ├── feat/meet-service     ← Person B
│   ├── feat/chat-service     ← Person B
│   ├── feat/ai-worker        ← Person B
│   ├── feat/frontend-stores  ← Person C
│   ├── feat/frontend-hooks   ← Person C
│   ├── feat/frontend-api     ← Person C
│   ├── feat/frontend-pages   ← Person C
│   └── feat/infra-deploy     ← Person A (Phase 4)
```

### Rules

1. **Never commit directly to `develop` or `main`**
2. **Each feature branch is owned by one person only**
3. **Before starting work, pull latest `develop` into your feature branch**
4. **When done, create PR → another person reviews → merge to `develop`**
5. **If two people need to edit the same file → STOP. Re-negotiate ownership.**

### Commit Convention

```
feat(board-service): implement task CRUD endpoints
fix(notes-service): Yjs persistence on server restart
feat(frontend): connect WorkspacePage to board service API
refactor(project-service): extract validation to middleware
test(board-service): add unit tests for task.service
```

### PR Review Assignments

| PR Author | Reviewer | Why |
|-----------|----------|-----|
| Person A | Person B or C | Fresh eyes catch integration issues |
| Person B | Person A or C | Same |
| Person C | Person A or B | Same |

---

## 9. Testing Strategy

### Level 1: Unit Tests (Each person writes for their own service)

**Person A:**
```
project-service/tests/unit/
  - workspace.service.test.ts    (CRUD operations)
  - project.service.test.ts
  - module.service.test.ts
  - member.service.test.ts
  - auth.middleware.test.ts      (JWT verification)

board-service/tests/unit/
  - task.service.test.ts
  - workspace.service.test.ts
  - bidisync.service.test.ts     (checklist↔task sync)
```

**Person B:**
```
notes-service/tests/unit/
  - document.service.test.ts
  - crdt.service.test.ts         (Yjs document operations)
  - awareness.service.test.ts

meet-service/tests/unit/
  - room.service.test.ts
  - sfu.service.test.ts          (mediasoup mock)

chat-service/tests/unit/
  - channel.service.test.ts
  - message.service.test.ts
  - presence.store.test.ts

ai-worker/tests/unit/
  - gemini.service.test.ts
  - whisper.service.test.ts
```

**Person C:**
```
Frontend doesn't have traditional unit tests yet, but:
  - Test Zustand stores in isolation (mock API calls)
  - Test hooks with React Testing Library
  - Test utility functions (dateUtils, cn)
```

### Level 2: Integration Tests (Each person tests their service end-to-end)

**Person A:**
```
project-service/tests/integration/
  - workspace-flow.test.ts       (create workspace → add member → create project)
  - rbac.test.ts                 (admin can create, member cannot)

board-service/tests/integration/
  - task-lifecycle.test.ts       (create → update → move → delete)
  - realtime.test.ts             (WebSocket broadcast verification)
```

**Person B:**
```
notes-service/tests/integration/
  - document-crud.test.ts
  - yjs-sync.test.ts             (two connections, verify sync)
  - persistence.test.ts          (create → restart server → verify data survives)

meet-service/tests/integration/
  - room-lifecycle.test.ts       (create → join → leave → end)
  - sfu-transport.test.ts        (mock mediasoup, verify transport flow)

chat-service/tests/integration/
  - message-flow.test.ts         (send → receive → read receipt)
  - realtime.test.ts
```

### Level 3: Cross-Person Testing (The "Double Check")

After each phase, **the person who did NOT build it tests it:**

| What | Tested By | How |
|------|-----------|-----|
| Project Service APIs | Person B or C | Run service, hit all endpoints with curl/Postman |
| Board Service APIs + WebSocket | Person B or C | Create task via API, verify WebSocket broadcast |
| Notes Yjs sync | Person A or C | Open two browser tabs, type in one, see in other |
| Meet SFU | Person A or C | Join room, verify mediasoup creates transports |
| Frontend integration | Person A or B | Use the app, click through all flows, report bugs |

**Integration test day (end of each week):**
```
All 3 people sit together (or screen share)
Run: docker-compose up (all services)
Person A logs in → creates workspace → project → columns → tasks
Person B opens same project → creates notes → edits simultaneously with A
Person C opens meet room → A and B join → verify video/audio
All 3 verify notifications appear in real-time
Document any bugs → assign to owner → fix before next week
```

### Level 4: Acceptance Testing (End of project)

```
Full user flow test:
  1. New user signs up
  2. Creates workspace, invites 2 members
  3. Creates project with notes, board, and meet modules
  4. Creates notes document, types content with slash commands
  5. Creates checklist in notes → appears as tasks on board
  6. Drags tasks between columns
  7. Starts meet call, all 3 join, share screen
  8. Transcription runs after call ends
  9. AI extracts tasks from meeting transcript
  10. Notifications appear for all actions
  11. Global search finds content across all modules
  12. Settings: update profile, manage members, delete workspace
```

---

## 10. Daily Communication Protocol

### Standup (10 min, every day)
Each person answers:
1. What did I finish yesterday?
2. What am I working on today?
3. Am I blocked on anything?

### Blockers
If blocked on another person's work:
- **Don't wait.** Use the API contract (Phase 0) to continue your work with mock responses temporarily.
- **Don't edit their files.** Leave a comment in the PR or a message in chat.
- **Escalate if blocker lasts > 1 day.**

### Code Review Turnaround
- PRs should be reviewed within **same day**
- Maximum **2 rounds of review** before merging
- If disagreement → discuss in standup, make a decision, move on

---

## 11. Timeline Summary

```
Week 0 (Day 1):   Phase 0 — API contracts + shared types (ALL 3)
Week 1-2:         Phase 1 — Backend services (A: project+board, B: notes+meet+chat, C: frontend prep)
Week 3:           Phase 2 — Frontend integration (C connects, A+B fix bugs)
Week 4:           Phase 3 — Cross-module features (checklist sync, notifications, search)
Week 5-6:         Phase 4 — AI, infrastructure, polish
Week 7:           Acceptance testing + bug fixes
```

### Responsibility Matrix (RACI)

| Task | Person A | Person B | Person C |
|------|----------|----------|----------|
| Shared types | **R** | C | C |
| Docker Compose | **R** | I | I |
| Project Service | **R** | I | I |
| Board Service | **R** | I | I |
| Notes Service | I | **R** | I |
| Meet Service | I | **R** | I |
| Chat Service | I | **R** | I |
| AI Worker | I | **R** | I |
| Zustand Stores | I | I | **R** |
| Hooks | I | I | **R** |
| API Services | I | I | **R** |
| Page Integration | I | I | **R** |
| RBAC | **R** | C | I |
| CI/CD | **R** | I | I |
| Nginx | **R** | I | I |
| Acceptance Testing | C | C | **R** |

R = Responsible, A = Accountable (project lead), C = Consulted, I = Informed

---

## 12. File Ownership Enforcement

To prevent accidental overlaps, use **CODEOWNERS** file:

```
# .github/CODEOWNERS

# Person A — Backend Foundation
/packages/shared/          @person-a
/services/project-service/ @person-a
/services/board-service/   @person-a
/infra/                    @person-a

# Person B — Backend Collaboration
/services/notes-service/   @person-b
/services/meet-service/    @person-b
/services/chat-service/    @person-b
/ai-worker/                @person-b

# Person C — Frontend
/apps/ui/                  @person-c
```

GitHub will automatically request review from the code owner when someone touches their files.

---

*This workflow ensures zero file overlap, clear ownership, and systematic testing at every level.*
