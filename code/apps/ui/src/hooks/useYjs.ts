import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuthStore } from '../stores/auth.store';

interface UseYjsOptions {
  documentId: string;
  enabled: boolean;
}

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

export function useYjs({ documentId, enabled }: UseYjsOptions) {
  const { token, user } = useAuthStore();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!enabled || !documentId || !token) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const defaultProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = `${defaultProtocol}//${window.location.host}/api/notes/yjs`;
    const wsUrl = import.meta.env.VITE_NOTES_WS_URL || (window.location.port === '3000' ? 'ws://localhost:8003/yjs' : defaultWsUrl);
    
    const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
      connect: false,
      params: { token },
    });
    
    provider.connect();
    
    providerRef.current = provider;

    provider.awareness.setLocalStateField('user', {
      name: user?.name ?? 'Anonymous',
      color: stringToColor(user?.id ?? 'anon'),
      id: user?.id,
    });

    provider.on('status', (e: { status: string }) => {
      setStatus(e.status as any);
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
    };
  }, [documentId, enabled, token, user]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    status,
    awareness: providerRef.current?.awareness ?? null,
  };
}
