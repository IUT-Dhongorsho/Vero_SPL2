import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import pg from 'pg';
import { env } from '../src/config/env.js';

describe('System Connectivity Tests (NFR)', () => {
  let redis: Redis;
  let pgClient: pg.Client;

  beforeAll(async () => {
    redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1
    });
    pgClient = new pg.Client({
        connectionString: env.DATABASE_URL
    });
    await pgClient.connect();
  });

  afterAll(async () => {
    await redis.quit();
    await pgClient.end();
  });

  it('should successfully connect to Redis', async () => {
    const status = await redis.ping();
    expect(status).toBe('PONG');
  });

  it('should successfully connect to PostgreSQL', async () => {
    const res = await pgClient.query('SELECT NOW()');
    expect(res.rows.length).toBe(1);
  });
});
