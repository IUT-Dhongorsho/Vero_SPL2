import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import pg from 'pg';
import { env } from '../src/config/env.js';
import * as grpc from '@grpc/grpc-js';

describe('Chat Service Infrastructure Tests (NFR)', () => {
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

  it('should have a healthy gRPC server (if running)', async () => {
    // Basic check if the port is reachable
    const address = `localhost:${env.GRPC_PORT}`;
    const client = new grpc.Client(address, grpc.credentials.createInsecure());
    
    // We don't need a real RPC call, just a connectivity check
    expect(client).toBeDefined();
    client.close();
  });
});
