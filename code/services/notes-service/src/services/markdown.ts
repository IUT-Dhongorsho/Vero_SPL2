import { Lexer, type Token, type Tokens } from 'marked';
import * as Y from 'yjs';

/**
 * Markdown → the Y.XmlElement tree TipTap's Collaboration extension edits.
 *
 * Node and mark names must match the editor's schema exactly (StarterKit,
 * TaskList/TaskItem, Link, Mention); anything else would be dropped or break
 * the document for everyone in it. Marks are stored the way y-prosemirror
 * stores them: as text attributes holding the mark's attrs.
 */

type Marks = Record<string, Record<string, unknown> | null>;
type Inline = { text: string; marks: Marks } | { hardBreak: true };

/** The editor only has headings 1–3. */
const MAX_HEADING = 3;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
const decode = (value: string) => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ENTITIES[e]);

const LINK_ATTRS = { target: '_blank', rel: 'noopener noreferrer nofollow', class: null };

function collectInline(tokens: Token[] | undefined, marks: Marks, out: Inline[]) {
  for (const token of tokens ?? []) {
    switch (token.type) {
      case 'strong':
        collectInline((token as Tokens.Strong).tokens, { ...marks, bold: {} }, out);
        break;
      case 'em':
        collectInline((token as Tokens.Em).tokens, { ...marks, italic: {} }, out);
        break;
      case 'del':
        collectInline((token as Tokens.Del).tokens, { ...marks, strike: {} }, out);
        break;
      case 'codespan':
        out.push({ text: decode((token as Tokens.Codespan).text), marks: { ...marks, code: {} } });
        break;
      case 'link': {
        const link = token as Tokens.Link;
        // Only web and mail links become links; anything else stays as text.
        const safe = /^(https?:|mailto:)/i.test(link.href);
        collectInline(link.tokens, safe ? { ...marks, link: { href: link.href, ...LINK_ATTRS } } : marks, out);
        break;
      }
      case 'br':
        out.push({ hardBreak: true });
        break;
      case 'image':
        out.push({ text: (token as Tokens.Image).text || 'image', marks });
        break;
      case 'text': {
        const text = token as Tokens.Text;
        if (text.tokens?.length) collectInline(text.tokens, marks, out);
        // A soft line break inside a paragraph reads as a space.
        else out.push({ text: decode(text.text).replace(/\n/g, ' '), marks });
        break;
      }
      case 'escape':
        out.push({ text: decode((token as Tokens.Escape).text), marks });
        break;
      default:
        if ('raw' in token && token.raw) out.push({ text: token.raw.replace(/\n/g, ' '), marks });
    }
  }
}

/** A text-holding node: runs of formatted text, split by hard breaks. */
function inlineNode(name: string, tokens: Token[] | undefined, attrs: Record<string, any> = {}): Y.XmlElement {
  const node = new Y.XmlElement(name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);

  const pieces: Inline[] = [];
  collectInline(tokens, {}, pieces);

  // Runs of text between hard breaks. A text not yet in a document cannot
  // report its length, so each run list goes in as one delta.
  const children: Array<Y.XmlText | Y.XmlElement> = [];
  let runs: Array<{ insert: string; attributes: Record<string, any> }> = [];
  const flush = () => {
    if (!runs.length) return;
    const text = new Y.XmlText();
    // Explicit attributes on every run, so plain text never inherits the
    // previous run's bold or link.
    text.applyDelta(runs);
    children.push(text);
    runs = [];
  };
  for (const piece of pieces) {
    if ('hardBreak' in piece) {
      flush();
      children.push(new Y.XmlElement('hardBreak'));
    } else if (piece.text) {
      runs.push({ insert: piece.text, attributes: piece.marks as Record<string, any> });
    }
  }
  flush();
  if (children.length) node.insert(0, children);
  return node;
}

const paragraph = (tokens: Token[] | undefined) => inlineNode('paragraph', tokens);

function listItems(list: Tokens.List): Y.XmlElement {
  const isTaskList = list.items.length > 0 && list.items.every((item) => item.task);
  const container = new Y.XmlElement(isTaskList ? 'taskList' : list.ordered ? 'orderedList' : 'bulletList');
  if (list.ordered && !isTaskList && typeof list.start === 'number' && list.start !== 1) {
    container.setAttribute('start', String(list.start));
  }

  const items = list.items.map((item) => {
    const node = new Y.XmlElement(isTaskList ? 'taskItem' : 'listItem');
    if (isTaskList) node.setAttribute('checked', item.checked ? 'true' : 'false');
    const children = blocks(item.tokens);
    // A list item must start with a paragraph.
    if (!children.length || children[0].nodeName !== 'paragraph') children.unshift(new Y.XmlElement('paragraph'));
    node.insert(0, children);
    return node;
  });
  if (items.length) container.insert(0, items);
  return container;
}

function blocks(tokens: Token[]): Y.XmlElement[] {
  const out: Y.XmlElement[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
      case 'checkbox':
        break;
      case 'heading': {
        const heading = token as Tokens.Heading;
        out.push(inlineNode('heading', heading.tokens, { level: Math.min(heading.depth, MAX_HEADING) }));
        break;
      }
      case 'paragraph':
        out.push(paragraph((token as Tokens.Paragraph).tokens));
        break;
      case 'text': {
        // Tight list items hold bare text tokens rather than paragraphs.
        const text = token as Tokens.Text;
        out.push(paragraph(text.tokens ?? [{ type: 'text', raw: text.raw, text: text.text } as Tokens.Text]));
        break;
      }
      case 'blockquote': {
        const quote = new Y.XmlElement('blockquote');
        const inner = blocks((token as Tokens.Blockquote).tokens);
        quote.insert(0, inner.length ? inner : [new Y.XmlElement('paragraph')]);
        out.push(quote);
        break;
      }
      case 'hr':
        out.push(new Y.XmlElement('horizontalRule'));
        break;
      case 'code': {
        const code = token as Tokens.Code;
        const node = new Y.XmlElement('codeBlock');
        if (code.lang) node.setAttribute('language', code.lang.split(/\s/)[0]);
        if (code.text) {
          const text = new Y.XmlText();
          text.applyDelta([{ insert: code.text }]);
          node.insert(0, [text]);
        }
        out.push(node);
        break;
      }
      case 'list':
        out.push(listItems(token as Tokens.List));
        break;
      case 'table': {
        // The editor has no tables: each row becomes a line, header in bold.
        const table = token as Tokens.Table;
        const row = (cells: Tokens.TableCell[], bold: boolean) =>
          paragraph(
            cells.flatMap((cell, i) => [
              ...(i ? [{ type: 'text', raw: ' | ', text: ' | ' } as Tokens.Text] : []),
              ...(bold ? [{ type: 'strong', raw: '', text: '', tokens: cell.tokens } as Tokens.Strong] : cell.tokens),
            ])
          );
        out.push(row(table.header, true), ...table.rows.map((cells) => row(cells, false)));
        break;
      }
      case 'html': {
        const raw = (token as Tokens.HTML).text.trim();
        if (raw) out.push(paragraph([{ type: 'text', raw, text: raw } as Tokens.Text]));
        break;
      }
      default:
        if ('raw' in token && token.raw.trim()) {
          out.push(paragraph([{ type: 'text', raw: token.raw, text: token.raw.trim() } as Tokens.Text]));
        }
    }
  }
  return out;
}

/** The editor nodes for a piece of Markdown, ready to insert into a fragment. */
export function markdownToElements(markdown: string): Y.XmlElement[] {
  return blocks(Lexer.lex(markdown, { gfm: true, breaks: false }));
}
