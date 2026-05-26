# Notification Service Context

## Overview
The Notification Service is a multi-channel orchestration engine responsible for ingesting events from other microservices, intelligently grouping them, and delivering them via Real-time WebSockets (Socket.io), Web Push, and Email.

## Architecture
- **Language:** TypeScript (Node.js)
- **Framework:** Express.js
- **Database:** PostgreSQL (via Drizzle ORM)
- **Message Broker:** Redis (Pub/Sub for real-time events)
- **Job Queue:** BullMQ (Redis-backed for scheduled notifications like reminders)
- **Real-time:** Socket.io
- **Push:** Web-Push API (VAPID)
- **Email:** Nodemailer (SMTP)

---

## Database Schema
The service maintains five primary tables:
1.  **`users`**: Shadow table synced from Auth Service. Includes `email` for delivery.
2.  **`push_subscriptions`**: Stores browser/device-specific VAPID subscription objects.
3.  **`notifications`**: The core ledger. Stores type, rendered content, grouping metadata (`actorIds`, `actorCount`, `groupWindowId`), and delivery status.
4.  **`notification_delivery_log`**: Audit trail of every delivery attempt across channels.
5.  **`scheduled_jobs`**: Maps internal notification intents to BullMQ job IDs for cancellation/tracking.

---

## Integration: Redis Pub/Sub (Inbound)
Other services trigger notifications by publishing JSON payloads to specific Redis channels.

### Channels
- `project_events`
- `task_events`
- `chat_events`
- `meet_events`
- `note_events`
- `resource_events`

### Payload Example (`task.assigned`)
```json
{
  "type": "task.assigned",
  "data": {
    "taskId": "uuid",
    "taskTitle": "Fix bug",
    "assigneeId": "user-uuid",
    "assignerId": "actor-uuid",
    "assignerName": "John Doe",
    "projectId": "project-uuid",
    "projectName": "Mobile App"
  }
}
```

---

## Integration: Socket.io (Real-time Outbound)
The frontend should connect to the Notification Service via Socket.io.

### Connection
- **Endpoint:** `ws://<host>:<port>`
- **Query Param:** `userId` (Required for room assignment)
- **Example:** `const socket = io('http://localhost:8006', { query: { userId: '123' } });`

### Events to Listen For
- **`notification`**: Fired whenever a new notification is created or a group is updated.
  - **Payload:**
    ```json
    {
      "id": "notification-uuid",
      "type": "task.assigned",
      "title": "John Doe assigned you a task",
      "body": "Fix bug",
      "resourceUrl": "/projects/abc/board",
      "createdAt": "ISO-TIMESTAMP"
    }
    ```

---

## REST API (Outbound)
All endpoints are prefixed with `/api/notifications`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Get last 50 notifications (requires `?userId=`) |
| `GET` | `/unread-count` | Get total count of unread notifications (requires `?userId=`) |
| `PATCH` | `/:id/read` | Mark a specific notification as read |
| `PATCH` | `/read-all` | Mark all notifications for a user as read |
| `DELETE` | `/:id` | Delete a specific notification |

---

## Grouping Logic
Notifications are collapsed within a **2-minute window** if they share the same `userId`, `type`, and `entityId`.
- **First event:** Creates the notification row.
- **Subsequent events (within 2 min):** Appends the new `actorId` to the array and increments `actorCount`. The delivery layer re-fires the update via Socket.io.

---

## Delivery Matrix
| Type | Socket | Push | Email |
| :--- | :---: | :---: | :---: |
| `project.invitation` | ✓ | ✓ | ✓ |
| `task.assigned` | ✓ | ✓ | ✓ |
| `task.due_soon` | ✓ | ✓ | ✓ |
| `meet.scheduled` | ✓ | ✓ | ✓ |
| *Most others* | ✓ | ✓ | ✗ |
