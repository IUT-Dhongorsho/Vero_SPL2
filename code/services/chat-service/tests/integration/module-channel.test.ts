import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../src/db/client.js';
import { channels, channelMembers } from '../../src/models/channel.model.js';
import { users } from '../../src/models/user.model.js';
import { channelService } from '../../src/services/channel.service.js';
import { channelController } from '../../src/controllers/channel.controller.js';

const people = ['mc-ada', 'mc-bob', 'mc-cy'];
const moduleId = `module-${Date.now()}`;
let channelId: string;

const membersOf = async () =>
  (await db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId))).map((m) => m.userId).sort();

/** Minimal Express response double. */
function response() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = vi.fn((code: number) => ((res.statusCode = code), res));
  res.json = vi.fn((body: any) => ((res.body = body), res));
  return res;
}

beforeAll(async () => {
  await db.insert(users).values(people.map((id) => ({ id, name: id }))).onConflictDoNothing();
  const channel = await channelService.createChannel({ name: 'Launch Chat', type: 'group', creatorId: 'system', externalId: moduleId });
  channelId = channel.id;
});

afterAll(async () => {
  await db.delete(channelMembers).where(eq(channelMembers.channelId, channelId));
  await db.delete(channels).where(eq(channels.id, channelId));
  await db.delete(users).where(inArray(users.id, people));
});

describe('module channel membership', () => {
  it('adds members once, however often it is asked', async () => {
    const first = await channelService.addMembers(channelId, ['mc-ada', 'mc-bob', 'mc-ada']);
    const again = await channelService.addMembers(channelId, ['mc-bob']);
    expect(first.added).toBe(2);
    expect(again.added).toBe(0);
    expect(await membersOf()).toEqual(['mc-ada', 'mc-bob', 'system']);
  });

  it('removes members', async () => {
    const result = await channelService.removeMembers(channelId, ['mc-bob', 'mc-cy']);
    expect(result.removed).toBe(1);
    expect(await membersOf()).toEqual(['mc-ada', 'system']);
  });

  it('serves the module channel to its members, without the provisioning bot', async () => {
    const res = response();
    await channelController.getChannelByExternalId({ params: { externalId: moduleId }, user: { id: 'mc-ada' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(channelId);
    expect(res.body.members.map((m: any) => m.userId)).toEqual(['mc-ada']);
  });

  it('refuses non-members and unknown modules', async () => {
    const outsider = response();
    await channelController.getChannelByExternalId({ params: { externalId: moduleId }, user: { id: 'mc-cy' } } as any, outsider);
    expect(outsider.statusCode).toBe(403);

    const missing = response();
    await channelController.getChannelByExternalId({ params: { externalId: 'nope' }, user: { id: 'mc-ada' } } as any, missing);
    expect(missing.statusCode).toBe(404);
  });
});
