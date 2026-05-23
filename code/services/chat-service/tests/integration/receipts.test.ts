import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../src/db/client.js';
import { channels, channelMembers } from '../../src/models/channel.model.js';
import { users } from '../../src/models/user.model.js';
import { messageReceipts } from '../../src/models/message.model.js';
import { messageService } from '../../src/services/message.service.js';
import { eq, and } from 'drizzle-orm';

describe('Read Receipts Functional Requirements', () => {
  const testUserId = '33333333-3333-3333-3333-333333333333';
  const testChannelId = '44444444-4444-4444-4444-444444444444';

  beforeEach(async () => {
    await db.insert(users).values({ id: testUserId, name: 'Reader' }).onConflictDoNothing();
    await db.insert(channels).values({ id: testChannelId, name: 'Receipt Channel', type: 'public' }).onConflictDoNothing();
  });

  it('should persist a read receipt when a user reads a message', async () => {
    // 1. Send a message first
    const msg = await messageService.saveMessage({
      channelId: testChannelId,
      content: 'Important info',
    }, testUserId);

    // 2. Save receipt
    const receipt = await messageService.saveReceipt({
      messageId: msg.id,
      channelId: testChannelId,
      status: 'read',
    }, testUserId);

    expect(receipt).toBeDefined();
    expect(receipt.status).toBe('read');
    expect(receipt.messageId).toBe(msg.id);

    // 3. Verify in DB
    const fromDb = await db.query.messageReceipts.findFirst({
      where: and(
        eq(messageReceipts.messageId, msg.id),
        eq(messageReceipts.userId, testUserId)
      ),
    });

    expect(fromDb).toBeDefined();
    expect(fromDb?.status).toBe('read');
  });
});
