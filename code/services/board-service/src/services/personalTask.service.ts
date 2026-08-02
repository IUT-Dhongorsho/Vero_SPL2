import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { personalTasks } from '../models/personalTask.model.js';

export const PERSONAL_TASK_STATUSES = ['backlog', 'in_progress', 'in_review', 'done'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type PersonalTaskStatus = (typeof PERSONAL_TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface CreatePersonalTaskInput {
  userId: string;
  title: string;
  description?: string;
  status?: PersonalTaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  labels?: string[] | string;
}

export interface UpdatePersonalTaskInput {
  title?: string;
  description?: string;
  status?: PersonalTaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  labels?: string[] | string;
  order?: number;
  pinned?: boolean;
}

function serialiseLabels(labels?: string[] | string): string | undefined {
  if (labels === undefined) return undefined;
  return Array.isArray(labels) ? labels.filter(Boolean).join(',') : labels;
}

function toDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const personalTaskService = {
  async list(userId: string) {
    return db
      .select()
      .from(personalTasks)
      .where(eq(personalTasks.userId, userId))
      .orderBy(desc(personalTasks.pinned), asc(personalTasks.order), desc(personalTasks.createdAt));
  },

  async getById(id: string, userId: string) {
    const [task] = await db
      .select()
      .from(personalTasks)
      .where(and(eq(personalTasks.id, id), eq(personalTasks.userId, userId)));
    return task ?? null;
  },

  async create(input: CreatePersonalTaskInput) {
    const status = input.status ?? 'backlog';
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${personalTasks.order}), -1)` })
      .from(personalTasks)
      .where(eq(personalTasks.userId, input.userId));

    const [task] = await db
      .insert(personalTasks)
      .values({
        userId: input.userId,
        title: input.title,
        description: input.description ?? '',
        status,
        priority: input.priority ?? 'medium',
        dueDate: toDate(input.dueDate) ?? null,
        labels: serialiseLabels(input.labels) ?? '',
        order: (max ?? -1) + 1,
        completedAt: status === 'done' ? new Date() : null,
      })
      .returning();

    return task;
  },

  async update(id: string, userId: string, input: UpdatePersonalTaskInput) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.order !== undefined) patch.order = input.order;
    if (input.pinned !== undefined) patch.pinned = input.pinned;

    const labels = serialiseLabels(input.labels);
    if (labels !== undefined) patch.labels = labels;

    const dueDate = toDate(input.dueDate);
    if (dueDate !== undefined) patch.dueDate = dueDate;

    if (input.status !== undefined) {
      patch.status = input.status;
      // Keep completedAt in step with status so the profile stats stay honest.
      patch.completedAt = input.status === 'done' ? new Date() : null;
    }

    const [task] = await db
      .update(personalTasks)
      .set(patch)
      .where(and(eq(personalTasks.id, id), eq(personalTasks.userId, userId)))
      .returning();

    return task ?? null;
  },

  async remove(id: string, userId: string) {
    const [deleted] = await db
      .delete(personalTasks)
      .where(and(eq(personalTasks.id, id), eq(personalTasks.userId, userId)))
      .returning();
    return deleted ?? null;
  },

  /** Bulk reorder used by the Progress board drag-and-drop. */
  async reorder(userId: string, items: { id: string; status: PersonalTaskStatus; order: number }[]) {
    for (const item of items) {
      await db
        .update(personalTasks)
        .set({
          status: item.status,
          order: item.order,
          completedAt: item.status === 'done' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(personalTasks.id, item.id), eq(personalTasks.userId, userId)));
    }
    return this.list(userId);
  },
};
