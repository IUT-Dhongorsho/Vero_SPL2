import * as Y from 'yjs';

/**
 * Turns the TipTap/ProseMirror tree that y-prosemirror stores in a Y.Doc back
 * into the HTML the editor produces with `getHTML()`.
 *
 * The note's `contentSnapshot` is that HTML: the non-collaborative editor
 * loads it, previews and search read it. Persisting an empty string from the
 * live document (as the server used to) erased notes the moment someone made
 * them private again.
 */

/**
 * y-websocket's server helpers load Yjs's CommonJS build while this file
 * imports the ES module build — two copies of Yjs, so `instanceof` is false
 * for every node of a live document. Nodes are recognised by shape instead.
 */
type TextNode = { toDelta(): Array<{ insert: unknown; attributes?: Record<string, any> }> };
type ElementNode = { nodeName: string; getAttributes(): Record<string, any>; toArray(): unknown[] };
const isText = (node: any): node is TextNode => typeof node?.toDelta === 'function';
const isElement = (node: any): node is ElementNode => typeof node?.nodeName === 'string' && typeof node?.toArray === 'function';

const escapeText = (value: string) => value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
const escapeAttr = (value: string) => escapeText(value).replace(/"/g, '&quot;');

/** ProseMirror mark name → HTML wrapper, applied innermost first. */
const MARKS: Record<string, (attrs: any) => [string, string]> = {
  bold: () => ['<strong>', '</strong>'],
  italic: () => ['<em>', '</em>'],
  underline: () => ['<u>', '</u>'],
  strike: () => ['<s>', '</s>'],
  code: () => ['<code>', '</code>'],
  link: (attrs) => [`<a href="${escapeAttr(String(attrs?.href ?? ''))}" target="_blank" rel="noopener noreferrer nofollow">`, '</a>'],
};

function textToHtml(text: TextNode): string {
  return text
    .toDelta()
    .map(({ insert, attributes }) => {
      if (typeof insert !== 'string') return '';
      let html = escapeText(insert);
      for (const [mark, attrs] of Object.entries(attributes ?? {})) {
        const wrap = MARKS[mark];
        if (wrap) {
          const [open, close] = wrap(attrs);
          html = `${open}${html}${close}`;
        }
      }
      return html;
    })
    .join('');
}

function childrenToHtml(node: { toArray(): unknown[] }): string {
  return node
    .toArray()
    .map((child) => (isText(child) ? textToHtml(child) : isElement(child) ? elementToHtml(child) : ''))
    .join('');
}

function elementToHtml(el: ElementNode): string {
  const inner = () => childrenToHtml(el);
  const attrs = el.getAttributes();

  switch (el.nodeName) {
    case 'paragraph':
      return `<p>${inner()}</p>`;
    case 'heading': {
      const level = Math.min(Math.max(Number(attrs.level) || 1, 1), 6);
      return `<h${level}>${inner()}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${inner()}</ul>`;
    case 'orderedList':
      return attrs.start && Number(attrs.start) !== 1 ? `<ol start="${Number(attrs.start)}">${inner()}</ol>` : `<ol>${inner()}</ol>`;
    case 'listItem':
      return `<li>${inner()}</li>`;
    case 'taskList':
      return `<ul data-type="taskList">${inner()}</ul>`;
    case 'taskItem': {
      const checked = attrs.checked === true || attrs.checked === 'true';
      return `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? ' checked="checked"' : ''}><span></span></label><div>${inner()}</div></li>`;
    }
    case 'blockquote':
      return `<blockquote>${inner()}</blockquote>`;
    case 'codeBlock': {
      const lang = attrs.language ? ` class="language-${escapeAttr(String(attrs.language))}"` : '';
      return `<pre><code${lang}>${inner()}</code></pre>`;
    }
    case 'horizontalRule':
      return '<hr>';
    case 'hardBreak':
      return '<br>';
    case 'table':
      return `<table><tbody>${inner()}</tbody></table>`;
    case 'tableRow':
      return `<tr>${inner()}</tr>`;
    case 'tableHeader':
      return `<th>${inner()}</th>`;
    case 'tableCell':
      return `<td>${inner()}</td>`;
    default:
      // Unknown node types keep their content rather than vanishing.
      return inner();
  }
}

/** HTML for the document TipTap's Collaboration extension edits (fragment "default"). */
export function ydocToHtml(doc: Pick<Y.Doc, 'getXmlFragment'>, field = 'default'): string {
  return childrenToHtml(doc.getXmlFragment(field));
}

/**
 * Converts a plain Markdown or text string into a Y.Doc with TipTap-compatible XmlElements.
 * If an existingDoc is provided, appends the elements to it.
 */
export function markdownToYdoc(markdown: string, existingDoc?: Y.Doc, field = 'default'): Y.Doc {
  const doc = existingDoc || new Y.Doc();
  const fragment = doc.getXmlFragment(field);

  const lines = markdown.split(/\r?\n/);
  let currentList: { type: 'bullet' | 'task'; element: Y.XmlElement } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      currentList = null;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      currentList = null;
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const h = new Y.XmlElement('heading');
      h.setAttribute('level', String(level));
      const t = new Y.XmlText();
      t.insert(0, text);
      h.push([t]);
      fragment.push([h]);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      currentList = null;
      const text = trimmed.replace(/^>\s*/, '');
      const b = new Y.XmlElement('blockquote');
      const p = new Y.XmlElement('paragraph');
      const t = new Y.XmlText();
      t.insert(0, text);
      p.push([t]);
      b.push([p]);
      fragment.push([b]);
      continue;
    }

    // Horizontal Rule
    if (/^---+$|^===+$/.test(trimmed)) {
      currentList = null;
      const hr = new Y.XmlElement('horizontalRule');
      fragment.push([hr]);
      continue;
    }

    // Task Item: - [ ] or - [x]
    const taskMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const text = taskMatch[2];

      if (!currentList || currentList.type !== 'task') {
        const tl = new Y.XmlElement('taskList');
        currentList = { type: 'task', element: tl };
        fragment.push([tl]);
      }

      const ti = new Y.XmlElement('taskItem');
      ti.setAttribute('checked', String(isChecked));
      const p = new Y.XmlElement('paragraph');
      const t = new Y.XmlText();
      t.insert(0, text);
      p.push([t]);
      ti.push([p]);
      currentList.element.push([ti]);
      continue;
    }

    // Bullet Item: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1];

      if (!currentList || currentList.type !== 'bullet') {
        const ul = new Y.XmlElement('bulletList');
        currentList = { type: 'bullet', element: ul };
        fragment.push([ul]);
      }

      const li = new Y.XmlElement('listItem');
      const p = new Y.XmlElement('paragraph');
      const t = new Y.XmlText();
      t.insert(0, text);
      p.push([t]);
      li.push([p]);
      currentList.element.push([li]);
      continue;
    }

    // Regular Paragraph
    currentList = null;
    const p = new Y.XmlElement('paragraph');
    const t = new Y.XmlText();
    t.insert(0, trimmed);
    p.push([t]);
    fragment.push([p]);
  }

  return doc;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

/** Plain text for previews and search: block boundaries become spaces. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|tr|div)>|<br\s*\/?>|<hr\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e])
    .replace(/\s+/g, ' ')
    .trim();
}
