# Workspace overhaul

What changed in this pass, how the new pieces work, and what still needs your
input.

---

## Running it locally

PostgreSQL and Redis must already be running (both are expected on their default
ports, with the per-service databases listed in each `services/*/.env`).

```bash
cd code && ./scripts/dev-stack.sh
```

The script frees ports 3000 and 8001–8007 first, so it is safe to re-run while
something is already listening. Logs land in `code/.dev-logs/`.

| Command | What it does |
| --- | --- |
| `./scripts/dev-stack.sh` | Start every service plus the web app |
| `./scripts/dev-stack.sh status` | Show which ports are listening |
| `./scripts/dev-stack.sh stop` | Stop everything on the Vero ports |

The app is at **http://localhost:3000**.

| Service | Port |
| --- | --- |
| Web app (Vite) | 3000 |
| auth-service | 8001 |
| board-service | 8002 |
| notes-service | 8003 |
| project-service | 8004 |
| chat-service | 8005 (gRPC on 5005) |
| notification-service | 8006 |
| meet-service | 8007 |

---

## Navigation

The sidebar is now **Inbox, Calendar, Tasks, Progress, Projects** under
*Workspace*, with **Home**, and **Profile / Settings** under *Account*.

| Page | What lives there |
| --- | --- |
| **Home** | Greeting, work counters, "Up next", the Gmail widget, recent projects |
| **Inbox** | Direct messages, connection requests, file transfer, slash commands |
| **Calendar** | Month grid over every deadline, plus an agenda panel |
| **Tasks** | Your task list grouped by deadline, with full create/edit/delete |
| **Progress** | Drag-and-drop board over everything on your plate |
| **Projects** | Create or join projects — nothing else |
| **Profile** | Identity, links, project statistics, real time-on-site metrics |

---

## Inbox

### Adding someone

Search by **username or email** from *Add someone*. That sends a connection
request. Messaging only opens once the other person accepts — and if they had
already requested you, adding them back accepts immediately.

Connections are directed rows in `chat_db.connections`, and accepting is what
creates the direct channel the two of you talk in.

### Slash commands

Type `/` in the composer to see them inline. `/help` prints the same list into
the conversation.

| Command | What it does |
| --- | --- |
| `/help` | List every command |
| `/me <action>` | Sends an action line — *"Dev is heading out"* |
| `/shrug [text]` | Appends `¯\_(ツ)_/¯` |
| `/spoiler <text>` | Hides the text until the reader clicks it |
| `/task <title>` | Creates a personal task from the chat |
| `/remind <title> \| <when>` | Creates a task with a due date |
| `/clear` | Clears the conversation **from your view only** — nothing is deleted |

`/remind` understands `today`, `tomorrow`, `next week`, `in 3 days`,
`in 2 weeks`, a weekday name (`friday`, always the next one) or a plain date.

Example: `/remind ship the build | friday`

### File transfer

Attach with the paperclip, or paste a file straight into the composer. Images
render inline; everything else becomes a download card.

- 25 MB limit per file
- Executable and script types are rejected (`.exe`, `.sh`, `.js`, `.bat`, …)
- Uploads are rejected unless you are a member of the channel
- Stored names are randomised, and the download path cannot escape the upload
  directory

---

## Time-on-site metrics

The figures on the Profile page are measured, not estimated.

While the tab is **visible and you are active**, the browser sends a heartbeat
to `POST /user/activity/heartbeat` every 30 seconds. The server credits *only
the gap between two consecutive beats*, and only when that gap is 90 seconds or
less.

The consequence is what makes the number trustworthy:

- Background the tab, and the clock stops.
- Walk away for three minutes, and the clock stops.
- Close the laptop, and the clock stops — the next beat opens a new visit
  instead of crediting the hours in between.

Daily totals live in `auth_db.user_activity_days`; a per-route breakdown lives in
`user_activity_routes`, with ids collapsed so `/project/abc-123` buckets as
`/project/:id`. Streaks are computed from the set of active days.

---

## Gmail widget

Home shows your five most recent inbox messages. Clicking one opens it, and you
can reply inline — the reply is sent on the same Gmail thread — or open it in
Gmail.

**This needs credentials to do anything.** Until they are set, the widget says
so plainly rather than showing invented mail.

1. Create an OAuth client (Web application) in the Google Cloud console.
2. Add `http://localhost:8001/api/better-auth/callback/google` as an authorised
   redirect URI.
3. Add these scopes to the consent screen:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
4. Put the credentials in `services/auth-service/.env`:

   ```
   GOOGLE_CLIENT_ID=…
   GOOGLE_CLIENT_SECRET=…
   ```

5. Restart auth-service and sign in with Google. The consent prompt is forced
   with offline access so a refresh token is stored — without it the widget
   stops working after an hour.

Replies are only ever sent when you press **Send reply**.

---

## Bugs fixed along the way

These were already broken before this work and blocked everything else:

- **Auth returned 404 for every request.** Better Auth defaults `basePath` to
  `/api/auth`, but the Express route, the nginx rule and the browser client all
  use `/api/better-auth`.
- **Sign-in then returned 403.** `trustedOrigins` only listed `:5173`, while the
  dev server runs on `:3000`.
- **board-service crashed on boot** — `app.use(cors())` with no import.
- **board-service models disagreed with its own database.** Several id columns
  were declared `uuid` while the table holds `text`; Better Auth ids are opaque
  strings, not UUIDs.
- **Two board queries interpolated an array into `IN`**, which drizzle does not
  support — replaced with `inArray`.
- **`.glass` was used across the app but never defined**, so those surfaces
  rendered as transparent boxes.
- **Opening a project board failed on a foreign key**, because board-service had
  no replica row for a project owned by project-service.
- **The production build could not resolve `y-protocols/sync`.**

---

## Notes

- Two local fixture accounts exist for testing:
  `dev.fixture@vero.local` and `riya.fixture@vero.local`, both with the password
  `vero-dev-fixture-2026`. Delete them from `auth_db.user` when you no longer
  need them.
- The forgot-password screen is still a stub — it does not send mail yet. Wiring
  it to notification-service is the remaining piece.
