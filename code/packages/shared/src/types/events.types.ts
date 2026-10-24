import type { RedisChannel } from '../constants/redis-channels.js';

/** Envelope for everything published on the Redis channels. */
export interface DomainEvent<T extends string = string, D = Record<string, unknown>> {
  type: T;
  data: D;
  timestamp?: string;
}

/** project_events */
export type ProjectEvent =
  | DomainEvent<'project.member_joined', { projectId: string; projectName: string; userId: string; userName: string }>
  | DomainEvent<'project.member_removed', { projectId: string; projectName: string; userId: string; actorId: string }>
  | DomainEvent<'project.role_changed', { projectId: string; projectName: string; userId: string; role: string; actorId: string }>
  | DomainEvent<'module.member_added', {
      projectId: string;
      moduleId: string;
      moduleName: string;
      userIds: string[];
      actorId: string;
      actorName: string;
    }>;

/** resource_events */
export type ResourceEvent = DomainEvent<'file.uploaded', {
  projectId: string;
  projectName: string;
  folderId: string | null;
  fileIds: string[];
  fileNames: string[];
  uploaderId: string;
  uploaderName: string;
  recipientIds: string[];
}>;

/** mail_events — transactional mail sent straight through SMTP. */
export type MailEvent = DomainEvent<'mail.password_reset', { to: string; name: string; url: string }>;

export interface PublishedEvent {
  channel: RedisChannel;
  event: DomainEvent;
}
