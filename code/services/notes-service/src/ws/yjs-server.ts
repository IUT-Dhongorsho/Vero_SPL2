// @ts-ignore — y-websocket ships its server helpers untyped
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import { WebSocketServer } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import { authenticateWs } from '../middleware/auth.js';
import { documentService, permissions } from '../services/document.service.js';
import { accessService } from '../services/access.service.js';
import { ydocToHtml } from '../services/ydoc-html.js';

setPersistence({
  bindState: async (docName: string, ydoc: Y.Doc) => {
    try {
      const doc = await documentService.getRawById(docName);
      if (doc?.yjsState) {
        const state = Buffer.from(doc.yjsState, 'base64');
        Y.applyUpdate(ydoc, state);
      }
    } catch (e) {
      console.error('Failed to load yjs state', e);
    }
  },
  writeState: async (docName: string, ydoc: Y.Doc) => {
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      // The HTML snapshot is what the non-collaborative editor, previews and
      // search read — it must reflect the live document.
      await documentService.saveYjsState(docName, state, ydocToHtml(ydoc));
    } catch (e) {
      console.error('Failed to write yjs state', e);
    }
  }
});

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
      });
    } catch (error) {
      console.error('WebSocket upgrade failed:', error);
      socket.destroy();
    }
  });
}
