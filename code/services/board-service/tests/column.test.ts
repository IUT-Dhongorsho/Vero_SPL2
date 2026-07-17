import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../src/db/client.js';
import { columns } from '../src/models/column.model.js';
import { projects } from '../src/models/project.model.js';
import { workspaces } from '../src/models/workspace.model.js';
import { tasks } from '../src/models/task.model.js';
import { columnService } from '../src/services/column.service.js';
import { eq, inArray } from 'drizzle-orm';

const WS_ID = '44444444-4444-4444-4444-444444444444';
const PROJ_ID = '55555555-5555-5555-5555-555555555555';
const USER_ID = '00000000-0000-0000-0000-000000000001';

async function cleanProjectData() {
  const colIds = await db.select({ id: columns.id }).from(columns).where(eq(columns.projectId, PROJ_ID));
  const ids = colIds.map(c => c.id);
  if (ids.length > 0) {
    await db.delete(tasks).where(inArray(tasks.columnId, ids));
  }
  await db.delete(columns).where(eq(columns.projectId, PROJ_ID));
}

beforeAll(async () => {
  await cleanProjectData();
  await db.delete(projects).where(eq(projects.id, PROJ_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WS_ID));

  await db.insert(workspaces).values({
    id: WS_ID, name: 'Column Test Workspace', ownerId: USER_ID,
  });
  await db.insert(projects).values({
    id: PROJ_ID, name: 'Column Test Project', workspaceId: WS_ID, ownerId: USER_ID,
  });
});

afterAll(async () => {
  await cleanProjectData();
  await db.delete(projects).where(eq(projects.id, PROJ_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WS_ID));
});

beforeEach(async () => {
  await cleanProjectData();
});

describe('Column Service', () => {
  it('should create 4 default columns on init', async () => {
    const cols = await columnService.initializeBoard(PROJ_ID);
    expect(cols.length).toBe(4);
    const names = cols.map((c: any) => c.name);
    expect(names).toContain('Backlog');
    expect(names).toContain('In Progress');
    expect(names).toContain('In Review');
    expect(names).toContain('Done');
  });

  it('should not create duplicate columns on second init', async () => {
    await columnService.initializeBoard(PROJ_ID);
    const cols = await columnService.initializeBoard(PROJ_ID);
    expect(cols.length).toBe(4);
  });

  it('should return columns with task counts', async () => {
    await columnService.initializeBoard(PROJ_ID);
    const cols = await columnService.getColumnsByProject(PROJ_ID);
    expect(cols.length).toBe(4);
    expect(cols[0]).toHaveProperty('taskCount');
  });

  it('should create a custom column', async () => {
    await columnService.initializeBoard(PROJ_ID);
    const col = await columnService.createColumn({
      name: 'Custom Column', projectId: PROJ_ID,
    });
    expect(col).toBeDefined();
    expect(col.name).toBe('Custom Column');
  });

  it('should update column name', async () => {
    await columnService.initializeBoard(PROJ_ID);
    const col = await columnService.createColumn({
      name: 'Rename Me', projectId: PROJ_ID,
    });
    const updated = await columnService.updateColumn(col.id, { name: 'Renamed' });
    expect(updated!.name).toBe('Renamed');
  });

  it('should delete a column', async () => {
    await columnService.initializeBoard(PROJ_ID);
    const col = await columnService.createColumn({
      name: 'Delete Me', projectId: PROJ_ID,
    });
    const deleted = await columnService.deleteColumn(col.id);
    expect(deleted).toBeDefined();
    const found = await columnService.getColumnById(col.id);
    expect(found).toBeNull();
  });
});
