import { describe, it, expect, vi } from 'vitest';
import { GeminiService, GeminiError } from '../../src/services/gemini.service.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const answer = (payload: unknown) => json({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] });
const ask = (svc: GeminiService) => svc.generateJson<{ ok: boolean }>({ system: 's', prompt: 'p', schema: { type: 'object' } });

describe('GeminiService', () => {
  it('refuses to run without a key', async () => {
    const svc = new GeminiService(undefined, undefined, 'https://api.test', vi.fn());
    await expect(ask(svc)).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('asks for schema-shaped JSON with the key in a header, not the URL', async () => {
    const fetchImpl = vi.fn(async () => answer({ ok: true }));
    const svc = new GeminiService('k3y', 'gemini-test-flash', 'https://api.test', fetchImpl as any);

    expect(await ask(svc)).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as any;
    expect(url).toBe('https://api.test/models/gemini-test-flash:generateContent');
    expect(url).not.toContain('k3y');
    expect(init.headers['x-goog-api-key']).toBe('k3y');
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toEqual({ type: 'object' });
  });

  it('discovers the newest Flash model when none is pinned', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith('/models?pageSize=200')
        ? json({
            models: [
              { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
            ],
          })
        : answer({ ok: true })
    );
    const svc = new GeminiService('k', undefined, 'https://api.test', fetchImpl as any);
    await ask(svc);
    expect(svc.model).toBe('gemini-2.5-flash');
  });

  it('rediscovers once when a pinned model has been retired', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('old-model')) return json({ error: 'not found' }, 404);
      if (url.endsWith('/models?pageSize=200')) {
        return json({ models: [{ name: 'models/gemini-3.0-flash', supportedGenerationMethods: ['generateContent'] }] });
      }
      return answer({ ok: true });
    });
    const svc = new GeminiService('k', 'old-model', 'https://api.test', fetchImpl as any);
    expect(await ask(svc)).toEqual({ ok: true });
    expect(svc.model).toBe('gemini-3.0-flash');
  });

  it('reports blocked and malformed answers', async () => {
    const blocked = new GeminiService('k', 'm', 'https://api.test', vi.fn(async () => json({ candidates: [{ finishReason: 'SAFETY' }] })) as any);
    await expect(ask(blocked)).rejects.toMatchObject({ code: 'BLOCKED' });

    const garbled = new GeminiService(
      'k',
      'm',
      'https://api.test',
      vi.fn(async () => json({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })) as any
    );
    await expect(ask(garbled)).rejects.toBeInstanceOf(GeminiError);
  });
});

describe('GeminiService against a key with retired models', () => {
  it('skips models that answer 404 and settles on one that works', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/models?pageSize=200')) {
        return json({
          models: [
            { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.9-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        });
      }
      calls.push(url);
      return url.includes('gemini-3.9-flash') ? json({ error: 'gone' }, 404) : answer({ ok: true });
    });
    const svc = new GeminiService('k', undefined, 'https://api.test', fetchImpl as any);
    expect(await ask(svc)).toEqual({ ok: true });
    expect(svc.model).toBe('gemini-3.8-flash');
  });

  it('asks for a low thinking level, and drops it for models that refuse it', async () => {
    const bodies: any[] = [];
    const fetchImpl = vi.fn(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      return body.generationConfig.thinkingConfig
        ? json({ error: { message: 'Thinking level LOW is not supported for this model.' } }, 400)
        : answer({ ok: true });
    });
    const svc = new GeminiService('k', 'gemini-old-flash', 'https://api.test', fetchImpl as any);
    expect(await ask(svc)).toEqual({ ok: true });
    expect(bodies[0].generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    await ask(svc);
    expect(bodies[2].generationConfig.thinkingConfig).toBeUndefined();
  });
});
