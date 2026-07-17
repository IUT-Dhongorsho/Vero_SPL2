import { db } from '../db/client.js';
import { columns } from '../models/column.model.js';
import { tasks } from '../models/task.model.js';
import { eq, asc, count, sql } from 'drizzle-orm';

const DEFAULT_COLUMNS = [
  { name: 'Backlog', order: 0 },
  { name: 'In Progress', order: 1 },
  { name: 'In Review', order: 2 },
  { name: 'Done', order: 3 },
];

export interface CreateColumnInput {
  name: string;
  projectId: string;
}

export interface UpdateColumnInput {
  name?: string;
  order?: number;
}

export const columnService = {
  async getColumnsByProject(projectId: string) {
    const cols = await db
      .select()
      .from(columns)
      .where(eq(columns.projectId, projectId))
      .orderBy(asc(columns.order));

    const counts = await db
      .select({
        columnId: tasks.columnId,
        count: count(),
      })
      .from(tasks)
      .where(sql`${tasks.columnId} IN (SELECT id FROM columns WHERE project_id = ${projectId})`)
      .groupBy(tasks.columnId);

    const countMap: Record<string, number> = {};
    for (const c of counts) {
      countMap[c.columnId] = c.count;
    }

    return cols.map(col => ({
      ...col,
      taskCount: countMap[col.id] || 0,
    }));
  },

  async getColumnById(id: string) {
    const [col] = await db
      .select()
      .from(columns)
      .where(eq(columns.id, id));
    return col || null;
  },

  async createColumn(input: CreateColumnInput) {
    const [maxOrder] = await db
      .select({ max: sql<number>`coalesce(max(${columns.order}), -1)` })
      .from(columns)
      .where(eq(columns.projectId, input.projectId));

    const nextOrder = (maxOrder?.max ?? -1) + 1;

    const [col] = await db
      .insert(columns)
      .values({
        name: input.name,
        order: nextOrder,
        projectId: input.projectId,
      })
      .returning();

    return col;
  },

  async updateColumn(id: string, input: UpdateColumnInput) {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.order !== undefined) updateData.order = input.order;

    const [col] = await db
      .update(columns)
      .set(updateData)
      .where(eq(columns.id, id))
      .returning();

    return col;
  },

  async deleteColumn(id: string) {
    const [deleted] = await db
      .delete(columns)
      .where(eq(columns.id, id))
      .returning();
    return deleted;
  },

  async initializeBoard(projectId: string) {
    const existing = await db
      .select({ id: columns.id })
      .from(columns)
      .where(eq(columns.projectId, projectId))
      .limit(1);

    if (existing.length > 0) {
      return this.getColumnsByProject(projectId);
    }

    const created = await db
      .insert(columns)
      .values(DEFAULT_COLUMNS.map(col => ({
        name: col.name,
        order: col.order,
        projectId,
      })))
      .returning();

    return created;
  },
};
