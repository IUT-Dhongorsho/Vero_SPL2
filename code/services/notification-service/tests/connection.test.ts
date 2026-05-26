import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import pg from 'pg';
import { env } from '../src/config/env.js';
import { io as Client } from 'socket.io-client';
import { createServer } from 'http';
import { initSocketServer } from '../src/ws/socket-server.js';

describe('Notification Service Infrastructure Tests (NFR)', () => {
  let redis: Redis;
  let pgClient: pg.Client;
  let ioServer: any;
  let httpServer: any;

  beforeAll(async () => {
    // Redis Connection
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
    
    // DB Connection
    pgClient = new pg.Client({ connectionString: env.DATABASE_URL });
    await pgClient.connect();

    // Socket.io Server Setup
    httpServer = createServer();
    ioServer = initSocketServer(httpServer);
    httpServer.listen(0); // Random free port
  });

  afterAll(async () => {
    await redis.quit();
    await pgClient.end();
    ioServer.close();
    httpServer.close();
  });

  it('should successfully connect to Redis', async () => {
    const status = await redis.ping();
    expect(status).toBe('PONG');
  });

  it('should successfully connect to PostgreSQL', async () => {
    const res = await pgClient.query('SELECT NOW()');
    expect(res.rows.length).toBe(1);
  });

  it('should allow a client to connect to Socket.io with userId', () => {
    return new Promise((resolve) => {
      const port = (httpServer.address() as any).port;
      const clientSocket = Client(`http://localhost:${port}`, {
        query: { userId: 'test-user-123' }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        resolve(true);
      });
    });
  });
});
