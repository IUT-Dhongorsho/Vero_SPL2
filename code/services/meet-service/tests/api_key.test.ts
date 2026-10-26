import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('API Keys Integration Test (.env)', () => {
  let groqApiKey: string | undefined;
  let openaiApiKey: string | undefined;
  let geminiApiKey: string | undefined;

  beforeAll(() => {
    // Load .env explicitly from meet-service directory
    const envPath = path.resolve(__dirname, '../.env');
    const result = dotenv.config({ path: envPath });

    groqApiKey = process.env.GROQ_API_KEY?.trim();
    openaiApiKey = process.env.OPENAI_API_KEY?.trim();
    geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  });

  describe('Groq API Key (Whisper)', () => {
    it('GROQ_API_KEY should be defined in .env', () => {
      expect(groqApiKey).toBeDefined();
      expect(groqApiKey!.length).toBeGreaterThan(10);
      expect(groqApiKey).toMatch(/^gsk_/);
    });

    it('should successfully authenticate with Groq API and find whisper-large-v3', async () => {
      if (!groqApiKey) return;

      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
      });

      expect(response.status).toBe(200);

      const json = (await response.json()) as { data: Array<{ id: string }> };
      expect(Array.isArray(json.data)).toBe(true);

      const hasWhisper = json.data.some((model) => model.id === 'whisper-large-v3');
      expect(hasWhisper).toBe(true);
    });
  });

  describe('Gemini API Key (Meeting Minutes AI)', () => {
    it('GEMINI_API_KEY should be defined in .env', () => {
      expect(geminiApiKey).toBeDefined();
      expect(geminiApiKey!.length).toBeGreaterThan(10);
    });

    it('should successfully generate text using gemini-3.5-flash with GEMINI_API_KEY', async () => {
      if (!geminiApiKey) return;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Respond with the word "pong".' }],
              },
            ],
          }),
        }
      );

      expect(response.status).toBe(200);

      const json = (await response.json()) as any;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      expect(text).toBeDefined();
      expect(typeof text).toBe('string');
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });

  describe('OpenAI API Key (Whisper Fallback)', () => {
    it('should authenticate with OpenAI API if OPENAI_API_KEY is configured', async () => {
      if (!openaiApiKey) {
        console.warn('⚠️ [Test] OPENAI_API_KEY not configured, skipping optional check.');
        return;
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(Array.isArray(json.data)).toBe(true);
    });
  });
});
