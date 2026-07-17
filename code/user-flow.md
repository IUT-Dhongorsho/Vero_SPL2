# Vero — User Flow Document

**Purpose:** This document describes the complete end-to-end user flow for Vero's frontend (React + Vite, Tailwind, Radix UI, per `style.md`). It is written to later be converted into a `plan.md` for building the MERN frontend with mocked/local data (no backend integration yet). It covers every screen, state, and transition a user encounters, from first landing on the app to daily usage of all modules.

---

## 0. Design & Tech Context (recap)

- Soft indigo/purple light mode (`#F6F5FF` bg, `#5B5BD6` accent), pure black `oklch` dark mode.
- React + Vite, Tailwind (with `clsx`/`tailwind-merge`), Radix UI primitives, `motion` for animation, `zustand` for state, `lucide-react` + MUI icons, `recharts` for charts.
- Pages: `SignIn`, `Dashboard`, `ProjectHub` (All Projects), `ModuleHub` (per-project modules), `Kanban` (Board), `Notes`, `Chat`, `Meet`.
- Persistent shell: `LeftDock` (icon rail), `TopBar` (breadcrumb/context switcher, search, notifications, avatar).

---

## 1. High-Level Flow Summary

```
SignIn/SignUp
   │
   ▼
Workspace Selector (new user → Create Workspace | returning → last used workspace)
   │
   ▼
Dashboard (Home) ──► All Projects ──► Project (Module Hub) ──► Module (Board / Chat / Notes / Meet)
   │                                                              │
   ├─ Notifications, Global Search, Settings, Profile (always reachable from TopBar/LeftDock)
   │                                                              │
   └───────────────────── Shared Project Context (syncs Meet → Notes → Board) ◄─────┘
```

The core UX principle: everything nests under a **Workspace → Project → Module** hierarchy, but a persistent left dock and top bar let the user jump anywhere in one click, so the hierarchy never traps the user.

---

## 2. Entry & Authentication (`SignIn.tsx`)

### 2.1 First-time visitor
1. User lands on `/signin`. Centered card on the soft indigo background; Vero logo/wordmark at top.
2. Tabs or toggle: **Sign In** / **Sign Up**.
3. Sign Up fields: Name, Email, Password, Confirm Password. Inline validation (red ring + helper text) for invalid email / weak password / mismatch, matching the soft-edged Radix input style.
4. Primary CTA button (indigo, full width): "Create Account". Secondary link: "Already have an account? Sign in".
5. (Frontend-only note) On submit, mock a short loading state on the button (spinner replaces label), then route to **Email Verification (mock)** screen or straight to onboarding if we choose to skip verification for the prototype.
6. Optional: "Continue with Google" secondary button (styled outline, icon left) — non-functional stub for frontend-only phase.

### 2.2 Returning user
1. Sign In fields: Email, Password, "Forgot password?" link.
2. On submit → loading state → redirect to the **last active Workspace's Dashboard** (or Workspace Selector if the user belongs to multiple workspaces and none was "last active").

### 2.3 Error / edge states
- Wrong credentials → inline error banner above the form, fields keep values except password.
- Empty workspace (brand new account, no workspace yet) → redirected to **Create Workspace** flow (3.1) instead of Dashboard.

---

## 3. Onboarding & Workspace Setup

### 3.1 Create Workspace (first-run)
1. Full-screen modal/step flow (not the main app chrome yet, since no workspace context exists):
   - **Step 1:** Workspace name + optional icon/emoji picker (avatar circle top-left, seen as "V" bubble in screenshots).
   - **Step 2:** Invite teammates — email chips input, role dropdown per invitee (Admin / Manager / Member), "Skip for now" link.
   - **Step 3:** Create first Project — name, short description, optional date range (matches "Marketing Q3 · Quarterly marketing initiatives · July – September 2026" pattern seen in Image 2).
2. On completion → lands on **Dashboard** for the new workspace, with a light celebratory toast ("Workspace created 🎉").

### 3.2 Returning to an existing workspace / switching workspaces
- The circular workspace avatar at the very top of the `LeftDock` (e.g. the purple "V" bubble) is a dropdown/switcher: click → list of all workspaces the user belongs to (+ "Create new workspace" at the bottom).
- Switching workspaces re-renders the entire shell context (Dashboard, Projects, notifications, search index all scope to the newly selected workspace).

---

## 4. Global App Shell (present on every authenticated screen)

