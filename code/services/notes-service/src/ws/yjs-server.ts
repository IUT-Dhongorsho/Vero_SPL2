// @ts-ignore — y-websocket ships its server helpers untyped
import { getYDoc, setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import { WebSocketServer } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import { authenticateWs } from '../middleware/auth.js';
import { documentService, permissions } from '../services/document.service.js';
import { accessService } from '../services/access.service.js';
import { ydocToHtml, markdownToYdoc } from '../services/ydoc-html.js';
import { liveEditors } from '../monitoring/metrics.js';
import { editLiveDoc, liveState, YLive } from '../services/live-docs.js';

/** Save at most this long after typing stops, and at least this often while it goes on. */
const SAVE_AFTER_IDLE_MS = 2_000;
const SAVE_AT_LEAST_EVERY_MS = 10_000;

/** A note's database state finishing loading into its live document. */
const loading = new Map<string, Promise<void>>();
const saveTimers = new Map<string, { timer: ReturnType<typeof setTimeout>; since: number }>();

async function persist(docName: string, ydoc: Y.Doc) {
  try {
    // Never replace a written note with an empty document (a failed load, say).
    const fragment = ydoc.getXmlFragment('default');
    if (fragment.length === 0) {
      const doc = await documentService.getRawById(docName);
      if (doc?.contentSnapshot?.trim()) {
        console.warn(`[YjsServer] Refusing to overwrite populated note "${docName}" with empty state`);
        return;
      }
    }
    // The HTML snapshot is what previews, search and the non-collaborative
    // editor read — it must reflect the live document.
    await documentService.saveYjsState(docName, liveState(ydoc), ydocToHtml(ydoc));
  } catch (e) {
    console.error('Failed to write yjs state', e);
  }
}

/**
 * y-websocket itself only saves when the last person leaves, so a restart or
 * crash lost everything typed since the note was opened. Save shortly after
 * typing pauses instead, and regularly during long bursts.
 */
function scheduleSave(docName: string, ydoc: Y.Doc) {
  const pending = saveTimers.get(docName);
  const since = pending?.since ?? Date.now();
  if (pending) clearTimeout(pending.timer);
  const wait = Math.max(0, Math.min(SAVE_AFTER_IDLE_MS, since + SAVE_AT_LEAST_EVERY_MS - Date.now()));
  const timer = setTimeout(() => {
    saveTimers.delete(docName);
    persist(docName, ydoc);
  }, wait);
  saveTimers.set(docName, { timer, since });
}

export const yjsPersistence = {
  bindState(docName: string, ydoc: Y.Doc) {
    const load = (async () => {
      try {
        const doc = await documentService.getRawById(docName);
        if (doc?.yjsState) {
          YLive.applyUpdate(ydoc, Buffer.from(doc.yjsState, 'base64'));
        } else if (doc?.contentSnapshot?.trim() && !/^\s*</.test(doc.contentSnapshot)) {
          // Plain text or Markdown. Editor HTML is left to the first browser to
          // join, which parses it with the editor's own schema.
          editLiveDoc(ydoc, (working) => markdownToYdoc(doc.contentSnapshot, working));
        }
      } catch (e) {
        console.error('Failed to load yjs state', e);
      }
      ydoc.on('update', () => scheduleSave(docName, ydoc));
    })();
    loading.set(docName, load);
    load.finally(() => loading.delete(docName));
    return load;
  },
  async writeState(docName: string, ydoc: Y.Doc) {
    // The last person left: save now rather than when the timer fires.
    const pending = saveTimers.get(docName);
    if (pending) clearTimeout(pending.timer);
    saveTimers.delete(docName);
    await persist(docName, ydoc);
  },
};

setPersistence(yjsPersistence);

/**
 * y-protocols message types: 0 = sync (sub-types 0 step1, 1 step2, 2 update),
 * 1 = awareness. A read-only client may ask for the document (step1) and share
 * its cursor, but anything that would change the document is dropped.
 */
export function isDocumentWrite(data: Uint8Array): boolean {
  return data.length > 1 && data[0] === 0 && (data[1] === 1 || data[1] === 2);
}

export function attachYjsServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      if (!url.pathname.includes('/yjs')) {
        return;
      }

      const parts = url.pathname.split('/');
      const documentId = parts[parts.length - 1];
      const { userId, token } = await authenticateWs(req);

      const doc = await documentService.getRawById(documentId);
      const role = doc ? await accessService.moduleRole(`Bearer ${token}`, doc.moduleId) : null;
      if (!doc || !permissions.canRead(doc, userId, role)) {
        socket.destroy();
        return;
      }
      const canEdit = permissions.canEdit(doc, userId, role);

      // y-websocket starts the sync handshake as soon as the socket is set up.
      // If the note were still loading, the browser would see it empty, seed
      // it from the saved HTML, and then receive the real content as well.
      getYDoc(documentId);
      await loading.get(documentId);

      wss.handleUpgrade(req, socket, head, (ws: any) => {
        if (!canEdit) {
          // Filter writes before y-websocket's own message listener sees them.
          const on = ws.on.bind(ws);
          ws.on = (event: string, listener: (...args: any[]) => void) =>
            event === 'message'
              ? on(event, (data: any, ...rest: any[]) => {
                  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
                  if (!isDocumentWrite(bytes)) listener(data, ...rest);
                })
              : on(event, listener);
        }
        setupWSConnection(ws, req, { docName: documentId });
        liveEditors.inc();
        ws.once('close', () => liveEditors.dec());
      });
    } catch (error) {
      console.error('WebSocket upgrade failed:', error);
      socket.destroy();
    }
  });
}
