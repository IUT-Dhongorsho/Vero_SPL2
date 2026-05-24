import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as workspaceSchema from '../models/workspace.model.js';
import * as projectSchema from '../models/project.model.js';
import * as columnSchema from '../models/column.model.js';
import * as taskSchema from '../models/task.model.js';
import * as memberSchema from '../models/member.model.js';
import * as userSchema from '../models/user.model.js';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema: { 
    ...workspaceSchema, 
    ...projectSchema, 
    ...columnSchema, 
    ...taskSchema, 
    ...memberSchema,
    ...userSchema
  },
});