### 4.1 Left Dock (icon rail, always visible, collapstable on smaller widths)
Top → bottom:
1. Workspace avatar/switcher (circle, colored initial).
2. **Home** (house icon) → Dashboard.
3. **Projects** (folder icon) → All Projects (`ProjectHub`).
4. Divider.
5. **Theme toggle** (moon/sun icon) → switches light/dark mode instantly (persisted in local state / localStorage-equivalent for frontend-only build).
6. **Settings** (gear icon) → Settings panel (workspace settings, profile, notifications preferences).
7. User avatar (bottom, initials bubble, e.g. "AK") → profile menu (Profile, Preferences, Log out).

### 4.2 Top Bar
- **Breadcrumb / context dropdown** (left): shows current scope — "Personal Workspace", "All Projects", "Marketing Q3", etc. Clicking the chevron opens a dropdown to jump to sibling contexts (other projects, workspace root).
- **Global Search** (center-left, prominent, "Search..." placeholder): opens a command-palette-style overlay (Radix Dialog) on click or `Cmd/Ctrl+K`. Searches across notes, tasks, meetings, and members within current workspace scope. Results grouped by type with icons; empty state shows recent items.
- **Notification bell** (badge count e.g. "3"): click → dropdown/panel listing recent notifications (task assignments, mentions, meeting invites), each row clickable → deep-links into the relevant module/item. "Mark all as read" action at top.
- **Avatar** (right): quick profile menu, duplicate of the left dock's bottom entry for convenience on wide screens.

### 4.3 Persistent behaviors
- Navigating away from a module never destroys unsaved state silently — inline autosave indicators ("Saved" / "Saving...") are shown wherever editing happens (Notes, Task detail, Workspace settings).
- All list/board/module screens support empty states (see §9) and loading skeletons (frontend-only: simulate with timeouts + skeleton components).

---

## 5. Dashboard (Home) — `Dashboard.tsx`

**Entry point after login/workspace switch.**

1. Greeting header: "Good morning/afternoon/evening, {Name} {weather emoji}" + current date + one-line context ("Here's what's on your plate today.").
2. Three-column card layout (responsive → stacks on mobile):
   - **Today's Meetings** card: chronological list (time, title, avatar stack, "Join" button that is prominent/colored only for the currently-live or next-imminent meeting). Empty state: "No meetings today — enjoy the quiet 🌤".
   - **Due Tasks** card: badge showing count of open tasks ("8 open"), list of task rows with a colored priority/status dot, title, project tag pill, due label ("Today", "Jul 4", etc.). Clicking a row deep-links to that task's Board/column with the task detail panel open. Empty state: "You're all caught up ✅".
   - **Tasks Completed** card: big number + "this week" label, small upward-trend badge ("↑18%"), mini bar/sparkline (recharts) of daily completions.
3. Clicking "Join" on a meeting → routes directly into the **Meet** screen for that project/module (bypassing the Module Hub), pre-joined.
4. Clicking a due task → routes into **Board** module with that task's detail drawer open.

---

## 6. All Projects (`ProjectHub.tsx`)

