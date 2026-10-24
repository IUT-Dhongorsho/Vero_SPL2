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

function textToHtml(text: Y.XmlText): string {
  return (text.toDelta() as Array<{ insert: unknown; attributes?: Record<string, any> }>)
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

function childrenToHtml(node: Y.XmlElement | Y.XmlFragment): string {
  return node
    .toArray()
    .map((child) => (child instanceof Y.XmlText ? textToHtml(child) : child instanceof Y.XmlElement ? elementToHtml(child) : ''))
    .join('');
}

function elementToHtml(el: Y.XmlElement): string {
  const inner = () => childrenToHtml(el);
  const attrs = el.getAttributes() as Record<string, any>;

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
export function ydocToHtml(doc: Y.Doc, field = 'default'): string {
  return childrenToHtml(doc.getXmlFragment(field));
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
