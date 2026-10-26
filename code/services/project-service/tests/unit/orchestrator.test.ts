import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ module: null as any, updates: [] as any[] }));

vi.mock('../../src/grpc/client.js', () => ({
  createChatChannel: vi.fn(),
}));
vi.mock('../../src/services/chat-sync.service.js', () => ({
  chatSyncService: { addAllMembers: vi.fn(async () => undefined) },
}));
vi.mock('../../src/db/client.js', () => ({
  db: {
    query: { modules: { findFirst: vi.fn(async () => state.module) } },
    update: vi.fn(() => ({
      set: vi.fn((values: any) => ({
        where: vi.fn(async () => state.updates.push(values)),
      })),
    })),
  },
}));

import { processOrchestrationJob } from '../../src/worker/orchestrator.worker.js';
import { createChatChannel } from '../../src/grpc/client.js';
import { chatSyncService } from '../../src/services/chat-sync.service.js';

const job = (data: any = {}) => ({
  name: 'provision-module-resources',
  data: { moduleId: 'mod-1', name: 'Launch', workspaceId: '', ...data },
});

describe('module orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updates = [];
    state.module = { id: 'mod-1', chatResourceId: null };
  });

  it('creates the module chat, stores its id and adds the members', async () => {
    vi.mocked(createChatChannel).mockResolvedValue({ success: true, id: 'chan-1' });

    await processOrchestrationJob(job());

    expect(createChatChannel).toHaveBeenCalledWith({
      name: 'Launch Chat',
      type: 'group',
      externalId: 'mod-1',
      workspaceId: '',
    });
    expect(state.updates).toEqual([{ chatResourceId: 'chan-1' }]);
    expect(chatSyncService.addAllMembers).toHaveBeenCalledWith('mod-1');
  });

  it('does not create a second channel when retried', async () => {
    state.module = { id: 'mod-1', chatResourceId: 'chan-1' };

    await processOrchestrationJob(job());

    expect(createChatChannel).not.toHaveBeenCalled();
    expect(chatSyncService.addAllMembers).toHaveBeenCalledWith('mod-1');
  });

  it('skips modules deleted before the job ran', async () => {
    state.module = null;
    await processOrchestrationJob(job());
    expect(createChatChannel).not.toHaveBeenCalled();
  });

  it('throws so BullMQ retries when chat-service fails', async () => {
    vi.mocked(createChatChannel).mockResolvedValue({ success: false, message: 'down' });
    await expect(processOrchestrationJob(job())).rejects.toThrow('down');
    expect(state.updates).toEqual([]);
  });

  it('ignores unrelated jobs', async () => {
    await processOrchestrationJob({ name: 'something-else', data: {} });
    expect(createChatChannel).not.toHaveBeenCalled();
  });
});