1. Header: "Projects" + subtitle "Select a project to view its modules."
2. Grid of **Project Cards**, one per project in the workspace:
   - Folder icon, project name (bold), one-line description + date range.
   - Avatar stack of members.
   - Progress percentage + horizontal progress bar (computed from tasks-done / tasks-total across the project's Board modules).
3. Clicking a card → navigates to that Project's **Module Hub**.
4. A persistent "+ New Project" affordance (card with dashed border or a button near the header) opens the Create Project modal (name, description, date range, initial members) — same shape as onboarding step 3.
5. Optional filter/sort controls (by activity, by name, by progress) can live in the header row for later iterations; not required for MVP frontend but worth reserving layout space.

---

## 7. Module Hub (`ModuleHub.tsx`) — a single Project's landing page

1. Breadcrumb/title updates to the Project name (e.g. "Marketing Q3") with a chevron dropdown to switch to a sibling project without going back to All Projects.
2. Header row: Project name + "___ Modules" subtitle, avatar stack of all project members (top-right), "Manage Team" button (opens member management modal: invite, change roles, remove).
3. Body: one **section block per functional group / sub-team** within the project (e.g. "Social Media", "Ads & Campaigns" as seen in Image 3) — this models how a project can have multiple module groupings for different sub-teams:
   - Section header (group name) + "Module Members" avatar row for that subgroup.
   - Four module tiles per section, always in the same order: **Board, Chat, Notes, Meet** — each a square icon tile with label.
4. Clicking any tile routes into that module scoped to the given section/group within the project (e.g. `Marketing Q3 / Social Media / Board`).
5. A "+ Add Module Group" affordance at the bottom lets a user create a new sub-team/grouping within the project (name + members), reusing the same modal pattern as elsewhere.
6. Empty project (no groups yet) → friendly empty state with a single CTA: "Create your first module group".

---

## 8. Board Module (Kanban) — `Kanban.tsx`

1. Breadcrumb: `Project / Group / Board`.
2. Toolbar: **Assignee** filter dropdown, **Priority** filter dropdown (both Radix Select/Popover with checkboxes), **+ New Task** button (top-right, primary indigo).
3. Four fixed columns: **Backlog, In Progress, In Review, Done** — each with a count badge and a "+" quick-add affordance in the column header.
4. Task cards show: priority pill (Low=green, Medium/High=colored per severity, matches "High" red pill seen in screenshots), bold title, one-line description/subtitle, due-date pill, assignee avatar (bottom-right).
5. **Drag-and-drop** between columns (using a lightweight DnD lib or manual pointer events) updates the task's status instantly (optimistic UI; for frontend-only, update local/zustand state directly).
6. Clicking a card opens a **Task Detail drawer/dialog**:
   - Editable title & description, priority selector, assignee picker, due date picker, checklist sub-items (each togglable), activity/comment feed, "linked note" reference if the task originated from a Meet/Notes checklist (shared-context link, see §11), delete/archive action.
7. "+ New Task" opens the same detail dialog in create-mode, defaulting to the Backlog column.
8. Empty column → subtle dashed placeholder text ("Drop tasks here" / "Nothing in review").
9. Horizontal scroll for the column row on narrow viewports (scrollbar visible in Image 4).

---

## 9. Notes Module — `Notes.tsx`

1. Breadcrumb: `Project / Group / Notes`.
2. Layout: left sidebar lists all notes/documents in this module (search-filterable, "+ New Note" at top); main pane is the rich text editor.
3. Editor is block-based: typing `/` opens a **slash command menu** (Radix Popover/Command list) offering blocks — Heading, Bullet list, Checklist, Table, Calendar embed, Code block, Image/File embed, Divider.
4. **Checklist blocks** are the bridge to the Board: each checklist item has a small "Convert to task" affordance; toggling conversion creates/links a Board task (and vice versa — completing the Board task auto-checks the note item). This is the "bidirectional sync" called out in the SRS.
5. Collaborative cues (frontend-only mock): colored cursor/avatar labels of other "simultaneous editors" to simulate real-time co-editing, even though real CRDT sync isn't wired up yet.
6. Mentions: typing `@` opens a member picker; inserted mentions render as a pill and (per notifications) would alert that user.
7. Auto-save indicator in the top-right of the editor pane ("Saved" / "Saving…").
8. Meet-originated notes (auto-created when a call starts) appear at the top of the sidebar tagged with a small video icon and the meeting date/time.

---

## 10. Chat Module — `Chat.tsx`

1. Breadcrumb: `Project / Group / Chat`.
2. Standard messaging layout: channel/thread list (or single project-scoped stream) on the left if multiple threads exist; message list + composer on the right.
3. Composer supports: text, emoji reactions, file attachment, and "pin" action on any message (pinned messages accessible via a small "Pinned" toggle at the top of the thread).
4. Thread replies: hovering a message reveals a "Reply in thread" affordance, opening a side panel for the thread.
5. Empty state for a brand-new project chat: "Say hello 👋 — this is the start of Social Media's chat."

---

## 11. Meet Module — `Meet.tsx`

1. Entry points: (a) "Join" button from Dashboard's Today's Meetings card, (b) the Meet tile inside Module Hub, (c) a "Schedule Meeting" action from the Calendar or Module Hub.
2. **Pre-join screen** (frontend-only): camera/mic preview tiles, device selectors, "Join now" button.
3. **In-call screen** (matches Image 5):
   - Top-left "● Live" badge + meeting title ("Marketing Q3 · Social Media Sync").
   - Top-right participant count pill, expandable to a participant list.
   - Main area: grid of participant tiles (avatar-circle placeholder when video is off, name label bottom-left, mic-muted icon indicator).
   - Bottom floating control bar: Mic toggle, Camera toggle, Screen-share toggle, Settings (gear), red "Leave" button.
   - Optional right-side collapsible panel for **in-call chat** (per FR9) and the **auto-created linked note** (per FR4) so users can jot decisions without leaving the call.
4. On joining, the system (mock) auto-creates/opens a linked Notes document for this meeting instance; a small banner or side-panel indicator communicates "Meeting notes started".
5. Leaving the call → returns user to the Module Hub (or wherever they entered from), with a toast summarizing "Meeting ended — notes saved, X tasks created."

---

## 12. Calendar (supporting surface, referenced in SRS FR list)

1. Reachable from Dashboard ("Today's Meetings" → "View calendar" link) or a dedicated LeftDock/TopBar entry if promoted to a first-class module.
2. Monthly/weekly toggle views; events rendered as colored blocks; clicking an event opens a small popover (title, time, attendees, "Join" if it's a Meet event) or the full event editor.
3. "+ New Event" flow: title, date/time range, attendees, optional linked project/module, recurrence (basic).
4. Personal availability can be marked (blocks time as "busy") — relevant for scheduling flows elsewhere in the app.

---

## 13. Notifications

1. Bell icon in TopBar shows unread badge count.
2. Dropdown/panel lists notifications reverse-chronologically: task assigned, mentioned in note/chat, meeting starting soon, teammate joined workspace.
3. Each item: icon by type, short text, relative timestamp, unread dot. Clicking navigates to the relevant module/item and marks it read.
4. "Notification preferences" reachable from Settings to toggle categories (email vs in-app, per category) — matches FR6/NFR-level personalization.

---

## 14. Global Search

1. Trigger: click the search bar or `Cmd/Ctrl+K` from anywhere.
2. Overlay (Radix Dialog) with a text input at top; as the user types, results stream in grouped by type: **Projects, Tasks, Notes, Messages, People**, each row showing an icon, title, and a breadcrumb of where it lives.
3. Keyboard navigable (arrow keys + Enter); Escape closes.
4. Empty query state shows "Recent" (last visited items) for quick re-access.

---

## 15. Settings & Profile

1. **Workspace Settings** (gear in LeftDock, if user has Admin/Manager role): Workspace name/icon, Members & Roles table (invite, change role, remove), billing/plan placeholder, danger zone (delete workspace).
2. **Personal Profile menu** (avatar bubble): "Profile" (name, email, avatar upload), "Preferences" (theme, notification defaults), "Log out".
3. Role-based visibility: Members without Admin/Manager rights see a reduced Settings view (profile/preferences only, no workspace-wide controls) — reflects RBAC (FR1) in the UI even before backend enforcement exists.

---

## 16. Cross-Cutting: The "Shared Project Context" (tightly coupled modules)

This is Vero's core differentiator and must be visually/interactively evident in the frontend even without a real backend:

- **Meet → Notes:** Starting a call auto-creates a linked note; ending the call surfaces a summary of what was captured.
- **Notes → Board:** Checklist items convert to Board tasks (and Board task completion checks the originating checklist item). Task detail drawer shows a "View source note" link when applicable.
- **Board → Dashboard:** Task completion updates the "Tasks Completed" chart and clears the item from "Due Tasks".
- **Any module → Notifications:** Mentions and assignments anywhere (Notes, Chat, Board) generate a notification.

For the frontend-only build, all of this can be simulated with a shared `zustand` store (or mock context) that all module components read/write, so the UI behaves consistently even though there is no real backend yet.

---

## 17. Empty, Loading, and Error States (apply everywhere)

- **Loading:** skeleton placeholders matching each component's shape (card skeletons on Dashboard/Projects, row skeletons on Board/lists, shimmer on avatars).
- **Empty:** friendly copy + icon + a single clear CTA (e.g., "No tasks yet — create your first one").
- **Error (frontend-mock):** inline banner with retry action; never a blank white screen.
- **Permission-restricted:** a muted lock icon + "Ask an admin for access" message instead of hiding the entire nav item, so users understand the app's shape even if they can't act on it.

---

## 18. Responsive & Theming Notes

- Left Dock collapses to icons-only below a certain breakpoint already (per screenshots); on mobile it should become a bottom tab bar or slide-out drawer.
- Board columns scroll horizontally on narrow screens; Meet grid stacks vertically.
- Dark mode swaps the light indigo background for `oklch`-based near-black surfaces while keeping the same indigo accent for interactive elements, toggled instantly via the moon/sun icon with no page reload.

---

## 19. End-to-End Example Walkthrough (for reference when building the plan)

1. Sam signs up → creates "IUT Robotics" workspace → invites 2 teammates → creates "Project Altair" project.
2. Lands on Dashboard (empty state, since nothing scheduled yet) → goes to All Projects → opens "Project Altair" → Module Hub shows one group "Core Team" with Board/Chat/Notes/Meet tiles.
3. Schedules a meeting via Calendar → at meeting time, joins from Dashboard's "Join" button → Meet screen opens, linked note auto-created.
4. During the call, jots a checklist item in the linked note ("Fix PX4 SITL config") → converts it to a task → task appears in Board's Backlog with the note reference.
5. Leaves the call → returns to Module Hub → opens Board → drags the new task to "In Progress" → assigns a teammate → teammate gets a notification.
6. Later, Sam checks Dashboard → "Tasks Completed" and "Due Tasks" reflect the change; global search for "PX4" instantly surfaces the task, the note, and the meeting.

This walkthrough should serve as the acceptance-test narrative when the later `plan.md` breaks the frontend into buildable components/pages.
