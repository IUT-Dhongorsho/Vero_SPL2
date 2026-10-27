import { db } from '../db/client.js';
import { tasks, taskAssignees } from '../models/task.model.js';
import { columns } from '../models/column.model.js';
import { projects } from '../models/project.model.js';
import { users } from '../models/user.model.js';
import { eq, asc, count, and, inArray, isNotNull, sql, or } from 'drizzle-orm';

export interface CreateTaskInput {
  title: string;
  description?: string;
  columnId: string;
  assigneeId?: string;
  assigneeIds?: string[];
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
  assigneeIds?: string[];
  dueDate?: string | null;
  labels?: string[] | string;
  status?: 'backlog' | 'in_progress' | 'in_review' | 'done';
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

    const taskRows = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.columnId, columnIds))
      .orderBy(asc(tasks.order));

    if (taskRows.length === 0) return [];

    // Fetch normalized assignees from junction table
    const taskIds = taskRows.map(t => t.id);
    const assigneesRows = await db
      .select({
        taskId: taskAssignees.taskId,
        userId: taskAssignees.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
      })
      .from(taskAssignees)
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(inArray(taskAssignees.taskId, taskIds));

    const assigneesByTask = new Map<string, Array<{ id: string; name: string; avatarUrl: string | null }>>();
    for (const a of assigneesRows) {
      if (!assigneesByTask.has(a.taskId)) assigneesByTask.set(a.taskId, []);
      assigneesByTask.get(a.taskId)!.push({
        id: a.userId,
        name: a.userName || 'Member',
        avatarUrl: a.userAvatar ?? null,
      });
    }

    return taskRows.map(t => ({
      ...t,
      assignees: assigneesByTask.get(t.id) || (t.assigneeId ? [{ id: t.assigneeId, name: 'Member', avatarUrl: null }] : []),
    }));
  },

  /**
   * Every project task assigned to this user, across all boards, enriched with
   * the column and project it belongs to. Backs the personal Progress board.
   */
  async getTasksAssignedTo(userId: string) {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        labels: tasks.labels,
        order: tasks.order,
        assigneeId: tasks.assigneeId,
        creatorId: tasks.creatorId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        columnId: tasks.columnId,
        columnName: columns.name,
        boardId: columns.projectId,
        moduleName: projects.name,
        parentProjectId: projects.parentProjectId,
        parentProjectName: projects.parentProjectName,
      })
      .from(tasks)
      .innerJoin(columns, eq(tasks.columnId, columns.id))
      .leftJoin(projects, eq(columns.projectId, projects.id))
      .leftJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
      .where(or(eq(tasks.assigneeId, userId), eq(taskAssignees.userId, userId)))
      .orderBy(asc(tasks.order));

    // Boards are per module: `moduleId` is the board, `projectId` its project,
    // which together give the board route in the app.
    return rows.map(({ boardId, moduleName, parentProjectId, parentProjectName, ...row }) => ({
      ...row,
      source: 'project' as const,
      labels: row.labels ? row.labels.split(',').filter(Boolean) : [],
      moduleId: boardId,
      moduleName: moduleName ?? 'Module',
      projectId: parentProjectId ?? boardId,
      projectName: parentProjectName ?? moduleName ?? 'Untitled project',
    }));
  },

  /** Aggregate counts for the profile statistics panel. */
  async getStatsFor(userId: string) {
    const [assigned] = await db
      .select({
        total: sql<number>`count(*)::int`,
        done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
        inProgress: sql<number>`count(*) filter (where ${tasks.status} in ('in_progress','in_review'))::int`,
        overdue: sql<number>`count(*) filter (where ${tasks.dueDate} < now() and ${tasks.status} <> 'done')::int`,
      })
      .from(tasks)
      .where(eq(tasks.assigneeId, userId));

    const [created] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.creatorId, userId));

    const boards = await db
      .selectDistinct({ projectId: columns.projectId })
      .from(tasks)
      .innerJoin(columns, eq(tasks.columnId, columns.id))
      .where(and(eq(tasks.assigneeId, userId), isNotNull(columns.projectId)));

    return {
      assignedTotal: assigned?.total ?? 0,
      assignedDone: assigned?.done ?? 0,
      assignedInProgress: assigned?.inProgress ?? 0,
      assignedOverdue: assigned?.overdue ?? 0,
      createdTotal: created?.total ?? 0,
      boardsInvolved: boards.length,
    };
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

    const assigneeList = Array.from(new Set([
      ...(input.assigneeIds || []),
      ...(input.assigneeId ? [input.assigneeId] : [])
    ])).filter(Boolean);

    const [task] = await db
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description || '',
        order: nextOrder,
        columnId: input.columnId,
        assigneeId: assigneeList[0] || null,
        creatorId: input.creatorId,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        priority: input.priority || 'medium',
        status,
        labels: (input.labels || []).join(','),
      })
      .returning();

    if (assigneeList.length > 0) {
      await db.insert(taskAssignees).values(
        assigneeList.map(userId => ({
          taskId: task.id,
          userId,
        }))
      ).onConflictDoNothing();
    }

    const assigneesRows = assigneeList.length > 0
      ? await db
          .select({
            userId: taskAssignees.userId,
            userName: users.name,
            userAvatar: users.avatarUrl,
          })
          .from(taskAssignees)
          .leftJoin(users, eq(taskAssignees.userId, users.id))
          .where(eq(taskAssignees.taskId, task.id))
      : [];

    return {
      ...task,
      assignees: assigneesRows.map(a => ({
        id: a.userId,
        name: a.userName || 'Member',
        avatarUrl: a.userAvatar ?? null,
      })),
    };
  },

  async updateTask(id: string, input: UpdateTaskInput) {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    // `labels` is a comma-separated text column, so an array has to be flattened.
    if (input.labels !== undefined) {
      updateData.labels = Array.isArray(input.labels) ? input.labels.filter(Boolean).join(',') : input.labels;
    }
    if (input.status !== undefined) updateData.status = input.status;

    if (input.assigneeIds !== undefined) {
      const cleanList = Array.from(new Set(input.assigneeIds.filter(Boolean)));
      updateData.assigneeId = cleanList[0] || null;

      // Update junction table
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, id));
      if (cleanList.length > 0) {
        await db.insert(taskAssignees).values(
          cleanList.map(userId => ({
            taskId: id,
            userId,
          }))
        ).onConflictDoNothing();
      }
    } else if (input.assigneeId !== undefined) {
      updateData.assigneeId = input.assigneeId;
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, id));
      if (input.assigneeId) {
        await db.insert(taskAssignees).values({
          taskId: id,
          userId: input.assigneeId,
        }).onConflictDoNothing();
      }
    }

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (!task) return null;

    const assigneesRows = await db
      .select({
        userId: taskAssignees.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
      })
      .from(taskAssignees)
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, id));

    return {
      ...task,
      assignees: assigneesRows.map(a => ({
        id: a.userId,
        name: a.userName || 'Member',
        avatarUrl: a.userAvatar ?? null,
      })),
    };
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
      .where(inArray(tasks.columnId, projectColumns.map(c => c.id)))
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
