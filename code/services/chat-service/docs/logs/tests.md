# Chat Service Testing Log

## Unit Tests (`tests/unit/`)

### 1. `auth.middleware.test.ts`
- **Purpose:** Verifies the decentralized JWT verification logic.
- **Scenarios:** 
  - Valid token acceptance and user attachment to socket.
  - Rejection of connections with missing tokens.
  - Rejection of connections with invalid/expired tokens.

### 2. `message.handler.test.ts`
- **Purpose:** Validates the core "Persist first, then broadcast" logic in isolation.
- **Scenarios:**
  - Successful registration of socket listeners.
  - Message processing: Verifies that the service checks channel membership, calls the persistence layer, and finally emits the message to the room.
  - Error handling: Ensures users cannot send messages to rooms they haven't joined.

### 3. `presence.store.test.ts`
- **Purpose:** Tests the integration between the presence logic and the Redis storage layer.
- **Scenarios:**
  - Setting users online with appropriate timestamps.
  - Setting users offline.
  - Ensures Redis hash keys are correctly formatted.

### 4. `subscriber.test.ts`
- **Purpose:** Validates the event-driven synchronization of the local user reference table.
- **Scenarios:**
  - Processing `USER_CREATED` events.
  - Ensures idempotent updates to the local `users` table using `onConflictDoUpdate`.

## Integration Tests (`tests/integration/`)

### 1. `persistence.test.ts`
- **Purpose:** End-to-end validation of the database persistence layer using Drizzle ORM and a live PostgreSQL connection.
- **Scenarios:**
  - Full flow: Setup user/channel -> Save message -> Query DB to verify row exists with correct content and relations.

### 2. `receipts.test.ts`
- **Purpose:** Verifies the functional requirement for read receipts and their correct attribution in the database.
- **Scenarios:**
  - Ensures receipts are correctly linked to both messages and users.
  - Validates that receipt statuses ('delivered', 'read') are persisted accurately.

## Test Summary
- **Runner:** Vitest
- **Total Tests:** 11
- **Status:** All Passed
- **Coverage Strategy:** Focus on critical path (Auth -> Member Check -> Persistence -> Broadcast) and cross-service data consistency.
