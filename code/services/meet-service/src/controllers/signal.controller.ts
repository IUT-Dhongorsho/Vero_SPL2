import { Request, Response } from 'express';

export const signalController = {
  getInfo(req: Request, res: Response): void {
    res.json({
      wsUrl: `ws://${req.hostname}:${process.env['PORT'] ?? 8007}`,
      transport: 'socket.io',
      events: {
        emit: [
          'join-room',
          'get-rtp-capabilities',
          'set-rtp-capabilities',
          'create-send-transport',
          'create-recv-transport',
          'connect-transport',
          'produce',
          'resume-consumer',
          'leave-room',
        ],
        on: [
          'room-joined',
          'rtp-capabilities',
          'send-transport-created',
          'recv-transport-created',
          'produced',
          'consume',
          'consumer-closed',
          'new-producer',
          'peer-joined',
          'peer-left',
          'sfu-error',
        ],
      },
    });
  },
};
