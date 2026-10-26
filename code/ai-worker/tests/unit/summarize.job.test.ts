import { describe, it, expect, vi } from 'vitest';
import { summarizeNote, noteText } from '../../src/jobs/summarize.job.js';
import { processAiJob } from '../../src/services/queue.service.js';
import { GeminiError, type GeminiService } from '../../src/services/gemini.service.js';

const gemini = (output: unknown) => ({ generateJson: vi.fn(async () => output) }) as unknown as GeminiService;

describe('noteText', () => {
  it('keeps the structure the model needs, including checklist state', () => {
    const html =
      '<h2>Launch</h2><p>Ship &amp; tell.</p><ul data-type="taskList">' +
      '<li data-type="taskItem" data-checked="true"><p>Draft post</p></li>' +
      '<li data-type="taskItem" data-checked="false"><p>Email press</p></li></ul>';
    expect(noteText(html)).toBe('# Launch\nShip & tell.\n\n- [x] Draft post\n\n- [ ] Email press');
  });
});

describe('summarizeNote', () => {
  it('skips the model for empty notes', async () => {
    const g = gemini({});
    expect(await summarizeNote({ title: 'x', html: '<p></p>' }, g)).toEqual({
      summary: 'This note is empty.',
      keyPoints: [],
      actionItems: [],
    });
    expect(g.generateJson).not.toHaveBeenCalled();
  });

  it('sends the note text and cleans up what comes back', async () => {
    const g = gemini({
      summary: '  The team agreed to launch Friday.  ',
      keyPoints: ['Friday launch', '', 'Press list ready'],
      actionItems: [
        { title: 'Email press', detail: 'List is in the drive', priority: 'high' },
        { title: '   ', detail: 'blank titles are dropped', priority: 'low' },
        { title: 'Book room', detail: '', priority: 'whenever' },
      ],
    });

    const digest = await summarizeNote({ title: 'Launch', html: '<p>Launch Friday. Email press.</p>' }, g);

    expect(vi.mocked(g.generateJson).mock.calls[0][0].prompt).toContain('Note title: Launch\n\nLaunch Friday. Email press.');
    expect(digest).toEqual({
      summary: 'The team agreed to launch Friday.',
      keyPoints: ['Friday launch', 'Press list ready'],
      actionItems: [
        { title: 'Email press', detail: 'List is in the drive', priority: 'high' },
        { title: 'Book room', detail: '', priority: 'medium' },
      ],
    });
  });
});

describe('processAiJob', () => {
  it('turns expected failures into results instead of retries', async () => {
    const result = await processAiJob({ name: 'note.digest', data: { title: 'x', html: '<p>hello there</p>' } });
    // No GEMINI_API_KEY in the test environment.
    expect(result).toMatchObject({ ok: false, code: 'NOT_CONFIGURED' });
  });

  it('rejects unknown jobs', async () => {
    expect(await processAiJob({ name: 'nope', data: {} })).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('keeps GeminiError codes', () => {
    expect(new GeminiError('x', 'BLOCKED').code).toBe('BLOCKED');
  });
});
