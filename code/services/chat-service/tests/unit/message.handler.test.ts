import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMessageHandlers } from '../../src/ws/handlers/message.handler.js';
import { messageService } from '../../src/services/message.service.js';
import { channelService } from '../../src/services/channel.service.js';
import { SocketEvents } from '../../src/ws/types.js';

vi.mock('../../src/services/message.service.js', () => ({
  messageService: {
    saveMessage: vi.fn(),
  },
}));

vi.mock('../../src/services/channel.service.js', () => ({
  channelService: {
    isMember: vi.fn(),
  },
}));

describe('Message Handler', () => {
  let mockIo: any;
  let mockSocket: any;

  beforeEach(() => {
    mockIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
    mockSocket = {
      user: { id: 'user-1' },
      on: vi.fn(),
      emit: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it('should register message event listener', () => {
    registerMessageHandlers(mockIo, mockSocket);
    expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.MESSAGE, expect.any(Function));
  });

  it('should save and broadcast message if user is member', async () => {
    registerMessageHandlers(mockIo, mockSocket);
    const handler = mockSocket.on.mock.calls.find((call: any) => call[0] === SocketEvents.MESSAGE)[1];

    const payload = { channelId: 'chan-1', content: 'hello' };
    (channelService.isMember as any).mockResolvedValue(true);
    (messageService.saveMessage as any).mockResolvedValue({ id: 'msg-1', ...payload });

    await handler(payload);

    expect(channelService.isMember).toHaveBeenCalledWith('chan-1', 'user-1');
    expect(messageService.saveMessage).toHaveBeenCalledWith(payload, 'user-1');
    expect(mockIo.to).toHaveBeenCalledWith('chan-1');
    expect(mockIo.emit).toHaveBeenCalledWith(SocketEvents.MESSAGE, expect.objectContaining({ id: 'msg-1' }));
  });

  it('should emit error if user is not member', async () => {
    registerMessageHandlers(mockIo, mockSocket);
    const handler = mockSocket.on.mock.calls.find((call: any) => call[0] === SocketEvents.MESSAGE)[1];

    (channelService.isMember as any).mockResolvedValue(false);

    await handler({ channelId: 'chan-1', content: 'hello' });

    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.ERROR, expect.objectContaining({ message: 'Not a member of this channel' }));
    expect(messageService.saveMessage).not.toHaveBeenCalled();
  });
});
