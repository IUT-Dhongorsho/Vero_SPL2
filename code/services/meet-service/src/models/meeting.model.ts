import {
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  authToken: text('auth_token'),
  refreshToken: text('refresh_token'),
});

export const meetingStatusEnum = pgEnum('meeting_status', ['active', 'ended']);

export const meetings = pgTable('meetings', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  startedBy: text('started_by')
    .notNull()
    .references(() => users.id),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  status: meetingStatusEnum('status').notNull().default('active'),
});

export const meetingParticipants = pgTable('meeting_participants', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
});

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  startedMeetings: many(meetings),
  participations: many(meetingParticipants),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const meetingRelations = relations(meetings, ({ one, many }) => ({
  startedByUser: one(users, {
    fields: [meetings.startedBy],
    references: [users.id],
  }),
  participants: many(meetingParticipants),
}));

export const participantRelations = relations(meetingParticipants, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingParticipants.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingParticipants.userId],
    references: [users.id],
  }),
}));
