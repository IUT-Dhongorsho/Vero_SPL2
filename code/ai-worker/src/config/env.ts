import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_API_BASE: z.string().default('https://generativelanguage.googleapis.com/v1beta'),
  AI_CONCURRENCY: z.string().default('2').transform(Number),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
