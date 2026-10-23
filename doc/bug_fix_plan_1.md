# Vero Project — Bug Audit & Mitigation Plan (Phase 1)

This document maps out identified database schema, build/compilation, and credential issues, alongside the exact mitigation steps for implementation.

---

## 1. Identified Issues & Mitigation Steps

### Issue 1.1: Database Schema Type Mismatch in `board-service`
* **Problem:** In `board-service/src/models/project.model.ts` and `workspace.model.ts`, the primary keys are defined as `text('id')` without defaults. However, in `column.model.ts` and `member.model.ts`, their foreign keys are defined as `uuid('project_id')` and `uuid('workspace_id')`.
* **Impact:** Mismatched types between primary keys and foreign keys prevent Drizzle migration verification and throw PostgreSQL schema execution errors. Also, queries inside `workspace.service` and `project.service` crash on `.values()` inserts due to missing required `id` values.
* **Mitigation:**
  - Update `projects` table in `board-service` to use `id: uuid('id').primaryKey().defaultRandom()`.
  - Update `workspaces` table in `board-service` to use `id: uuid('id').primaryKey().defaultRandom()`.
  - Ensure all service methods accommodate these types.

---

### Issue 1.2: Express Parameter Deconstruction Type Errors
* **Problem:** Deconstructed express URL parameters (e.g. `req.params.projectId`, `req.params.id`, `req.params.roomId`) inside `board-service` and `meet-service` controllers compile as `string | string[]` rather than strict `string`.
* **Impact:** Compilation failures when passing these arguments to service layers.
* **Mitigation:**
  - Explicitly cast parameter lookups as `string` in:
    * `board-service/src/controllers/board.controller.ts`
    * `board-service/src/controllers/column.controller.ts`
    * `board-service/src/controllers/task.controller.ts`
    * `meet-service/src/controllers/room.controller.ts`

---

### Issue 1.3: Mediasoup SFU Typings & Parameter Specification Mismatch
* **Problem:** 
  1. `RtpCodecCapability` definitions in `meet-service/src/sfu/router.ts` are missing `preferredPayloadType`.
  2. `meet-service/src/sfu/transport.ts` specifies `minimumAvailableOutgoingBitrate` which does not exist in Mediasoup's `WebRtcTransportOptions`.
* **Impact:** `tsc` compilation errors in `meet-service`.
* **Mitigation:**
  - Assign valid `preferredPayloadType` numbers to Opus (111), VP8 (96), VP9 (98), and H264 (102/104) codecs.
  - Remove `minimumAvailableOutgoingBitrate` from transport config.

---

### Issue 1.4: Relative Import Path Failures in Frontend UI
* **Problem:** Shared note types are imported in the frontend using 4 parent directories (`../../../../packages/shared/...`). Since `notes` files reside under `src/pages/notes/`, they are 5 directory levels deep from the workspace root.
* **Impact:** Cannot resolve `@repo/shared` modules, causing frontend compilation to crash.
* **Mitigation:**
  - Shift relative imports to 5 parent steps (`../../../../../packages/shared/...`) or map dependency linking.

---

### Issue 1.5: Frontend Signup `githubHandle` Mismatch
* **Problem:** `SignupPage.tsx` passes `githubHandle` during form submission to `authService.signup`, which expects only `name`, `email`, and `password`.
* **Impact:** TypeScript compilation error.
* **Mitigation:**
  - Remove `githubHandle` from the signup data payload.

---

## 2. Mock Credentials Strategy
* **Goal:** Simplify testing for teammates when OAuth variables are unconfigured.
* **Implementation Plan:**
  - Setup a default fallback mock user in `LoginPage.tsx`:
    * **Email:** `demo@vero.com`
    * **Password:** `password123`
  - Render a "Demo Mode" quick login card on the login screen.
  - Clicking "Demo Login" automatically prefills the form and logs in.
  - Disable user signup overrides if they don't match the standard payload schema.
