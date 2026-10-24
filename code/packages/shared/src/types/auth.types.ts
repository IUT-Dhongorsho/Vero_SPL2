/** A user as replicated into each service from auth-service's `user_events`. */
export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export type UserEventType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'SESSION_CREATED'
  | 'SESSION_DELETED';
