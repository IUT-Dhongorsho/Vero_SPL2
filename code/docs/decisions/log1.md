# Vero — Architecture Decision Log

> This log records every structural and architectural decision made during
> the design phase of Vero. Each entry is dated, reasoned, and includes
> alternatives that were considered and rejected. Technology and stack
> choices are documented separately in the environment and setup docs.

---

## Decision 001 — Repository Structure

**Date:** 2026-05-19
**Status:** Locked

### Decision
The repository root acts as the submission container. All source code lives
under `code/` and all faculty submission documents live under `doc/`.
Internal development documentation lives under `code/docs/`.

### Structure
```
vero/                        ← git repository root
├── code/                    ← entire monorepo lives here
│   └── docs/                ← internal dev docs (SRS, DDS, API contracts,
│                               architecture writeups, decision log)
└── doc/                     ← faculty submission documents only
    ├── proposal.pdf
    ├── progress-presentation.*
    ├── final-presentation.*
    └── project-report.pdf
```

### Reasoning
The faculty submission spec requires exact file paths at the repository root.
Nesting source code under `code/` satisfies that requirement while keeping
the monorepo self-contained. The two `doc` directories serve entirely
different audiences — `doc/` is for the assessor, `code/docs/` is for
the development team.

### Alternatives Rejected
- Flat root with source code and submission docs mixed together — makes
  the repository root noisy and risks accidentally submitting wrong files.

---

## Decision 002 — Monorepo Internal Structure

**Date:** 2026-05-19
**Status:** Locked

### Decision
The monorepo uses a flat top-level structure with four peer directories.
No directory is nested under another unless it is exclusively consumed by
that parent.

### Structure
```
code/
├── apps/          ← frontend build targets and shared frontend library
│   ├── web/       ← browser build target
│   ├── desktop/   ← electron desktop build target
│   └── ui/        ← shared React component library (consumed by web + desktop only)
├── packages/      ← shared code that crosses the apps/services boundary
│   ├── shared/    ← types, constants, event payloads (used by both frontend AND backend)
│   └── config/    ← ESLint and TypeScript base configs (used by all workspaces)
├── services/      ← backend microservices
└── ai-worker/     ← async background job worker
```

### Reasoning
`ui/` lives under `apps/` because nothing in `services/` ever imports
a React component, hook, or store. Placing it at the root `packages/`
level would imply it crosses the apps/services boundary, which it does not.

`shared/` lives at root `packages/` because it is imported by both
`apps/ui/` and every service in `services/`. It genuinely crosses the
boundary.

`config/` lives at root `packages/` because ESLint and TypeScript
configs apply to both frontend and backend workspaces.

### Alternatives Rejected
- `ui/` under root `packages/` — incorrect, it has no backend consumers.
- `ui/` under `apps/packages/ui/` — unnecessary extra nesting, the glob
  `apps/*` already captures it.

---

## Decision 003 — Backend Service Internal Structure

**Date:** 2026-05-19
**Status:** Locked

### Decision
Every Express backend service follows the MCS pattern:
Model → Controller → Service.

### Structure (per service)
```
service-name/
└── src/
    ├── models/       ← [M] database schema definitions and query helpers
    ├── controllers/  ← [C] HTTP request/response handlers only, no logic
    ├── services/     ← [S] all business logic, zero Express imports
    ├── routes/       ← mounts controllers onto Express router
    ├── middleware/   ← request validation, rate limiting
    ├── db/
    │   ├── client.ts        ← database connection for this service only
    │   └── migrations/      ← schema migration files
    ├── config/
    │   └── env.ts           ← environment variable parsing, fails fast on missing keys
    └── app.ts               ← Express app setup
```

### Reasoning
Controllers are kept free of business logic so they can be tested in
isolation. Services have no Express imports so they can be called from
Redis subscribers, job queues, or WebSocket handlers — not just HTTP
routes. Models are isolated to their own service's database schema —
no service imports another service's model.

### Alternatives Rejected
- Flat routes folder with logic inline — untestable, unscalable.
- MVC — the View layer does not exist in a JSON API, making it
  semantically wrong for this architecture.

---

## Decision 004 — Microservice Communication Strategy

