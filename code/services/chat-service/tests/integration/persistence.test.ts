import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../src/db/client.js';
import { channels, channelMembers } from '../../src/models/channel.model.js';
import { users } from '../../src/models/user.model.js';
import { messages } from '../../src/models/message.model.js';
import { messageService } from '../../src/services/message.service.js';
import { eq } from 'drizzle-orm';

describe('Message Persistence Integration', () => {
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testChannelId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    // Setup test data
    await db.insert(users).values({
      id: testUserId,
      name: 'Test User',
    }).onConflictDoNothing();

    await db.insert(channels).values({
      id: testChannelId,
      name: 'Test Channel',
      type: 'public',
    }).onConflictDoNothing();

    await db.insert(channelMembers).values({
      channelId: testChannelId,
      userId: testUserId,
      role: 'member',
    }).onConflictDoNothing();
  });

  afterEach(async () => {
    // Clean up messages
    await db.delete(messages).where(eq(messages.channelId, testChannelId));
  });

  it('should persist message to the database', async () => {
    const payload = {
      channelId: testChannelId,
      content: 'Integration test message',
    };

    const saved = await messageService.saveMessage(payload, testUserId);

    expect(saved).toBeDefined();
    expect(saved.content).toBe(payload.content);
    expect(saved.senderId).toBe(testUserId);

    const fromDb = await db.query.messages.findFirst({
      where: eq(messages.id, saved.id),
    });

    expect(fromDb).toBeDefined();
    expect(fromDb?.content).toBe(payload.content);
  });
});
