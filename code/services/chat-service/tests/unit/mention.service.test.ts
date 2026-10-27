import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishMentions } from '../../src/services/mention.service.js';
import { channelService } from '../../src/services/channel.service.js';
import { publisherService } from '../../src/services/publisher.service.js';

vi.mock('../../src/services/channel.service.js', () => ({
  channelService: { withMemberIds: vi.fn() },
}));

vi.mock('../../src/services/publisher.service.js', () => ({
  publisherService: { connectionEvent: vi.fn() },
}));

const sender = { id: 'me', name: 'Sieam' };
const message = { id: 'msg-1', content: 'hey @Nafis look at this' };

describe('publishMentions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(channelService.withMemberIds).mockResolvedValue({
      name: 'Frontend Chat',
      memberIds: ['me', 'nafis', 'rahim'],
    });
  });

  it('notifies a mentioned member', async () => {
    await publishMentions({ channelId: 'c1', content: message.content, mentions: ['nafis'], link: '/x' }, message, sender);

    expect(publisherService.connectionEvent).toHaveBeenCalledWith(
      'message.mentioned',
      expect.objectContaining({ recipientIds: ['nafis'], everyone: false, channelName: 'Frontend Chat', link: '/x' })
    );
  });

  it('never notifies someone outside the channel', async () => {
    await publishMentions({ channelId: 'c1', content: '', mentions: ['stranger'] }, message, sender);
    expect(publisherService.connectionEvent).not.toHaveBeenCalled();
  });

  it('@all reaches every member except the sender', async () => {
    await publishMentions({ channelId: 'c1', content: '', mentionsAll: true }, message, sender);

    expect(publisherService.connectionEvent).toHaveBeenCalledWith(
      'message.mentioned',
      expect.objectContaining({ recipientIds: ['nafis', 'rahim'], everyone: true })
    );
  });

  it('does not notify you for mentioning yourself', async () => {
    await publishMentions({ channelId: 'c1', content: '', mentions: ['me'] }, message, sender);
    expect(publisherService.connectionEvent).not.toHaveBeenCalled();
  });

  it('skips the database when nothing is mentioned', async () => {
    await publishMentions({ channelId: 'c1', content: 'plain' }, message, sender);
    expect(channelService.withMemberIds).not.toHaveBeenCalled();
  });

  it('shortens long messages for the notification', async () => {
    const long = { id: 'm', content: 'x'.repeat(500) };
    await publishMentions({ channelId: 'c1', content: long.content, mentions: ['nafis'] }, long, sender);

    const data = vi.mocked(publisherService.connectionEvent).mock.calls[0][1] as { preview: string };
    expect(data.preview).toHaveLength(140);
    expect(data.preview.endsWith('…')).toBe(true);
  });
});
