# Getting Started: Notification Service

This guide will help you set up and run the Notification Service locally for development and testing.

## Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v20+ recommended)
- **pnpm** (Package Manager)
- **PostgreSQL** (Database)
- **Redis** (For Pub/Sub and BullMQ)

---

## 1. Setup Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

### Essential Variables
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Service port | `8006` |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### Generating VAPID Keys (Push Notifications)
To enable browser push notifications, you need a VAPID key pair. Generate them using the built-in tool:
```bash
# From the notification-service root
./node_modules/.bin/web-push generate-vapid-keys
```
Copy the output into your `.env`:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

### SMTP Settings (Email)
For local testing, you can use a service like **Mailtrap** or **Ethereal Email**.
- `SMTP_HOST`: e.g., `smtp.gmail.com`
- `SMTP_USER`: Your email
- `SMTP_PASS`: Your App Password (not your login password)

---

## 2. Installation & Database

Install dependencies:
```bash
pnpm install
```

Generate and run database migrations:
```bash
pnpm run generate
pnpm run migrate
```

---

## 3. Development Commands

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Starts the service with `tsx watch` (Hot reload) |
| `pnpm run build` | Compiles TypeScript to `dist/` |
| `pnpm run start` | Runs the compiled service |
| `pnpm run test` | Runs the full Vitest suite (Connection, Unit, Integration) |

---

## 4. Manual Verification

### Testing Redis Ingestion
You can simulate an event from another service using `redis-cli`:
```bash
redis-cli publish task_events '{"type":"task.assigned","data":{"taskId":"123","taskTitle":"Test Task","assigneeId":"user-uuid","assignerId":"actor-uuid","assignerName":"Dev","projectId":"p1","projectName":"Vero"}}'
```

### Testing Socket.io
Use a tool like [Postman](https://www.postman.com/downloads/) or [Hopper](https://hoppscotch.io/) to connect to:
- **URL:** `ws://localhost:8006`
- **Query Params:** `userId=user-uuid`
- **Listen for:** `notification` events.

---

## 5. Troubleshooting
- **Database Connection Failed:** Ensure your Postgres server is running and the user has permissions to create tables.
- **Redis Connection Failed:** Check if Redis is running locally (`redis-cli ping` should return `PONG`).
- **Nodemailer/SMTP Error:** If using Gmail, ensure you have enabled 2FA and generated an **App Password**. Standard login passwords will be rejected.
