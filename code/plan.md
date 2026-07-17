# Vero Frontend Build Plan

**Scope:** Full frontend implementation only. No backend service is being written or called yet. This plan targets the existing monorepo at `code/apps/{ui,web,desktop}` + `code/packages/{shared,ui}`, following the structure already scaffolded in the repo tree.

**Read first, every day you work on this:** `code/style.md` (design tokens/libraries) and this file. Every PR against this plan must be checked against §1 before merging.

---

## 1. Non-Negotiable Ground Rules

These apply to *every* page, component, hook, and store in this plan. They exist because "frontend-only" is not an excuse to fake completeness.

1. **Nothing is allowed to fake success.** A button that claims to "Send Invite", "Create Task", "Save Note", "Join Meeting", etc. must actually perform that mutation against real local application state (via the relevant Zustand store) and reflect the result in the UI. It is forbidden to show a success toast, a checkmark, or a state transition that isn't backed by an actual state change.
2. **No hard-coded "pretend" data rendered as if it were live.** All example/demo content lives in `apps/ui/src/data/mockData.ts` (and sibling fixture files, see §4) as clearly-named, typed fixtures. Components must read this data *through the store layer*, never inline literal JSX arrays duplicated ad hoc in a page file. If a screen needs data, it asks the store; the store is seeded from fixtures; nothing is invented at the component level.
3. **No dead interactive elements.** If a button, tab, filter, drag handle, menu item, or keyboard shortcut is visible, it must do something real (navigate, mutate local state, open a real dialog, toggle a real flag). If a feature is legitimately out of scope for this phase (e.g. real WebRTC peer connections, real email delivery), the control must be either (a) omitted entirely, or (b) visibly and honestly disabled/labeled ("Requires backend — coming soon") — never silently wired to a no-op that looks functional.
4. **No fake latency theater.** Do not add artificial `setTimeout` delays to make local operations "feel like" network calls unless we are explicitly testing a loading-state component. Loading/skeleton states must be driven by real async boundaries (e.g. genuinely lazy-loaded routes, real `navigator.mediaDevices` calls, real file reads) — not simulated for appearances.
5. **The services layer is the only seam that knows a backend will exist.** `apps/ui/src/services/*.ts` define functions with the exact signatures/shapes documented in the backend context docs (auth-service, project-service, chat-service, notes-service, meet-service, notification-service — see §12). For this phase, each service function's implementation reads/writes the corresponding Zustand store (local persistence), clearly commented `// LOCAL ADAPTER — replace body with real HTTP/gRPC/WS call when backend is wired`. Pages and components must **only** call through `services/*`, never reach into fixtures directly. This is what makes the later backend swap a one-file-per-service change instead of a rewrite.
6. **Every list, board, and editor must support real CRUD + reordering**, persisted in-memory for the session (Zustand, optionally with `persist` middleware to `localStorage` so refresh doesn't wipe work) — drag-and-drop on the Kanban board must actually reorder/re-column the task in the store; typing in Notes must actually update the block tree; toggling a checklist item must actually flip its state and, per the shared-context rule, actually create/update a linked task in the board store.
7. **Accessibility and keyboard support are part of "working," not polish.** Radix primitives already give us this almost for free — do not bypass them with raw `<div onClick>` where a Radix `Dialog`/`DropdownMenu`/`Select`/`Popover` is the correct primitive.
8. **Definition of done for any page in this plan:** compiles with no TS errors, has a populated state, an empty state, and (where relevant) a loading state, is keyboard-navigable, respects light/dark theme, is responsive down to a defined mobile breakpoint, and every visible control performs a real, verifiable local action.

---

## 2. App Topology (as scaffolded)

```
apps/ui/        → @repo/ui — the actual application: all pages, components, stores, hooks,
                  services, mock data, styles. This is where ~90% of the work in this plan happens.
apps/web/       → thin browser shell. Owns the react-router-dom router, mounts @repo/ui's
                  App/pages, and is where the public marketing/Landing route lives at "/".
apps/desktop/   → Electron shell (main.ts, preload.ts, ipc/). Loads the same @repo/ui build
                  as its renderer, but boots straight into the authenticated app shell
                  (no public marketing route needed inside the installed app).
packages/ui/    → (per style.md) low-level, framework-level shared primitives if/when we
                  extract them from apps/ui/src/components/shared — not required for MVP,
                  keep components in apps/ui/src/components for now, extract later only if
                  apps/web and apps/desktop diverge enough to need it.
packages/shared/→ cross-cutting TypeScript types (auth.types.ts, board.types.ts, meet.types.ts,
                  notes.types.ts, events.types.ts) — the frontend imports these directly so our
                  local fixtures and store shapes are already contract-compatible with the
                  eventual backend payloads.
```

**Routing owner:** `apps/web` (has `react-router-dom`). `apps/ui` exports page components + a `router.tsx` (route table) that `apps/web/src/main.tsx` mounts inside a single `<BrowserRouter>`. `apps/desktop` reuses the same route table but with a different default/initial route (see §11).

---

## 3. Design System Implementation (from `style.md`)

1. **Tailwind config** (`apps/ui`): extend theme with the indigo scale anchored on `#5B5BD6`, background `#F6F5FF` for light mode; define dark mode via the `oklch(...)` near-black surfaces. Implement as CSS variables in `apps/ui/src/styles/globals.css` (`--background`, `--foreground`, `--accent`, `--accent-foreground`, `--card`, `--border`, `--ring`, etc.), switched by a `.dark` class on `<html>`, so Tailwind utility classes (`bg-background`, `text-foreground`) stay theme-agnostic.
2. **ThemeProvider/ThemeContext** (`components/Providers/ThemeProvider.tsx`, `context/ThemeContext.tsx`): real toggle, persisted to `localStorage`, defaults to system preference (`prefers-color-scheme`) on first load. `ThemeToggle.tsx` and `ui/ThemeToggle.tsx` both consume the same context (dedupe if both exist post-audit — see §13 cleanup notes).
3. **Radix primitives** wrap all overlay/structural UI: `Dialog` (modals), `Popover` (search, filters), `DropdownMenu` (avatar/profile, notifications), `Select` (priority/role pickers), `Tooltip`, `Accordion` (settings groups), `Tabs` (Settings tabs, Notes/Board sub-tabs).
4. **clsx + tailwind-merge**: centralize in `utils/cn.ts` (already scaffolded) — every component uses `cn(...)` for conditional class composition, no manual string concatenation.
5. **Icons:** `lucide-react` for all functional iconography (nav, actions), `@mui/icons-material` reserved for a small number of denser/less-common icons only if lucide lacks an equivalent — don't mix both for the same icon family in one component.
6. **Motion:** `motion` (Framer Motion) drives `PageTransition.tsx` (route transitions), `AnimatedButton.tsx`/`AnimatedInput.tsx`/`AnimatedModal.tsx` micro-interactions, and `Skeleton.tsx` shimmer. Keep durations short (150–250ms) and respect `prefers-reduced-motion`.
7. **Charts:** `recharts` for Dashboard's completed-tasks sparkline/bar and any Settings/usage widgets.
8. **State:** `zustand` stores, one per domain (see §7). Use the `persist` middleware (localStorage) for auth/session and theme; keep board/notes/meet/notifications in-memory-per-session unless we decide otherwise (call this out explicitly per store).

---

## 4. Local Data Layer Strategy (the "no faking" contract in practice)

### 4.1 `apps/ui/src/data/mockData.ts`

Single source of typed seed fixtures, built against `packages/shared/src/types/*` so shapes match the real backend contracts:

- `mockUsers: User[]`
- `mockWorkspaces: Workspace[]`
- `mockProjects: Project[]`
- `mockModules: Module[]` (Board/Notes/Chat/Meet groupings per project, matching `project-service`'s Workspace→Project→Module model)
- `mockTasks: Task[]` (per `board.types.ts` — columns, priority, assignee, dueDate, linkedNoteId)
- `mockDocuments: Document[]` / `mockBlocks: Block[]` (per `notes.types.ts`)
- `mockChannels: Channel[]` / `mockMessages: Message[]` (per chat-service's Channel/Message model, incl. DM-uniqueness metadata even though enforced client-side only for now)
- `mockMeetings: Meeting[]` (per `meet.types.ts`)
- `mockNotifications: Notification[]` (per notification-service's schema: type, title, body, resourceUrl, actorCount, read)

If a fixture file grows unwieldy, split by domain (`data/tasks.mock.ts`, `data/notes.mock.ts`, etc.) re-exported from `mockData.ts`.

### 4.2 Store-fixture wiring

Every Zustand store initializes its state **from the fixtures via the matching service function**, e.g. `board.store.ts`'s `fetchTasks()` action calls `taskService.listTasks(projectId)`, whose LOCAL ADAPTER body filters `mockTasks` — never `import { mockTasks } from '../data/mockData'` directly inside a page component.

### 4.3 Services layer (`apps/ui/src/services/*.ts`)

Existing stubs (`authService.ts`, `memberService.ts`, `projectService.ts`, `taskService.ts`, `workspaceService.ts`) get fully fleshed out method signatures matching the backend docs, plus new files to add:

- `notesService.ts` (documents/blocks CRUD, checklist↔task conversion trigger)
- `chatService.ts` (channels, messages — mirrors chat-service's `GET /api/channels`, `POST /api/channels`, `GET /api/messages/:channelId`, unique-DM behavior)
- `meetService.ts` (rooms — mirrors meet-service's room/signal controllers, local-only for now)
- `notificationService.ts` (mirrors notification-service's REST surface: list, unread-count, mark-read, mark-all-read, delete)

Each exported function has a real TS signature and return type today, and a LOCAL ADAPTER body. Example shape (illustrative, not literal code to paste blindly):

```ts
// services/taskService.ts
export async function listTasks(projectId: string): Promise<Task[]> {
  // LOCAL ADAPTER — replace with `apiClient.get(`/api/board/projects/${projectId}/tasks`)`
  return boardStore.getState()._localTasksFor(projectId);
}
```

### 4.4 `utils/apiClient.ts`

Build the real Axios/fetch wrapper now (base URL from `import.meta.env.VITE_API_BASE_URL`, auth header injection from `auth.store`, 401 refresh-hook placeholder) even though nothing calls it yet — this avoids a structural rewrite later and lets us unit-test the client independently.

---

## 5. Routing Map (owned by `apps/web`, table defined in `apps/ui`)

### Public (unauthenticated) routes

| Path | Page | Notes |
|---|---|---|
| `/` | `LandingPage` | Marketing/professional landing page (see §6.1) |
| `/login` | `LoginPage` | |
| `/signup` | `SignupPage` | |
| `/forgot-password` | `ForgotPasswordPage` | |
| `/auth/callback` | `AuthCallbackPage` | Handles OAuth-style redirect flows (real handler logic against local auth store now, real network exchange later) |

### Authenticated app shell (`/app/*`, guarded by `auth.store.isAuthenticated`)

| Path | Page | Notes |
|---|---|---|
| `/app` | `DashboardPage` | redirects here after login |
| `/app/workspace/:workspaceId` | `WorkspacePage` | All Projects for a workspace |
| `/app/workspace/:workspaceId/project/:projectId` | `ProjectPage` | Module Hub |
| `/app/workspace/:workspaceId/project/:projectId/board` | `TasksPage` | Kanban |
| `/app/workspace/:workspaceId/project/:projectId/notes` | `notes/NotesPage` | |
| `/app/workspace/:workspaceId/project/:projectId/notes/:documentId` | `notes/NotesPage` (detail mode) | |
| `/app/workspace/:workspaceId/project/:projectId/chat` | `ChatPage` *(new, see §6.7)* | |
| `/app/workspace/:workspaceId/project/:projectId/meet` | `meet/MeetPage` | pre-join + in-call |
| `/app/calendar` | `CalendarPage` | workspace-scoped |
| `/app/files` | `FilesPage` | workspace-scoped |
| `/app/settings` | `SettingsPage` (+ tabs) | `ProfileTab`, `WorkspaceTab`, `MembersTab`, `BillingTab`, `DangerZoneTab` |

A `RequireAuth` route wrapper (new, `components/Providers` or `utils/auth.ts`) checks `auth.store` and redirects to `/login` (preserving `?redirect=`) — implemented for real against local session state now.

### Desktop-specific behavior

`apps/desktop` boots the same route table but with initial route `/app` (or `/login` if unauthenticated) — it never shows `/` (Landing) since that's a browser-acquisition page, not part of the installed product. Implemented via an `initialEntries` / `MemoryRouter`-style config difference at the shell level, not by duplicating pages.

---

## 6. Page-by-Page Build Plan

### 6.1 Landing Page (`pages/LandingPage.tsx`) — **the main route**

This must read as a genuine, professional SaaS marketing page, not a placeholder.

- **Hero:** Vero wordmark/logo, one-line value prop ("One workspace for meetings, docs, and tasks — no more app-switching"), primary CTA ("Get started free" → `/signup`), secondary CTA ("Sign in" → `/login`), subtle animated background (reuse `Rive`/`Three`/`Vanta` background component already scaffolded — pick one, don't ship three).
- **Social proof strip** (optional, can be a logo row placeholder explicitly labeled as such if we have no real logos yet — do not fabricate customer names/logos).
- **Feature sections** (3–4), each pairing real interactive/animated mockups of Meet, Notes, and Board (small self-contained illustrative components, not screenshots) with copy grounded in the SRS: shared project context, bidirectional note↔task sync, P2P meet + auto-notes.
- **"Why unified workspaces" section:** short, honest paraphrase of the productivity-research rationale (task-switching cost) already used in the SPL proposal — no fabricated statistics.
- **Pricing section:** if product pricing isn't finalized, either omit or show clearly-labeled "Coming soon" tiers — never invented price points presented as real.
- **Footer:** links to Login/Signup, and placeholders for legal/contact — real internal links only, no dead external links.
- Fully responsive, dark-mode aware, and the CTAs must actually route (`useNavigate`) — this is a page, not a static comp.

### 6.2 Auth Pages

- `LoginPage`: email/password form (real client-side validation via a small schema, e.g. zod), calls `authService.login()`, updates `auth.store`, redirects to `/app` (or `redirect` query param). Real error state on bad input (no hardcoded "always succeeds").
- `SignupPage`: name/email/password/confirm, real validation, on success calls `authService.signup()` then `workspaceService.createDefaultWorkspace()` (mirrors project-service's auto-provisioned "Personal Workspace" on `USER_CREATED`), lands on onboarding (Create Workspace/Invite/Create first Project stepper — new component `modals/CreateWorkspaceModal.tsx` already scaffolded, wire it as a full-screen stepper here instead of a plain modal if first-run).
- `ForgotPasswordPage`: email input, real local "request sent" state transition (disabled resend cooldown timer is fine — it's a real timer, not fake network delay).
- `AuthCallbackPage`: parses mock callback params, sets session, redirects — structured exactly where a real OAuth exchange will later be inserted.

### 6.3 Dashboard (`pages/DashboardPage.tsx`)

- Greeting header (time-of-day + real `Date` formatting via `utils/dateUtils.ts`).
- **Today's Meetings** card: reads from `meet.store` filtered to today, "Join" routes to the real Meet pre-join screen for that meeting's project.
- **Due Tasks** card: reads from `board.store` across all projects in the current workspace, sorted by due date; clicking a row deep-links to `TasksPage` with that task's `TaskModal` opened via route state or store flag.
- **Tasks Completed** card: `recharts` bar/sparkline computed live from `board.store` (real aggregation function, not a hardcoded number).
- Empty states for each card, independently, when their underlying store slice is empty.

### 6.4 Workspace / All Projects (`pages/WorkspacePage.tsx` + `components/workspace/ProjectList.tsx`)

- Grid of real `ProjectCard`s computed from `project.store`/`workspace.store`: name, description, date range, member avatar stack (`components/shared/Avatar.tsx`), and a **real** progress bar computed from that project's task completion ratio (query `board.store`, don't hardcode "68%").
- "+ New Project" opens `modals/CreateProjectModal.tsx`, writes a real new project into the store, and the grid re-renders it immediately (no reload needed).
- Empty workspace state with a single CTA.

### 6.5 Project / Module Hub (`pages/ProjectPage.tsx`)

- Header: project name, breadcrumb dropdown to sibling projects (reads `workspace.store`'s project list), member avatar stack + "Manage Team" → `components/workspace/MemberPanel.tsx` (real invite/role-change/remove against `memberService`/`member.store` if we add one, or fold into `project.store`).
- One section per **Module group**: pulls from `mockModules`/`module.store`; each group renders the four tiles (Board/Chat/Notes/Meet) that route into the corresponding module scoped to `{projectId}` (and `moduleId} if we key modules distinctly — recommended, since`project-service` models Modules as first-class entities with their own `resourceId` per service).
- "+ Add Module Group" opens a real creation modal, appends a real group to the store.
- Empty-project state.

### 6.6 Board / Kanban (`pages/TasksPage.tsx` + `components/board/*`)

- `KanbanBoard.tsx` renders four `KanbanColumn.tsx` (Backlog/In Progress/In Review/Done) sourced from `board.store` filtered to the current project/module.
- Real drag-and-drop (e.g. `@dnd-kit/core` — add as a dependency; do not hand-roll fragile pointer-event DnD) that calls a real `board.store.moveTask(taskId, toColumn, toIndex)` action, immediately re-rendering.
- `TaskCard.tsx`: priority pill, title, subtitle, due-date pill, assignee avatar — all from real task fields, not literal strings per card.
- `TaskModal.tsx` (`components/board/TaskModal.tsx`): full detail editor — title, description, priority `Select`, assignee `Select` (from real project members), due date picker, checklist sub-items (each togglable and persisted), "linked note" affordance if `task.linkedNoteId` is set (real navigation to that note), delete/archive.
- Toolbar: Assignee/Priority filters are real `Popover`+checkbox filters that actually filter the rendered columns (derived/computed, not decorative).
- "+ New Task" opens `TaskModal` in create mode, writes a real task into `board.store` in the Backlog column.

### 6.7 Notes (`pages/notes/NotesPage.tsx`, `DocumentList.tsx`, `RichTextEditor.tsx`, `components/notes/*`)

- `DocumentList.tsx`: real sidebar list from `notes.store`, search-filterable (real substring filter over title/content), "+ New Note" creates a real empty document and selects it.
- `RichTextEditor.tsx` + `components/notes/BlockEditor.tsx`: block-based editor. Recommend building on a real block-editor primitive (e.g. `@blocknote/react` or a minimal custom block model backed by `Yjs` docs even in single-user/local mode) rather than a plain `<textarea>`, since Notes' whole value prop is structured blocks + slash commands.
- `SlashMenu.tsx`: typing `/` opens a real command palette (Radix `Popover`/`Command`) inserting real blocks: Heading, Bullet list, Checklist, Table, Calendar embed, Code block, File/Image embed, Divider.
- `Checklist.tsx`: each item real-toggles; a "Convert to task" affordance actually calls `board.store.createTaskFromChecklistItem(...)` and stores the link both ways (note item stores `linkedTaskId`, task stores `linkedNoteId`) — implements the bidirectional-sync UX described in the SRS, entirely client-side for now.
- `EmbedBlock.tsx`: renders Table/Calendar/File embeds as real interactive sub-components (a real mini calendar picker, a real editable table grid), not static images.
- `AwarenessCursors.tsx`: since there's no live collaboration backend yet, this component should either (a) be feature-flagged off with an honest "Real-time collaboration requires the backend" note, or (b) simulate a *second local tab* via `BroadcastChannel`/`localStorage` events so it's a genuinely working same-browser multi-tab demo rather than a fake colored cursor that never moves. Choose (b) if time allows — it's real, just scoped to one machine.
- Auto-save indicator driven by a real debounced save function into `notes.store` (`"Saving…"` while the debounce timer is pending, `"Saved"` once the store write resolves) — not a decorative label.

### 6.8 Chat (**new page needed**: `pages/ChatPage.tsx`, `components/chat/*`)

Not present yet in the scaffold — add it, mirroring `chat-service`'s model (Channels, DM-uniqueness, Messages, typing/presence) at the UI layer:

- `ChannelList.tsx`: list of channels/DMs for the current project (or workspace, per how we scope chat), each row shows other participant(s), last message preview, unread badge.
- `ChatWindow.tsx`: message list + composer. Composer supports text, emoji reaction picker, file attachment (real local `File` object handling — preview, not just an inert input), and a "pin" action (`chat.store.pinMessage`).
- `ThreadPanel.tsx`: real side panel for threaded replies.
- Typing indicator: since there's no socket yet, implement it against local store state driven by the composer's own keystroke events (so it's real for the local user; remote-typing simulation should use the same multi-tab `BroadcastChannel` approach as Notes if we want it to be genuinely demonstrable, not hardcoded to "Sara is typing…" forever).
- Empty state for a brand-new channel.
- Add `chat.store.ts` to §7's store list.

### 6.9 Meet (`pages/meet/MeetPage.tsx`, `components/meet/*`)

- **Pre-join screen:** real `navigator.mediaDevices.getUserMedia` preview (actual camera/mic access — this is genuinely achievable client-side with zero backend), real device `<select>`s populated from `navigator.mediaDevices.enumerateDevices()`, "Join now" button.
- **In-call screen:** `VideoGrid.tsx`/`VideoTile.tsx` render the **real local video stream** in one tile; since there is no signaling/SFU yet, remote participant tiles must be honestly represented as **local fixture participants with static avatar circles (no fake video)** — do not synthesize fake remote video streams. Label this clearly in a code comment and, optionally, a small UI note in dev builds ("Remote video requires meet-service").
- `ControlBar.tsx`: mic/camera toggles must **really** mute/unmute and enable/disable the actual local `MediaStreamTrack`s; screen-share toggle uses real `getDisplayMedia()`; "Leave" really tears down the local stream (`track.stop()`) and navigates away.
- `InCallChat.tsx`: reuse the Chat components/store scoped to this meeting's channel.
- `ParticipantPanel.tsx`: real participant list from `meet.store` (fixture + the actual local user).
- On join, auto-create a linked Notes document (`notes.store.createMeetingNote(meetingId)`) per the SRS's "auto-initialized note" rule — a real store write, and a visible banner/panel confirming it.
- `useWebRTC.ts`/`useMediaDevices.ts` hooks should contain **real** browser API usage today (getUserMedia, enumerateDevices, getDisplayMedia) with the actual `RTCPeerConnection`/signaling wiring left as a clearly marked extension point for when `meet-service` (Mediasoup SFU) exists — do not stub these with fake resolved promises.

### 6.10 Calendar (`pages/CalendarPage.tsx`)

- Month/week toggle, real date-grid rendering (use a lightweight date utility, not a heavy calendar dependency unless justified), events sourced from `meet.store`/a new lightweight `calendar.store.ts` (events can double as Meet entries + generic events).
- "+ New Event" opens a real creation dialog (title, date/time range, attendees picker from project members, optional linked project/module), writes a real event to the store, renders on the grid immediately.
- Clicking an event opens a real popover/detail view; if it's a Meet event, "Join" routes to `MeetPage`.

### 6.11 Files (`pages/FilesPage.tsx`)

- Real file list aggregated from Notes embeds + Chat attachments (or its own `files.store.ts` fixture) — grid/list toggle, real upload affordance using a real `<input type="file">` + drag-and-drop zone that adds real `File` metadata (name, size, type, uploadedBy, date) to the store. We are not persisting bytes anywhere real yet (no backend), so be explicit in code comments that only metadata + an object URL preview are retained client-side for this phase.

### 6.12 Settings (`pages/SettingsPage.tsx` + `pages/settings/*`)

- `ProfileTab.tsx`: real form bound to `auth.store`'s current user (name, avatar upload via `<input type="file">` → object URL preview, bio), real save.
- `WorkspaceTab.tsx`: workspace name/icon edit (Admin/Manager only — real role check against `auth.store`/project membership), real save.
- `MembersTab.tsx`: real table of members with role `Select`s (Admin/Manager/Member), invite-by-email input (adds a real pending-invite row to the store; there's no email service yet, so mark it "Invite link copied" using the real Clipboard API rather than pretending an email was sent), remove-member action with a real confirmation dialog.
- `BillingTab.tsx`: since there's no billing backend, present clearly-labeled placeholder plan info ("Free tier — billing coming soon") — no fabricated invoices/charges.
- `DangerZoneTab.tsx`: real confirmation-gated "Delete workspace" (with a typed-confirmation input pattern, e.g. "type the workspace name to confirm") that actually removes it from the local store and redirects — genuinely destructive locally, matching how it'll behave for real later.

### 6.13 Notifications (`components/Layout/NotificationDropdown.tsx` + `notification.store.ts`)

- Bell icon badge count computed live from `notification.store`'s unread count (mirrors `GET /api/notifications/unread-count`).
- Dropdown lists real notifications from the store (mirrors `GET /api/notifications`), each clickable to `resourceUrl` (real client-side route) and marks read (mirrors `PATCH /:id/read`) — a real per-item state flip, not decorative.
- "Mark all as read" calls a real store action (mirrors `PATCH /read-all`).
- Notifications should be **generated by real local actions** where plausible client-side (e.g., assigning a task to a teammate fixture pushes a real notification into the store immediately) rather than only ever appearing from static seed data — this proves the grouping/creation logic actually works before the real `notification-service` Redis pipeline exists.

---

## 7. State (Zustand) — one file per domain

| Store | Owns | Persist? |
|---|---|---|
| `auth.store.ts` | current user, session, isAuthenticated, login/logout/signup actions | yes (localStorage) |
| `navigationStore.ts` | current workspace/project/module context, breadcrumb state | yes |
| `board.store.ts` | tasks per project, column state, filters, CRUD + move actions | session (localStorage optional) |
| `notes.store.ts` | documents, blocks, checklist↔task links, autosave state | session |
| `chat.store.ts` *(new)* | channels, messages, pinned messages, local typing state | session |
| `meet.store.ts` | active meeting, participants (local + fixtures), device/track state | session (not persisted across reload — a "meeting" shouldn't survive a refresh) |
| `notification.store.ts` | notifications list, unread count, read/delete actions | session |
| `workspace.store.ts` / `project.store.ts` *(confirm split vs. merge — recommend keeping `workspace.store` for Workspaces+Members and folding Projects/Modules into `project.store` per the backend's own Workspace→Project→Module split)* | workspaces, projects, modules, member roles | yes |
| `calendar.store.ts` *(new, optional — may fold into meet.store)* | events | session |
| theme (in `ThemeContext`, not necessarily Zustand) | light/dark | yes |

Each store exposes plain actions (`create/update/delete/move/toggle`) that page components call **through the services layer** (§4.3), never mutating store internals directly from a component.

---

## 8. Hooks

- `useAuth.ts`: thin wrapper over `auth.store` + `RequireAuth` logic.
- `useMediaDevices.ts`: real `navigator.mediaDevices` enumeration/permissions handling, exposed as `{devices, selectedCamera, selectedMic, error, requestPermissions}`.
- `useWebRTC.ts`: encapsulates local `MediaStream` acquisition/teardown and the (for now) single-peer-less "local preview" mode; expose the extension seam (`connectToRoom(roomId)`) as an explicit TODO-with-context, not a fake implementation.
- `useYjs.ts`: if we go with real local Yjs docs for Notes (recommended per §6.7), this hook owns the `Y.Doc` instance and awareness state, usable in single-tab and multi-tab (`BroadcastChannel` provider) modes without any server.
- `useSocket.ts`: define the real `socket.io-client` connection lifecycle now, but do not call `.connect()` in local mode (guard behind `import.meta.env.VITE_ENABLE_SOCKETS`), so the hook's shape is correct for when `chat-service`/`notification-service` sockets exist.
- `useNotifications.ts`: subscribes to `notification.store`, exposes `{items, unreadCount, markRead, markAllRead}`.

---

## 9. Shared Layout & Components

- `Layout/Sidebar.tsx` (LeftDock): workspace switcher, Home/Projects nav, theme toggle, settings, profile — all real navigation via `react-router-dom`'s `useNavigate`/`NavLink` (active-state styling from real route match, not manual booleans).
- `Layout/TopBar.tsx`: breadcrumb dropdown (real sibling-context switch), `GlobalSearch.tsx` trigger, `NotificationDropdown.tsx`, avatar menu.
- `workspace/GlobalSearch.tsx`: real `Cmd/Ctrl+K` listener, searches across the actual in-memory stores (tasks, notes, messages, projects, members) via a small client-side search/index function — grouped results, keyboard navigation, "Recent" fallback when query is empty (recent = actually-last-visited routes, tracked in `navigationStore`).
- `modals/*`: `CreateWorkspaceModal`, `CreateProjectModal`, `InviteMemberModal` — all real forms with validation and real store writes.
- `ui/EmptyState.tsx`: reusable, parameterized (icon, title, subtitle, CTA) — used consistently across every list/board/module per §1 rule 8.
- `ui/Skeleton.tsx`: used only where a real async boundary exists (route-level `React.lazy`/`Suspense`, real media device requests, etc.).
- `Providers/ToastProvider.tsx`: real toast queue triggered only by real store-confirmed mutations (never "optimistic-fake" toasts that fire before the store write resolves).

---

## 10. Cross-Cutting "Shared Project Context" Wiring

Implement this as real client-side logic connecting stores, not just a diagram:

- Starting a Meet → `notes.store.createMeetingNote()` real write, linked by `meetingId`.
- Toggling a Notes checklist item's "convert to task" → `board.store.createTaskFromChecklistItem()` real write; completing that Board task → real reverse write that checks the originating checklist item (`notes.store.setChecklistItemDone()`), demonstrated by actually navigating between the two and seeing the reflected state.
- Any assignment/mention (Board, Notes `@mention`, Chat) → `notification.store.push()` real write, visible immediately in the bell dropdown.
- Task completion → Dashboard's "Tasks Completed"/"Due Tasks" recompute live off `board.store` (no manual refresh needed — this must react automatically as a Zustand subscriber).

---

## 11. Shell Wiring (`apps/web`, `apps/desktop`)

### `apps/web`

- `main.tsx`: mount `<BrowserRouter>` → route table from `apps/ui`'s route config → `ThemeProvider` → `ToastProvider`.
- `index.html`: real `<title>`, favicon, meta description for the Landing page (basic SEO hygiene since this is a public marketing entry point).

### `apps/desktop`

- `main.ts`: creates the `BrowserWindow`, loads the Vite dev server URL in development / the built `apps/ui` (or `apps/web`) `dist/index.html` in production.
- `preload.ts` + `ipc/*.ts` (`auth.ipc.ts`, `window.ipc.ts`, `updater.ipc.ts`): expose a minimal, real `contextBridge` API for things Electron can genuinely do today without a backend — window controls (minimize/maximize/close), and a real local secure-storage hook for the auth token (e.g. via `electron-store` or OS keychain) instead of `localStorage`, since Electron gives us a better real option here. Do **not** stub `auth.ipc.ts` with fake "always logged in" behavior — it should call the same `auth.store` logic as the web shell, just persisted through a different (also real) backing store.
- Default route on boot: `/login` if no persisted session, else `/app`.

---

## 12. Backend Contract Awareness (why services are shaped this way)

Even though nothing calls a network in this phase, the services layer must match these real contracts so the eventual swap is mechanical:

- **auth-service:** session object carries `authToken`/`refreshToken`; `GET /api/auth/session`, `GET/PATCH /api/user/profile`. → `authService.ts` return shapes should already look like this.
- **project-service:** Workspace→Project→Module hierarchy; `GET /api/project/workspaces`, `POST /api/project/projects`, `POST /api/project/modules` (module creation orchestrates a resource in another service, e.g. a chat channel) → `workspace.store`/`project.store` should model Modules as entities with a `resourceId`/`resourceType`, even locally, so Board/Notes/Chat/Meet tiles route by `moduleId` not just `projectId`.
- **chat-service:** unique-DM semantics (`POST /api/channels` returns 200 vs 201), enriched channel list with `lastMessage` → `chat.store`'s `createChannel()` should implement the same "find-or-create" DM logic locally.
- **notes-service:** document/block/snapshot model, socket-based collaboration → informs the real local-Yjs approach in §6.7/§8.
- **meet-service:** SFU model (Mediasoup) means the frontend only ever needs one upload per local user and N renders for remote streams → our local-only `useWebRTC` should already be structured around "one local stream, N remote stream slots" so swapping in real signaling later doesn't change the component tree.
- **notification-service:** grouping by `(userId, type, entityId)` within a time window, `actorCount` field for "3 people commented" style copy → `notification.store.push()` should implement the same collapse-within-window logic locally so the UI (and its copy, e.g. "Sara and 2 others…") is correct from day one.

---

## 13. Cleanup / Consistency Audit (do this early, in Phase 0)

The scaffold currently has some duplication to resolve before building on top of it:

- Two `Button.tsx` locations (`components/Common/Button.tsx`, `components/shared/Button.tsx`) and two `GlassCard.tsx`/`Skeleton.tsx`/`ThemeToggle.tsx`/`PageTransition.tsx`/`AnimatedButton.tsx`/`Toast.tsx` (`components/Common/*` vs `components/ui/*`). Pick **one** canonical location per component (recommend `components/ui/*` as the design-system layer, `components/shared/*` for slightly higher-level composed pieces like `Avatar`/`Modal`/`Sidebar`/`Tooltip`/`Spinner`), delete/re-export the duplicate, and update all imports. Do this before Phase 1 so we don't build 10 pages against a component we then have to migrate.
- Three background-effect libraries scaffolded (`Rive`, `Three`, `Vanta`) — pick one for the Landing page hero per §6.1 and remove/park the other two rather than shipping unused heavy dependencies.
- Confirm whether `board.store.ts` should own Modules or if that belongs in `project.store.ts` (see §7 note) — decide once, document the decision in `docs/decisions/decision-log.md` (already present in the repo) so it isn't re-litigated mid-build.

---

## 14. Build Order (Phases)

0. **Foundations:** Tailwind/theme tokens, `cn.ts`, `ThemeProvider`, component-duplication audit (§13), route table skeleton, `RequireAuth`, base `Layout` (Sidebar/TopBar) with placeholder-but-real nav (routes exist even if pages are still empty shells).
1. **Public entry:** Landing Page (full, real, polished — this is the professional main-route requirement), Login/Signup/ForgotPassword/AuthCallback wired to a real local `auth.store`.
2. **Workspace layer:** Dashboard, All Projects, Create Workspace/Project modals, Module Hub.
3. **Board:** full Kanban with real DnD, filters, Task detail.
4. **Notes:** block editor, slash menu, checklist↔task sync.
5. **Chat:** new page + components + store, channel list, DM uniqueness, composer, threads.
6. **Meet:** real getUserMedia pre-join, real local in-call controls, fixture remote participants, meeting↔note linkage.
7. **Calendar, Files, Settings (all tabs), Notifications dropdown.**
8. **Cross-cutting polish:** Global Search, responsive pass, dark mode pass across every page, accessibility pass (focus states, ARIA on Radix usages, reduced-motion), empty/loading state audit against §1 rule 8 for every single page.
9. **Shell wiring:** `apps/web` router mount + SEO basics; `apps/desktop` Electron main/preload/ipc, secure token storage, window controls, production build load path.

---

## 15. Definition of Done for This Plan

The frontend build is complete when: every route in §5 renders a real, interactive page; every store in §7 is driven by real local mutations reachable from the UI; every hook in §8 either does the real browser-API thing it claims to do or is honestly labeled as an extension point; the Landing page is presentable to an external, non-technical visitor without embarrassment; and grepping the codebase for `TODO: fake`, `setTimeout(() => resolve(true)`-style theater, or hardcoded literal arrays inside page components (outside of `data/*mock*.ts`) returns nothing.
