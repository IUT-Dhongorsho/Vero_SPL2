# VERO — Project Completion Plan

> Generated: 2026-07-17
> Repository branch: `client/ui`

---

## 1. Executive Summary

VERO is a productivity management platform combining documentation (Notion-style), video meetings (WebRTC), Kanban boards, calendar, and to-do lists — organized in a Workspace → Project → Module hierarchy. The project has a solid **monorepo skeleton** and **partial frontend UI**, but most backend services are shells and most frontend pages still use **mock data**. Estimated overall completion: **~25%**.

| Layer | Completion | Notes |
|-------|-----------|-------|
| Monorepo & Tooling | 95% | pnpm + Turborepo working, minor gaps (empty .nvmrc, empty shared package) |
| UI — Auth & Layout | 90% | Login, Signup, OAuth callback, Sidebar, TopBar all functional |
| UI — Core Pages | 30% | Pages exist but most use mock data, not connected to real backends |
| UI — State & Hooks | 15% | Only auth store works; board/notes/meet stores and all hooks are empty |
| Auth Service | 90% | Full Better-Auth + JWT + social login + Redis Pub/Sub |
| Board Service | 10% | DB schema done, all routes/services empty |
| Notes Service | 5% | Express shell, no Yjs, no document tables, no routes |
| Meet Service | 2% | Files created but every single .ts is empty |
| Project Service | 10% | DB schema done, no visible implementation |
| Chat Service | 10% | DB schema done, no implementation |
| Notification Service | 60% | Schema + Socket.io server done, delivery logic partial |
| AI Worker | 0% | Empty package.json placeholder |
| Infrastructure | 5% | Config files exist but all Docker/Nginx/Prometheus are empty |
| Desktop App | 15% | Electron scaffold with IPC stubs |
| Shared Package | 0% | Empty src/index.ts |

---

## 2. What's Done — Detailed Breakdown

### 2.1 Frontend (code/apps/ui/)

**Fully functional:**
- Landing page with animations (Framer Motion)
- Login / Signup with email + Google + GitHub OAuth
- Auth callback handling (Better-Auth session → JWT extraction)
- Dashboard with project grid (API wired but service returns mocks)
- Project page with workspace listing + create workspace modal
- Workspace page with inline Kanban board (full drag-and-drop via @dnd-kit)
- Settings page (5 tabs: Profile, Workspace, Members, Billing, Danger Zone)
- Layout system: Sidebar navigation, TopBar, PageContainer
- Theme system: Light/dark mode with persistence
- Notification dropdown with WebSocket integration
- Toast system (react-hot-toast)
- API client with auth interceptor + 401 handling
- Basic routing with protected routes

**UI exists but uses mock data only:**
- Notes page (TipTap editor renders, no backend persistence)
- Tasks page (mock task list with priority filtering)
- Calendar page (full calendar grid, no events)
- Files page (grid/list view, no real files)
- Meet page (entirely simulated, no WebRTC)

**Components built but unused (dead code):**
- KanbanBoard, KanbanColumn, TaskCard, TaskModal (WorkspacePage has inline versions)
- BlockEditor, SlashMenu, Checklist, EmbedBlock, AwarenessCursors (NotesPage has inline TipTap)
- VideoGrid, VideoTile, InCallChat, ParticipantPanel, ControlBar (MeetPage has inline)
- GlobalSearch, Dashboard, ProjectList, MemberPanel

### 2.2 Backend Services

**Auth Service (port 8001) — Nearly Complete:**
- Better-Auth with email/password, GitHub, Google OAuth
- Custom HS256 JWT generation (authToken + refreshToken)
- Redis Pub/Sub for cross-service user/session events
- Drizzle ORM with full schema (user, session, account, verification, jwks)
- Session enrichment endpoint, profile CRUD
- Prometheus metrics, request logging
- Health check endpoint

**Notification Service (port 8006) — Partially Complete:**
- Socket.io server with user room joining
- 5-table schema (notifications, delivery_log, push_subscriptions, scheduled_jobs, users)
- Delivery service skeleton

**Board Service (port 8002) — Schema Only:**
- DB models: workspaces, projects, columns, tasks, workspace_members, users
- Redis subscriber for auth events
- All route and service files are empty

**Project Service (port 8004) — Schema Only:**
- DB models: workspaces, projects, project_members, modules, users
- No implementation files visible

**Chat Service (port 8005) — Schema Only:**
- DB models: channels, channel_members, messages, message_receipts, users

**Notes Service (port 8003) — Bare Shell:**
- Express app with middleware, no routes
- DB schema only has users and sessions — no documents/notes table
- Yjs server file exists but empty

**Meet Service — Fully Empty:**
- Directory structure created with mediasoup SFU layout
- Every .ts file is empty (0 bytes)
- Package.json is empty

