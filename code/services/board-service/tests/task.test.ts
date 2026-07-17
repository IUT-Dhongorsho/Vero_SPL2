import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../src/db/client.js';
import { tasks } from '../src/models/task.model.js';
import { columns } from '../src/models/column.model.js';
import { projects } from '../src/models/project.model.js';
import { workspaces } from '../src/models/workspace.model.js';
import { taskService } from '../src/services/task.service.js';
import { eq, inArray } from 'drizzle-orm';

const WS_ID = '11111111-1111-1111-1111-111111111111';
const PROJ_ID = '22222222-2222-2222-2222-222222222222';
const COL_ID = '33333333-3333-3333-3333-333333333333';
const USER_ID = '00000000-0000-0000-0000-000000000001';

async function cleanProjectTasks() {
  const colIds = await db.select({ id: columns.id }).from(columns).where(eq(columns.projectId, PROJ_ID));
  const ids = colIds.map(c => c.id);
  if (ids.length > 0) {
    await db.delete(tasks).where(inArray(tasks.columnId, ids));
  }
}

beforeAll(async () => {
  await cleanProjectTasks();
  await db.delete(columns).where(eq(columns.projectId, PROJ_ID));
  await db.delete(projects).where(eq(projects.id, PROJ_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WS_ID));

  await db.insert(workspaces).values({
    id: WS_ID, name: 'Task Test Workspace', ownerId: USER_ID,
  });
  await db.insert(projects).values({
    id: PROJ_ID, name: 'Task Test Project', workspaceId: WS_ID, ownerId: USER_ID,
  });
  await db.insert(columns).values({
    id: COL_ID, name: 'Backlog', order: 0, projectId: PROJ_ID,
  });
});

afterAll(async () => {
  await cleanProjectTasks();
  await db.delete(columns).where(eq(columns.projectId, PROJ_ID));
  await db.delete(projects).where(eq(projects.id, PROJ_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WS_ID));
});

beforeEach(async () => {
  await cleanProjectTasks();
});

describe('Task Service', () => {
  it('should create a task with correct defaults', async () => {
    const task = await taskService.createTask({
      title: 'Test Task',
      description: 'A test task',
      columnId: COL_ID,
      creatorId: USER_ID,
      priority: 'medium',
    });

    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('A test task');
    expect(task.order).toBe(0);
    expect(task.columnId).toBe(COL_ID);
    expect(task.priority).toBe('medium');
    expect(task.status).toBe('backlog');
  });

  it('should auto-increment order for multiple tasks', async () => {
    const task1 = await taskService.createTask({
      title: 'Task 1', columnId: COL_ID, creatorId: USER_ID,
    });
    const task2 = await taskService.createTask({
      title: 'Task 2', columnId: COL_ID, creatorId: USER_ID,
    });

    expect(task1.order).toBe(0);
    expect(task2.order).toBe(1);
  });

  it('should return a task by id', async () => {
    const created = await taskService.createTask({
      title: 'Find Me', columnId: COL_ID, creatorId: USER_ID,
    });
    const found = await taskService.getTaskById(created.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Find Me');
  });

  it('should return null for non-existent task', async () => {
    const found = await taskService.getTaskById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('should update task fields', async () => {
    const task = await taskService.createTask({
      title: 'Original', columnId: COL_ID, creatorId: USER_ID,
    });
    const updated = await taskService.updateTask(task.id, {
      title: 'Updated', priority: 'high',
    });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Updated');
    expect(updated!.priority).toBe('high');
  });

  it('should delete a task', async () => {
    const task = await taskService.createTask({
      title: 'Delete Me', columnId: COL_ID, creatorId: USER_ID,
    });
    const deleted = await taskService.deleteTask(task.id);
    expect(deleted).toBeDefined();
    const found = await taskService.getTaskById(task.id);
    expect(found).toBeNull();
  });

  it('should move task within same column (reorder)', async () => {
    const task1 = await taskService.createTask({
      title: 'Task 1', columnId: COL_ID, creatorId: USER_ID,
    });
    const task2 = await taskService.createTask({
      title: 'Task 2', columnId: COL_ID, creatorId: USER_ID,
    });

    // Move task2 (order 1) to position 0
    const moved = await taskService.moveTask(task2.id, {
      columnId: COL_ID, order: 0,
    });
    expect(moved!.order).toBe(0);

    const refreshed1 = await taskService.getTaskById(task1.id);
    expect(refreshed1!.order).toBe(1);
  });

  it('should move task to different column', async () => {
    const [newCol] = await db.insert(columns).values({
      name: 'In Progress', order: 1, projectId: PROJ_ID,
    }).returning();

    const task = await taskService.createTask({
      title: 'Move Me', columnId: COL_ID, creatorId: USER_ID,
    });
    const moved = await taskService.moveTask(task.id, {
      columnId: newCol.id, order: 0,
    });
    expect(moved!.columnId).toBe(newCol.id);
    expect(moved!.status).toBe('in_progress');

    await db.delete(columns).where(eq(columns.id, newCol.id));
  });

  it('should return all tasks for a project', async () => {
    await taskService.createTask({
      title: 'Task A', columnId: COL_ID, creatorId: USER_ID,
    });
    await taskService.createTask({
      title: 'Task B', columnId: COL_ID, creatorId: USER_ID,
    });

    const result = await taskService.getTasksByProject(PROJ_ID);
    expect(result.length).toBe(2);
  });
});
