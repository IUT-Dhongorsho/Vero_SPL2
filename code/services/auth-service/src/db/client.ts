import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as userSchema from '../models/user.model.js';
import * as activitySchema from '../models/activity.model.js';

const schema = { ...userSchema, ...activitySchema };

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
