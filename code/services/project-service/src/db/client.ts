import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as userSchema from '../models/user.model.js';
import * as workspaceSchema from '../models/workspace.model.js';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { 
    schema: {
        ...userSchema,
        ...workspaceSchema
    } 
});
