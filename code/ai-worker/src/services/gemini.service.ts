import { env } from '../config/env.js';

export class GeminiError extends Error {
  constructor(message: string, public code: 'NOT_CONFIGURED' | 'UPSTREAM_FAILED' | 'BLOCKED') {
    super(message);
  }
}

interface ModelInfo {
  name: string;
  supportedGenerationMethods?: string[];
}

/**
 * Talks to the Gemini REST API directly (no SDK) and always asks for JSON that
 * matches a response schema, so callers get structured output or an error.
 */
export class GeminiService {
  private resolvedModel: string | null = null;
  /** Models this key has been refused (Google retires older ones per key). */
  private unavailable = new Set<string>();
  /** Some models reject a thinking level; remember which, and stop sending it. */
  private noThinkingConfig = new Set<string>();

  constructor(
    private apiKey = env.GEMINI_API_KEY,
    private preferredModel = env.GEMINI_MODEL || undefined,
    private base = env.GEMINI_API_BASE,
    private fetchImpl: typeof fetch = (...args) => fetch(...args)
  ) {}

  get configured() {
    return !!this.apiKey;
  }

  get model() {
    return this.resolvedModel ?? this.preferredModel ?? null;
  }

  private headers() {
    return { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey! };
  }

  /**
   * Flash models that support generateContent, newest first. Model names change
   * with each Gemini release, and older ones stop answering new keys, so a
   * hard-coded default would eventually 404.
   */
  async discoverModels(): Promise<string[]> {
    const res = await this.fetchImpl(`${this.base}/models?pageSize=200`, { headers: this.headers() });
    if (!res.ok) throw new GeminiError(`Could not list Gemini models (${res.status})`, 'UPSTREAM_FAILED');
    const { models = [] } = (await res.json()) as { models?: ModelInfo[] };

    const candidates = models
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((name) => /^gemini-[\d.]+-flash(-\d+)?$|^gemini-[\d.]+-flash-latest$|^gemini-flash-latest$/.test(name));

    const version = (name: string) => Number(name.match(/gemini-([\d.]+)/)?.[1] ?? 0);
    candidates.sort((a, b) => version(b) - version(a) || a.length - b.length);
    return candidates.filter((name) => !this.unavailable.has(name));
  }

  async discoverModel(): Promise<string> {
    const [first] = await this.discoverModels();
    if (!first) throw new GeminiError('No Gemini Flash model is available for this key', 'UPSTREAM_FAILED');
    return first;
  }

  /**
   * One request. Asks for a low thinking level — summaries do not need long
   * reasoning, and it is markedly faster — unless the model has refused that.
   */
  private async call(model: string, body: any) {
    const send = (payload: any) =>
      this.fetchImpl(`${this.base}/models/${model}:generateContent`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });

    if (this.noThinkingConfig.has(model)) return send(body);
    const res = await send({ ...body, generationConfig: { ...body.generationConfig, thinkingConfig: { thinkingLevel: 'low' } } });
    if (res.status === 400) {
      const detail = await res.clone().text().catch(() => '');
      if (/thinking/i.test(detail)) {
        this.noThinkingConfig.add(model);
        return send(body);
      }
    }
    return res;
  }

  async generateJson<T>(options: { system: string; prompt: string; schema: Record<string, unknown>; temperature?: number }): Promise<T> {
    if (!this.configured) throw new GeminiError('GEMINI_API_KEY is not set', 'NOT_CONFIGURED');

    const body = {
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        responseMimeType: 'application/json',
        responseSchema: options.schema,
      },
    };

    if (!this.resolvedModel) this.resolvedModel = this.preferredModel || (await this.discoverModel());
    let res = await this.call(this.resolvedModel, body);

    // A pinned or remembered model may have been retired: work down the
    // list of current Flash models until one answers.
    while (res.status === 404) {
      this.unavailable.add(this.resolvedModel);
      const next = (await this.discoverModels())[0];
      if (!next) throw new GeminiError('No Gemini Flash model is available for this key', 'UPSTREAM_FAILED');
      this.resolvedModel = next;
      res = await this.call(this.resolvedModel, body);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new GeminiError(`Gemini returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`, 'UPSTREAM_FAILED');
    }

    const data = (await res.json()) as any;
    const candidate = data.candidates?.[0];
    if (!candidate || candidate.finishReason === 'SAFETY' || data.promptFeedback?.blockReason) {
      throw new GeminiError('Gemini declined to answer this request', 'BLOCKED');
    }

    const text = candidate.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GeminiError('Gemini returned something that was not JSON', 'UPSTREAM_FAILED');
    }
  }
}

export const geminiService = new GeminiService();
