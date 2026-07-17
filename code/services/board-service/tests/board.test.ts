import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../src/db/client.js';
import { tasks } from '../src/models/task.model.js';
import { columns } from '../src/models/column.model.js';
import { projects } from '../src/models/project.model.js';
import { workspaces } from '../src/models/workspace.model.js';
import { taskService } from '../src/services/task.service.js';
import { columnService } from '../src/services/column.service.js';
import { eq } from 'drizzle-orm';

const WS_ID = '66666666-6666-6666-6666-666666666666';
const PROJ_ID = '77777777-7777-7777-7777-777777777777';
const USER_ID = '00000000-0000-0000-0000-000000000001';

let backlogCol: any;
let inProgressCol: any;
let inReviewCol: any;
let doneCol: any;

async function nukeTestData() {
  // First find all projects under this workspace (including test-created ones)
  const allProjIds = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, WS_ID));
  for (const p of allProjIds) {
    const colIds = await db.select({ id: columns.id }).from(columns).where(eq(columns.projectId, p.id));
    for (const c of colIds) {
      await db.delete(tasks).where(eq(tasks.columnId, c.id));
    }
    await db.delete(columns).where(eq(columns.projectId, p.id));
  }
  await db.delete(projects).where(eq(projects.workspaceId, WS_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WS_ID));
}

beforeAll(async () => {
  await nukeTestData();

  await db.insert(workspaces).values({
    id: WS_ID, name: 'Integration Workspace', ownerId: USER_ID,
  });
  await db.insert(projects).values({
    id: PROJ_ID, name: 'Integration Project', workspaceId: WS_ID, ownerId: USER_ID,
  });

  const cols = await columnService.initializeBoard(PROJ_ID);
  backlogCol = cols.find((c: any) => c.name === 'Backlog');
  inProgressCol = cols.find((c: any) => c.name === 'In Progress');
  inReviewCol = cols.find((c: any) => c.name === 'In Review');
  doneCol = cols.find((c: any) => c.name === 'Done');
});

afterAll(async () => {
  await nukeTestData();
});

beforeEach(async () => {
  // Clean only tasks under this project's columns
  const colIds = await db.select({ id: columns.id }).from(columns).where(eq(columns.projectId, PROJ_ID));
  for (const c of colIds) {
    await db.delete(tasks).where(eq(tasks.columnId, c.id));
  }
});

describe('Board Integration', () => {
  it('should create tasks across columns and track counts', async () => {
    await taskService.createTask({
      title: 'Task 1', columnId: backlogCol.id, creatorId: USER_ID,
    });
    await taskService.createTask({
      title: 'Task 2', columnId: backlogCol.id, creatorId: USER_ID,
    });
    await taskService.createTask({
      title: 'Task 3', columnId: inProgressCol.id, creatorId: USER_ID,
    });

    const counts = await taskService.getColumnTaskCounts(PROJ_ID);
    expect(counts[backlogCol.id]).toBe(2);
    expect(counts[inProgressCol.id]).toBe(1);
  });

  it('should move task from backlog to in progress', async () => {
    const task = await taskService.createTask({
      title: 'Move Test', columnId: backlogCol.id, creatorId: USER_ID,
    });

    const moved = await taskService.moveTask(task.id, {
      columnId: inProgressCol.id, order: 0,
    });

    expect(moved).toBeDefined();
    expect(moved!.columnId).toBe(inProgressCol.id);
    expect(moved!.status).toBe('in_progress');
  });

  it('should move task through entire workflow', async () => {
    const task = await taskService.createTask({
      title: 'Full Flow', columnId: backlogCol.id, creatorId: USER_ID,
    });

    let moved = await taskService.moveTask(task.id, {
      columnId: inProgressCol.id, order: 0,
    });
    expect(moved).toBeDefined();
    expect(moved!.status).toBe('in_progress');

    moved = await taskService.moveTask(task.id, {
      columnId: inReviewCol.id, order: 0,
    });
    expect(moved).toBeDefined();
    expect(moved!.status).toBe('in_review');

    moved = await taskService.moveTask(task.id, {
      columnId: doneCol.id, order: 0,
    });
    expect(moved).toBeDefined();
    expect(moved!.status).toBe('done');
  });

  it('should isolate projects', async () => {
    const OTHER_PROJ = '88888888-8888-8888-8888-888888888888';
    const OTHER_COL = '99999999-9999-9999-9999-999999999999';

    // Clean other project
    await db.delete(tasks).where(eq(tasks.columnId, OTHER_COL));
    await db.delete(columns).where(eq(columns.projectId, OTHER_PROJ));
    await db.delete(projects).where(eq(projects.id, OTHER_PROJ));

    await db.insert(projects).values({
      id: OTHER_PROJ, name: 'Other Project', workspaceId: WS_ID, ownerId: USER_ID,
    });
    await db.insert(columns).values({
      id: OTHER_COL, name: 'Backlog', order: 0, projectId: OTHER_PROJ,
    });

    await taskService.createTask({
      title: 'Main Task', columnId: backlogCol.id, creatorId: USER_ID,
    });
    await taskService.createTask({
      title: 'Other Task', columnId: OTHER_COL, creatorId: USER_ID,
    });

    const mainTasks = await taskService.getTasksByProject(PROJ_ID);
    const otherTasks = await taskService.getTasksByProject(OTHER_PROJ);

    expect(otherTasks.length).toBe(1);
    expect(otherTasks[0].title).toBe('Other Task');
    expect(mainTasks.length).toBeGreaterThanOrEqual(1);

    // Cleanup other project
    await db.delete(tasks).where(eq(tasks.columnId, OTHER_COL));
    await db.delete(columns).where(eq(columns.projectId, OTHER_PROJ));
    await db.delete(projects).where(eq(projects.id, OTHER_PROJ));
  });
});