### 2.3 Infrastructure

- Docker Compose files exist but are empty
- Nginx config empty
- Prometheus config empty
- Grafana dashboard JSON exists (overview)
- Coturn TURN server config exists
- Redis config exists
- All Dockerfiles are empty (0 bytes)
- K6 load test files empty

---

## 3. What's Missing — Critical Gaps

### 3.1 Frontend Gaps
- [ ] **All Zustand stores** (board, meet, notes) — 0 lines written
- [ ] **All hooks** (useAuth, useSocket, useNotifications, useWebRTC, useYjs, useMediaDevices) — all empty
- [ ] **Real API integration** — 4 of 5 services return mock data
- [ ] **Password reset** — form exists but uses setTimeout mock
- [ ] **Shared package** — no shared types/constants between frontend and backend

### 3.2 Backend Gaps
- [ ] **Board service** — all CRUD routes and business logic
- [ ] **Project service** — workspace/project/module CRUD, member management
- [ ] **Notes service** — Yjs CRDT server, document persistence, real-time sync
- [ ] **Meet service** — mediasoup SFU, WebRTC signaling, room management
- [ ] **Chat service** — message CRUD, channels, real-time messaging
- [ ] **AI Worker** — Gemini task extraction, Whisper transcription
- [ ] **File upload/download** — no service exists
- [ ] **Password reset email flow**

### 3.3 Infrastructure Gaps
- [ ] Docker Compose for local dev
- [ ] Nginx reverse proxy
- [ ] All Dockerfiles
- [ ] Prometheus/Grafana configs
- [ ] CI/CD (GitHub Actions)
- [ ] K6 load tests

---

## 4. Phased Implementation Plan

### Phase 1: Foundation — Backend Services Core (Week 1-2)

**Goal:** Get real data flowing end-to-end. Frontend stops using mocks.

| # | Task | Service | Effort |
|---|------|---------|--------|
| 1.1 | Implement Project Service CRUD (workspace, project, module, member endpoints) | project-service | 2-3 days |
| 1.2 | Implement Board Service CRUD (column, task, workspace endpoints with real-time via Socket.io) | board-service | 2-3 days |
| 1.3 | Create shared types package (shared TypeScript interfaces for Task, Project, Workspace, etc.) | packages/shared | 1 day |
| 1.4 | Connect frontend projectService.ts and workspaceService.ts to real backend APIs | ui | 1 day |
| 1.5 | Connect frontend taskService.ts to real board service API | ui | 1 day |
| 1.6 | Wire up Zustand board store + task management hooks | ui | 1 day |
| 1.7 | Set up Docker Compose (PostgreSQL, Redis, all services) for local dev | infra | 1 day |

**Exit criteria:** User can create workspace → project → columns → tasks with drag-and-drop, all persisted to DB.

---

### Phase 2: Notes & Collaboration (Week 3-4)

**Goal:** Real-time collaborative notes with CRDT sync.

| # | Task | Service | Effort |
|---|------|---------|--------|
| 2.1 | Create notes/documents DB table + document CRUD endpoints | notes-service | 1-2 days |
| 2.2 | Integrate Yjs WebSocket server with persistence (PostgreSQL or file) | notes-service | 2-3 days |
| 2.3 | Implement awareness (cursors, selection) for multi-user editing | notes-service | 1 day |
| 2.4 | Connect frontend NotesPage to real API + Yjs sync | ui | 2 days |
| 2.5 | Implement Zustand notes store + useYjs hook | ui | 1 day |
| 2.6 | Build slash commands (TipTap) — heading, checklist, code block, table, embed | ui | 1-2 days |
| 2.7 | Checklist ↔ Task bidirectional sync (FR-15 signature feature) | notes + board | 2 days |

**Exit criteria:** Multiple users can edit the same note simultaneously with live cursors; checklist items in notes appear as tasks on the board and vice versa.

---

### Phase 3: Meet Module (Week 5-7)

**Goal:** P2P audio/video conferencing with screen sharing and in-call chat.

| # | Task | Service | Effort |
|---|------|---------|--------|
| 3.1 | Implement mediasoup worker + router + transport setup | meet-service | 3-4 days |
| 3.2 | WebSocket signaling server (join/leave room, produce/consume) | meet-service | 2-3 days |
| 3.3 | Room management (create, join, end, participant tracking) | meet-service | 1-2 days |
| 3.4 | Implement useWebRTC hook + meet Zustand store in frontend | ui | 2 days |
| 3.5 | VideoGrid, VideoTile, ControlBar, ParticipantPanel components | ui | 2-3 days |
| 3.6 | Screen sharing | meet-service + ui | 1-2 days |
| 3.7 | In-call chat (text messages during call) | meet-service + ui | 1 day |
| 3.8 | Coturn TURN server setup for NAT traversal | infra | 1 day |

