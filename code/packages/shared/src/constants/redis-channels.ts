/**
 * Redis pub/sub channels shared by the services. Every message is a JSON
 * `DomainEvent` (see types/events.types.ts).
 */
export const REDIS_CHANNELS = {
  /** Identity replication from auth-service: USER_* and SESSION_* events. */
  USER_EVENTS: 'user_events',
  /** Project membership, module membership and project lifecycle. */
  PROJECT_EVENTS: 'project_events',
  /** Project board tasks. */
  TASK_EVENTS: 'task_events',
  /** Chat messages and connection requests. */
  CHAT_EVENTS: 'chat_events',
  /** Meetings (meet-service). */
  MEET_EVENTS: 'meet_events',
  /** Notes documents. */
  NOTE_EVENTS: 'note_events',
  /** Project file library. */
  RESOURCE_EVENTS: 'resource_events',
  /** Transactional mail that must not become an in-app notification. */
  MAIL_EVENTS: 'mail_events',
} as const;

export type RedisChannel = (typeof REDIS_CHANNELS)[keyof typeof REDIS_CHANNELS];

/** BullMQ queue names. */
export const QUEUES = {
  RESOURCE_ORCHESTRATION: 'resource-orchestration',
  NOTIFICATION_SCHEDULING: 'notification-scheduling',
  AI_JOBS: 'ai-jobs',
} as const;