**Date:** 2026-05-19
**Status:** Locked

### Decision
Services communicate asynchronously via a Redis Pub/Sub event bus.
No service calls another service's REST API directly for internal
cross-service communication.

### Event channels
```
user.created          published by: auth-service
user.updated          published by: auth-service
meeting.started       published by: signaling-service
meeting.ended         published by: signaling-service
peer.joined           published by: signaling-service
note.created          published by: notes-service
checklist.toggled     published by: notes-service
task.assigned         published by: board-service
task.completed        published by: board-service
task.created          published by: board-service / ai-worker
mention.created       published by: notes-service / chat-service
```

### Reasoning
Direct REST calls between services create tight coupling and synchronous
dependency chains — if one service is down, the caller fails too. The
event bus decouples services so each one can fail independently without
cascading failures across the system.

### Alternatives Rejected
- gRPC for inter-service communication — requires proto file setup and
  code generation tooling, adding overhead disproportionate to the
  project timeline.
- REST calls between services — synchronous coupling violates the fault
  isolation requirement (NFR2).

---

## Decision 005 — Cross-Service User Reference Strategy

**Date:** 2026-05-19
**Status:** Locked

### Decision
Each service that needs user display data maintains a local read-only
shadow table, kept eventually consistent through Redis events.

### Contract
`auth-service` publishes the following user fields and no others:
```
id          string (uuid)
name        string
avatarUrl   string | null
publishedAt string (ISO timestamp)
```

### Shadow table (identical in every downstream service)
```
users
  id          uuid     primary key
  name        text     not null
  avatarUrl   text     nullable
  syncedAt    timestamp
```

### Sync flow
```
auth-service publishes user.created / user.updated
      │
      ├──▶ board-service    → upsert into local users shadow table
      ├──▶ notes-service    → upsert into local users shadow table
      ├──▶ chat-service     → upsert into local users shadow table
      └──▶ signaling-service → upsert into local users shadow table
```

### Rules
1. The shadow table is written to ONLY by the Redis subscriber.
   No controller or service method may write to it directly.
2. Only three fields are replicated. Email, password, and verification
   status never leave auth-service.
3. All shadow table writes are upserts — insert on conflict update —
   so event ordering does not cause duplicate rows.

### Reasoning
Services need user display data (name, avatar) inline in queries —
for task assignees, note awareness cursors, chat message senders,
meeting participant panels. Fetching this over HTTP on every render
adds a network round-trip that violates NFR1 (under 200ms latency).
The shadow table turns that into a local JOIN with zero network cost.
The service remains functional even if auth-service is temporarily down.

### Alternatives Rejected
- Soft references (bare UUID only) — frontend must stitch data from
  multiple services on every render, adding latency and coupling.
- Direct cross-database JOINs — not possible across separate Postgres
  instances.

---

## Decision 006 — Application Hierarchy

**Date:** 2026-05-19
**Status:** Locked

### Decision
The application follows a three-level hierarchy:
Workspace → Project → Module.

### Hierarchy tree
```
Workspace
  └── auto-created on user signup
  └── one per user
  └── contains many Projects

      Project  (e.g. "Devsprint")
        └── has many Members (access control boundary)
        └── contains many Modules

            Module  (e.g. "Frontend", "Backend", "DevOps")
              └── user-defined, added as needed
              └── contains five feature areas:
                    ├── Notes      (collaborative rich text documents)
                    ├── Board      (Kanban task management)
                    ├── Chat       (real-time messaging)
                    ├── Meet       (video conferencing)
                    └── Resources  (files and links)
```

### Access control model
```
Workspace level  →  belongs to one user, no membership concept
Project level    →  membership lives here (Admin | Manager | Member)
                    all project members see all modules by default
Module level     →  no access control in v1, inherited from project
```

### Reasoning
One workspace per user keeps onboarding trivial — no workspace setup
step, no invite required to get started. Collaboration happens at the
Project level, which is the natural boundary for a team working on a
shared goal. Modules are subdivisions of that goal, not separate
collaboration contexts. Restricting access at the module level is a
future concern, not in scope for this semester.

### Alternatives Rejected
- Multiple workspaces per user — adds onboarding friction and
  complicates the access model for no benefit in v1.
