import { z } from 'zod';
import { geminiService, type GeminiService } from '../services/gemini.service.js';

/** Input for `note.digest`: the note as the editor stores it. */
export const digestInput = z.object({
  title: z.string().max(300).default(''),
  html: z.string().default(''),
});

export interface NoteDigest {
  summary: string;
  keyPoints: string[];
  actionItems: { title: string; detail: string; priority: 'low' | 'medium' | 'high' | 'urgent' }[];
}

/** Notes are HTML; the model only needs the words and their structure. */
export function noteText(html: string): string {
  return html
    .replace(/<li[^>]*data-checked="true"[^>]*>/gi, '\n- [x] ')
    .replace(/<li[^>]*data-checked="false"[^>]*>/gi, '\n- [ ] ')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<h[1-6][^>]*>/gi, '\n\n# ')
    .replace(/<\/(p|h[1-6]|blockquote|pre|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const MAX_CHARS = 30_000;

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two to four sentences in plain prose.' },
    keyPoints: { type: 'array', items: { type: 'string' }, description: 'At most six short points.' },
    actionItems: {
      type: 'array',
      description: 'Concrete follow-ups the note commits someone to. Empty when there are none.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Imperative, under 80 characters.' },
          detail: { type: 'string', description: 'One sentence of context from the note, or empty.' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        },
        required: ['title', 'detail', 'priority'],
      },
    },
  },
  required: ['summary', 'keyPoints', 'actionItems'],
};

const SYSTEM = [
  'You summarise working notes for a project team.',
  'Use only what the note says; never invent names, dates or decisions.',
  'Write in the language the note is written in.',
  'Unchecked checklist items ("- [ ]") are action items; checked ones ("- [x]") are done and are not.',
  'If the note is too short to summarise, say so briefly in the summary and return empty lists.',
].join(' ');

/** Produces a summary, key points and action items for one note. */
export async function summarizeNote(input: unknown, gemini: GeminiService = geminiService): Promise<NoteDigest> {
  const { title, html } = digestInput.parse(input);
  const text = noteText(html);
  if (!text) {
    return { summary: 'This note is empty.', keyPoints: [], actionItems: [] };
  }

  const truncated = text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n\n[The note continues but was cut off here.]` : text;
  const raw = await gemini.generateJson<NoteDigest>({
    system: SYSTEM,
    prompt: `Note title: ${title || 'Untitled'}\n\n${truncated}`,
    schema: SCHEMA,
  });

  // Never pass the model's output through unchecked.
  const priorities = new Set(['low', 'medium', 'high', 'urgent']);
  return {
    summary: String(raw.summary ?? '').trim(),
    keyPoints: (Array.isArray(raw.keyPoints) ? raw.keyPoints : []).map(String).filter(Boolean).slice(0, 6),
    actionItems: (Array.isArray(raw.actionItems) ? raw.actionItems : [])
      .filter((item) => item && typeof item.title === 'string' && item.title.trim())
      .slice(0, 15)
      .map((item) => ({
        title: item.title.trim().slice(0, 120),
        detail: String(item.detail ?? '').trim().slice(0, 300),
        priority: priorities.has(item.priority) ? item.priority : 'medium',
      })),
  };
}
