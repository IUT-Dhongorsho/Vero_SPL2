import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuthStore } from '../stores/auth.store';
import { wsUrl } from '../lib/endpoints';

interface UseYjsOptions {
  documentId: string;
  enabled: boolean;
}

export const colorFor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360} 70% 55%)`;
};

/**
 * One live connection per open note. It depends only on the note and the
 * session token: reconnecting whenever the user object changed tore down the
 * document mid-edit and remounted the editor.
 */
export function useYjs({ documentId, enabled }: UseYjsOptions) {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const userName = useAuthStore((s) => s.user?.name);
  const [session, setSession] = useState<{ ydoc: Y.Doc; provider: WebsocketProvider } | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!enabled || !documentId || !token) return;

    const ydoc = new Y.Doc();
    const url = import.meta.env.VITE_NOTES_WS_URL || wsUrl('/notes/yjs');
    const provider = new WebsocketProvider(url, documentId, ydoc, { params: { token } });

    const onStatus = (e: { status: 'connecting' | 'connected' | 'disconnected' }) => setStatus(e.status);
    const onSync = (isSynced: boolean) => isSynced && setSynced(true);
    provider.on('status', onStatus);
    provider.on('sync', onSync);

    setSynced(false);
    setStatus('connecting');
    setSession({ ydoc, provider });

    return () => {
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      provider.destroy();
      ydoc.destroy();
      setSession(null);
    };
  }, [documentId, enabled, token]);

  // Who is here, for cursors and avatars; updated without reconnecting.
  useEffect(() => {
    session?.provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName ?? 'Anonymous',
      color: colorFor(userId ?? 'anon'),
    });
  }, [session, userId, userName]);

  return {
    ydoc: session?.ydoc ?? null,
    provider: session?.provider ?? null,
    status,
    synced,
    awareness: session?.provider.awareness ?? null,
  };
}