- Access control at the Module level — too granular for the current
  team size and timeline.
- Access control at the Workspace level — too coarse, prevents
  inviting collaborators to a single project.

---

## Decision 007 — Module Feature Scope

**Date:** 2026-05-19
**Status:** Locked

### Decision
Every Module contains exactly five features. Features are not optional
per module in v1 — every module gets all five.

### Feature map
```
Module
  ├── Notes
  │     └── Rich text block editor with CRDT real-time sync
  │     └── Slash commands, embedded tables, calendars, code blocks
  │     └── Checklist blocks that link bidirectionally to Board tasks
  │
  ├── Board
  │     └── Kanban board with customisable columns
  │     └── Tasks with priority, due date, assignee
  │     └── Bidirectional sync with Notes checklists
  │
  ├── Chat
  │     └── Real-time messaging scoped to this module
  │     └── Message history persisted
  │     └── @mentions trigger notifications
  │
  ├── Meet
  │     └── Video conferencing scoped to this module
  │     └── Auto-initialises a linked Notes document on call start
  │     └── Screen sharing
  │     └── In-call text chat
  │
  └── Resources
        └── Organised into user-created Sections
        └── Each section contains Items of two types:
              ├── File  → uploaded binary (PDF, image, video, ZIP)
              │           metadata stored in DB, bytes in object storage
              └── Link  → URL with title and optional description
                          stored entirely in DB
```

### Reasoning
Keeping all five features in every module avoids the complexity of
per-module feature toggles in v1. Every module is a complete
collaboration context — you can meet, discuss, plan, document, and
share resources all within the same module without switching context.
This is the core value proposition of Vero.

### Alternatives Rejected
- Optional features per module — adds configuration complexity and
  UI branching that is not justified for v1.
- Resources as a project-level feature only — loses the per-module
  scoping that keeps concerns separate.

---

## Decision 008 — Resources Feature Architecture

**Date:** 2026-05-19
**Status:** Locked

### Decision
Resources supports two item types — Files and Links — organised into
user-created Sections. File bytes are stored in object storage.
Only metadata is stored in the database.

### Data model concept
```
Resources (per Module)
  └── Sections  (user-created groupings, e.g. "Week 1 References")
        └── Items  (ordered list within a section)
              ├── type: link
              │     └── url, title, description
              └── type: file
                    └── name, mimeType, sizeBytes, storageKey
                    └── storageKey references object storage bucket
```

### Upload flow
```
1. Client requests a presigned upload URL from resources-service
2. resources-service generates URL from object storage provider
3. Client uploads file DIRECTLY to object storage (bypasses server)
4. Client notifies resources-service of successful upload
5. resources-service persists file metadata to database
```

### Reasoning
Files must never pass through the Express server. Routing binary
uploads through Node.js blocks the event loop and creates a
performance bottleneck that would degrade all other active users.
Presigned URLs offload the upload entirely to object storage while
keeping access control server-side.

### Alternatives Rejected
- Storing file bytes in Postgres (bytea) — does not scale, kills
  query performance, cannot stream large files.
- Routing uploads through the Express server — blocks event loop,
  violates NFR1 latency requirement.

---

## Decision 009 — Service Boundary Split (board-service)

**Date:** 2026-05-19
**Status:** Pending — requires team decision

### Context
The original design placed workspaces, projects, modules, members,
columns, and tasks all inside board-service. With the confirmed
hierarchy (Workspace → Project → Module) and the addition of the
Resources feature, board-service would own both organisational
structure and Kanban logic — two unrelated concerns.

### Options under consideration

```
Option A — Keep as-is
  board-service owns: workspaces, projects, modules, members,
                      columns, tasks, resources

Option B — Split into two services
  project-service owns: workspaces, projects, modules, members,
                        resources
  board-service owns:   columns, tasks  (pure Kanban only)
```

### Implication of Option B
project-service becomes the structural backbone. Every other service
references projectId and moduleId. It is the first service every other
service depends on after auth-service.

### Status
Decision pending. To be resolved before schema design begins.

---

*Last updated: 2026-05-19*
*Next decision required: Decision 009 (service boundary split)*
*Next action: Begin schema design starting with auth-service*
