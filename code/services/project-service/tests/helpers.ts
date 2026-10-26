import crypto from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { sessions, users } from '../src/models/user.model.js';
import { projects } from '../src/models/workspace.model.js';

export interface TestUser {
  id: string;
  name: string;
  token: string;
  auth: { Authorization: string };
}

/** Users plus live sessions in the replica tables, as auth-service would sync them. */
export async function seedUsers(names: string[]): Promise<TestUser[]> {
  const seeded = names.map((name) => {
    const id = `test-${name.toLowerCase()}-${crypto.randomBytes(4).toString('hex')}`;
    const token = crypto.randomBytes(24).toString('hex');
    return { id, name, token, auth: { Authorization: `Bearer ${token}` } };
  });

  await db.insert(users).values(seeded.map((u) => ({ id: u.id, name: u.name })));
  await db.insert(sessions).values(
    seeded.map((u) => ({
      id: `sess-${u.id}`,
      token: u.token,
      userId: u.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }))
  );
  return seeded;
}

export async function cleanup(userIds: string[], projectIds: string[]) {
  if (projectIds.length) await db.delete(projects).where(inArray(projects.id, projectIds));
  if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
}
