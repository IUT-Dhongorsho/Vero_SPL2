import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as userSchema from '../models/user.model.js';
import * as notificationSchema from '../models/notification.model.js';
import * as pushSchema from '../models/push-subscription.model.js';
import * as deliverySchema from '../models/delivery-log.model.js';
import * as scheduledSchema from '../models/scheduled-job.model.js';

const schema = {
  ...userSchema,
  ...notificationSchema,
  ...pushSchema,
  ...deliverySchema,
  ...scheduledSchema,
};

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