**Exit criteria:** Users can join a room, share audio/video, share screen, chat in-call, and leave. Works across NATs.

---

### Phase 4: Notifications, Search & Polish (Week 8)

**Goal:** Cross-module notifications, global search, and UI polish.

| # | Task | Service | Effort |
|---|------|---------|--------|
| 4.1 | Complete notification delivery logic (in-app + email via nodemailer) | notification-service | 2 days |
| 4.2 | Wire notification triggers from board, notes, meet events | all services | 1 day |
| 4.3 | Implement GlobalSearch across projects, notes, tasks | ui + services | 2 days |
| 4.4 | Real Calendar page (fetch events from tasks + meet schedules) | ui | 1 day |
| 4.5 | Real Tasks page (fetch from board service, with filters) | ui | 1 day |
| 4.6 | Real Files page (file upload/download service) | new service + ui | 2 days |

---

### Phase 5: AI & Automation (Week 9-10)

**Goal:** Smart task extraction and meeting transcription.

| # | Task | Service | Effort |
|---|------|---------|--------|
| 5.1 | AI Worker service setup (Gemini API integration) | ai-worker | 2 days |
| 5.2 | Smart task extraction from notes/meetings text | ai-worker | 2-3 days |
| 5.3 | Whisper API integration for meeting transcription | ai-worker + meet | 2-3 days |
| 5.4 | Auto-generated meeting document from call | ai-worker + notes | 1-2 days |
| 5.5 | Meeting summaries and action items extraction | ai-worker | 1-2 days |

---

### Phase 6: Infrastructure & Deployment (Week 11-12)

**Goal:** Production-ready deployment pipeline.

| # | Task | Effort |
|---|------|--------|
| 6.1 | Complete all Dockerfiles | 1-2 days |
| 6.2 | Docker Compose production config | 1 day |
| 6.3 | Nginx reverse proxy config | 1 day |
| 6.4 | GitHub Actions CI/CD pipeline | 2 days |
| 6.5 | Prometheus + Grafana monitoring | 1 day |
| 6.6 | K6 load testing scripts | 1 day |
| 6.7 | Environment variable management (.env templates) | 0.5 day |

---

### Phase 7: Desktop App & Extras (Week 13+)

| # | Task | Effort |
|---|------|--------|
| 7.1 | Connect Electron IPC handlers to real auth flow | 1-2 days |
| 7.2 | Electron auto-updater | 1 day |
| 7.3 | Offline mode / local caching | 2-3 days |
| 7.4 | RBAC enforcement (Admin/Manager/Member permissions) | 2 days |
| 7.5 | Rate limiting and security hardening | 1-2 days |

---

## 5. Recommended Priority Order

If you need to pick what to work on **right now**, here's the critical path:

```
1. packages/shared          → Define shared types first (unblocks everything)
2. Project Service          → Workspace/Project CRUD (unblocks frontend data flow)
3. Board Service            → Task CRUD + Socket.io (unblocks Kanban)
4. Frontend API wiring      → Replace all mocks with real API calls
5. Notes Service + Yjs      → Core differentiator (collaborative editing)
6. Meet Service             → Most complex piece, start early
7. Docker Compose           → Developers need this to run anything locally
```

---

## 6. Key Technical Decisions Still Open

| Decision | Current State | Recommendation |
|----------|--------------|----------------|
| Database per service vs shared | Each service has its own Drizzle schema | Keep per-service DBs; it's already the pattern |
| Yjs persistence strategy | Not decided | Use y-postgres or y-leveldb;前者更好与现有PostgreSQL集成 |
| Mediasoup vs simple WebRTC | Mediasoup SFU chosen (empty) | Good choice for scalability; stick with it |
| File storage | None | Use S3-compatible (MinIO for dev, S3 for prod) |
| Real-time scope | Socket.io for notifications only | Extend to board (task updates), notes (Yjs), meet (signaling) |
| Shared types strategy | Empty packages/shared | **Do this first** — prevents type drift between frontend and backend |

---

## 7. Risk Areas

1. **Meet module is the hardest piece** — mediasoup SFU + WebRTC + NAT traversal + recording. Budget extra time.
2. **CRDT sync complexity** — Yjs is powerful but the persistence layer, awareness, and undo/redo need careful design.
3. **Checklist ↔ Task sync (FR-15)** — This is the signature feature but introduces tight coupling between notes and board services. Design the event contract carefully.
4. **No tests exist** — Only the auth service has basic tests. Add tests as you build, not after.
5. **Empty hooks/store pattern** — The frontend has the right file structure but zero implementation. This is mechanical work but needs to be done systematically.

---

*This plan is a living document. Update it as phases are completed.*
