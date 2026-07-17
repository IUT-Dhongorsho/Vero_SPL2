import { db } from '../db/client.js';
import { tasks } from '../models/task.model.js';
import { columns } from '../models/column.model.js';
import { eq, asc, count, and, sql } from 'drizzle-orm';

export interface CreateTaskInput {
  title: string;
  description?: string;
  columnId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  labels?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string | null;
  dueDate?: string | null;
  labels?: string[];
}

export interface MoveTaskInput {
  columnId: string;
  order: number;
}

export const taskService = {
  async getTasksByProject(projectId: string) {
    const projectColumns = await db
      .select({ id: columns.id })
      .from(columns)
      .where(eq(columns.projectId, projectId));

    if (projectColumns.length === 0) return [];

    const columnIds = projectColumns.map(c => c.id);

    return db
      .select()
      .from(tasks)
      .where(sql`${tasks.columnId} IN ${columnIds}`)
      .orderBy(asc(tasks.order));
  },

  async getTasksByColumn(columnId: string) {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.columnId, columnId))
      .orderBy(asc(tasks.order));
  },

  async getTaskById(id: string) {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    return task || null;
  },

  async createTask(input: CreateTaskInput) {
    const [maxOrder] = await db
      .select({ max: sql<number>`coalesce(max(${tasks.order}), -1)` })
      .from(tasks)
      .where(eq(tasks.columnId, input.columnId));

    const nextOrder = (maxOrder?.max ?? -1) + 1;

    const column = await db
      .select({ name: columns.name })
      .from(columns)
      .where(eq(columns.id, input.columnId));

    const status = columnStatusMap[column[0]?.name?.toLowerCase()] || 'backlog';

    const [task] = await db
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description || '',
        order: nextOrder,
        columnId: input.columnId,
        assigneeId: input.assigneeId || null,
        creatorId: input.creatorId,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        priority: input.priority || 'medium',
        status,
        labels: (input.labels || []).join(','),
      })
      .returning();

    return task;
  },

  async updateTask(id: string, input: UpdateTaskInput) {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.assigneeId !== undefined) updateData.assigneeId = input.assigneeId;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.labels !== undefined) updateData.labels = input.labels;

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    return task;
  },

  async deleteTask(id: string) {
    const [deleted] = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    return deleted;
  },

  async moveTask(id: string, input: MoveTaskInput) {
    const task = await this.getTaskById(id);
    if (!task) throw new Error('Task not found');

    const oldColumnId = task.columnId;
    const newColumnId = input.columnId;
    const newOrder = input.order;

    // Determine new status from column name
    const column = await db
      .select({ name: columns.name })
      .from(columns)
      .where(eq(columns.id, newColumnId));
    const newStatus = columnStatusMap[column[0]?.name?.toLowerCase()] || 'backlog';

    if (oldColumnId === newColumnId) {
      // Same column reorder
      if (task.order === newOrder) return task;

      if (task.order < newOrder) {
        // Moving down: shift tasks between old+1 and new up by -1
        await db.update(tasks)
          .set({ order: sql`${tasks.order} - 1` })
          .where(and(
            eq(tasks.columnId, oldColumnId),
            sql`${tasks.order} > ${task.order} AND ${tasks.order} <= ${newOrder}`
          ));
      } else {
        // Moving up: shift tasks between new and old-1 down by +1
        await db.update(tasks)
          .set({ order: sql`${tasks.order} + 1` })
          .where(and(
            eq(tasks.columnId, oldColumnId),
            sql`${tasks.order} >= ${newOrder} AND ${tasks.order} < ${task.order}`
          ));
      }
    } else {
      // Cross-column move

      // 1. Close gap in source column (shift tasks after this one up)
      await db.update(tasks)
        .set({ order: sql`${tasks.order} - 1` })
        .where(and(
          eq(tasks.columnId, oldColumnId),
          sql`${tasks.order} > ${task.order}`
        ));

      // 2. Make room in target column (shift tasks at/after target down)
      //    Use columnId check to avoid touching the task being moved
      await db.update(tasks)
        .set({ order: sql`${tasks.order} + 1` })
        .where(and(
          eq(tasks.columnId, newColumnId),
          sql`${tasks.order} >= ${newOrder}`
        ));
    }

    // 3. Update the task itself
    const [updated] = await db
      .update(tasks)
      .set({
        columnId: newColumnId,
        order: newOrder,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    return updated;
  },

  async getColumnTaskCounts(projectId: string) {
    const projectColumns = await db
      .select({ id: columns.id })
      .from(columns)
      .where(eq(columns.projectId, projectId));

    if (projectColumns.length === 0) return {};

    const counts = await db
      .select({
        columnId: tasks.columnId,
        count: count(),
      })
      .from(tasks)
      .where(sql`${tasks.columnId} IN ${projectColumns.map(c => c.id)}`)
      .groupBy(tasks.columnId);

    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.columnId] = c.count;
    }
    return result;
  },
};

const columnStatusMap: Record<string, string> = {
  'backlog': 'backlog',
  'in progress': 'in_progress',
  'in review': 'in_review',
  'done': 'done',
};
