import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as channelSchema from '../models/channel.model.js';
import * as messageSchema from '../models/message.model.js';
import * as userSchema from '../models/user.model.js';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema: { ...channelSchema, ...messageSchema, ...userSchema },
});
