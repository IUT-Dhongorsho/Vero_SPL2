// @ts-ignore
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import { WebSocketServer } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import { authenticateWs } from '../middleware/auth.js';
import { documentService } from '../services/document.service.js';

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
      const snapshot = ''; 
      
      await documentService.saveYjsState(docName, state, snapshot);
    } catch (e) {
      console.error('Failed to write yjs state', e);
    }
  }
});

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
      const { userId } = await authenticateWs(req);
      const note = await documentService.getById(documentId, userId);
      
      if (!note) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws: any) => {
        setupWSConnection(ws, req, { docName: documentId });
      });
    } catch (error) {
      console.error('WebSocket upgrade failed:', error);
      socket.destroy();
    }
  });
}
