import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { ydocToHtml, htmlToText } from '../../src/services/ydoc-html.js';
import { isDocumentWrite } from '../../src/ws/yjs-server.js';

function build(fill: (root: Y.XmlFragment) => void) {
  const doc = new Y.Doc();
  fill(doc.getXmlFragment('default'));
  return doc;
}

const el = (name: string, children: (Y.XmlElement | Y.XmlText)[], attrs: Record<string, any> = {}) => {
  const node = new Y.XmlElement(name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.insert(0, children);
  return node;
};
const text = (value: string, marks?: Record<string, any>) => {
  const t = new Y.XmlText();
  t.insert(0, value, marks);
  return t;
};

describe('ydocToHtml', () => {
  it('reproduces the HTML the editor writes', () => {
    const doc = build((root) =>
      root.insert(0, [
        el('heading', [text('Launch')], { level: 2 }),
        el('paragraph', [text('Ship '), text('Friday', { bold: true }), text(' & tell <everyone>')]),
        el('taskList', [
          el('taskItem', [el('paragraph', [text('Draft post')])], { checked: true }),
          el('taskItem', [el('paragraph', [text('Email press')])], { checked: false }),
        ]),
        el('paragraph', [text('docs', { link: { href: 'https://x.dev/?a=1&b="2"' } })]),
      ])
    );

    const html = ydocToHtml(doc);
    expect(html).toContain('<h2>Launch</h2>');
    expect(html).toContain('<p>Ship <strong>Friday</strong> &amp; tell &lt;everyone&gt;</p>');
    expect(html).toContain('<li data-type="taskItem" data-checked="true">');
    expect(html).toContain('<input type="checkbox" checked="checked">');
    expect(html).toContain('href="https://x.dev/?a=1&amp;b=&quot;2&quot;"');
  });

  it('is empty for an empty document', () => {
    expect(ydocToHtml(new Y.Doc())).toBe('');
  });
});

describe('htmlToText', () => {
  it('flattens blocks and decodes entities', () => {
    expect(htmlToText('<h1>A&amp;B</h1><p>one<br>two</p><ul><li>x</li></ul>')).toBe('A&B one two x');
  });
});

describe('isDocumentWrite', () => {
  it('flags sync step 2 and updates, not step 1 or awareness', () => {
    expect(isDocumentWrite(new Uint8Array([0, 0, 1]))).toBe(false); // sync step 1 (a request)
    expect(isDocumentWrite(new Uint8Array([0, 1, 1]))).toBe(true); // sync step 2
    expect(isDocumentWrite(new Uint8Array([0, 2, 1]))).toBe(true); // update
    expect(isDocumentWrite(new Uint8Array([1, 5, 1]))).toBe(false); // awareness
  });
});

describe('ydocToHtml with the CommonJS copy of Yjs', () => {
  it('serialises documents created by y-websocket’s own Yjs instance', async () => {
    // y-websocket's server utils require() the CommonJS build — a different
    // Yjs instance from the one this module imports.
    const { createRequire } = await import('node:module');
    const YC = createRequire(import.meta.url)('yjs') as typeof Y;
    expect(YC.XmlText).not.toBe(Y.XmlText);

    const doc = new YC.Doc();
    const para = new YC.XmlElement('paragraph');
    const text = new YC.XmlText();
    text.insert(0, 'Ship on Friday');
    para.insert(0, [text]);
    doc.getXmlFragment('default').insert(0, [para]);

    expect(ydocToHtml(doc as any)).toBe('<p>Ship on Friday</p>');
  });
});
