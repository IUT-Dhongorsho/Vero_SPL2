import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import pg from 'pg';
import { env } from '../src/config/env.js';
import { io as Client } from 'socket.io-client';
import { createServer } from 'http';
import { initSocketServer } from '../src/ws/socket-server.js';
import { socketDelivery } from '../src/services/delivery/socket.delivery.js';
import { fakeAuthService } from './helpers.js';

describe('Notification Service Infrastructure Tests (NFR)', () => {
  let redis: Redis;
  let pgClient: pg.Client;
  let ioServer: any;
  let httpServer: any;
  let restoreFetch: () => void;
  const url = () => `http://localhost:${(httpServer.address() as any).port}`;
  const options = { path: '/notifications/socket.io/', reconnection: false, transports: ['websocket'] };

  beforeAll(async () => {
    restoreFetch = fakeAuthService();
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
    pgClient = new pg.Client({ connectionString: env.DATABASE_URL });
    await pgClient.connect();

    httpServer = createServer();
    ioServer = initSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  });

  afterAll(async () => {
    restoreFetch();
    await redis.quit();
    await pgClient.end();
    ioServer.close();
    httpServer.close();
  });

  it('should successfully connect to Redis', async () => {
    expect(await redis.ping()).toBe('PONG');
  });

  it('should successfully connect to PostgreSQL', async () => {
    const res = await pgClient.query('SELECT NOW()');
    expect(res.rows.length).toBe(1);
  });

  it('refuses sockets that only claim a userId', async () => {
    const client = Client(url(), { ...options, query: { userId: 'someone' } });
    const error = await new Promise<Error>((resolve) => client.on('connect_error', resolve));
    expect(error.message).toBe('Unauthorized');
    client.close();
  });

  it('delivers to the verified user’s room only', async () => {
    const mine = Client(url(), { ...options, auth: { token: 'token-socket-user' } });
    const theirs = Client(url(), { ...options, auth: { token: 'token-somebody-else' } });
    await Promise.all([mine, theirs].map((c) => new Promise((resolve) => c.on('connect', resolve))));

    let leaked = false;
    theirs.on('notification', () => (leaked = true));
    const received = new Promise<any>((resolve) => mine.on('notification', resolve));

    await socketDelivery.deliver('socket-user', { title: 'Hello' });
    expect((await received).title).toBe('Hello');
    await new Promise((r) => setTimeout(r, 100));
    expect(leaked).toBe(false);

    mine.close();
    theirs.close();
  });
});
