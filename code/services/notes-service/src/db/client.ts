import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as userSchema from '../models/user.model.js';
import * as documentSchema from '../models/document.model.js';
import * as snapshotSchema from '../models/snapshot.model.js';

const schema = {
  ...userSchema,
  ...documentSchema,
  ...snapshotSchema,
};

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
