import { createRequire } from 'module';
import * as Y from 'yjs';
// @ts-ignore — y-websocket ships its server helpers untyped
import { docs } from 'y-websocket/bin/utils';

/**
 * y-websocket's server helpers `require('yjs')` (the CommonJS build) while this
 * service imports the ES module build: two copies of Yjs. A live document's
 * types belong to the CommonJS copy, so nodes built here cannot be inserted
 * into it directly. Edits are made on an ES-module copy and only the binary
 * difference crosses over — the update format is the same for both builds.
 */
const requireFromYWebsocket = createRequire(createRequire(import.meta.url).resolve('y-websocket/bin/utils'));
export const YLive = requireFromYWebsocket('yjs') as typeof Y;

/** The in-memory document people are editing right now, if anyone is. */
export function liveDoc(id: string): any | null {
  return (docs as Map<string, any>).get(id) ?? null;
}

/** Runs `edit` against a live document; everyone connected sees the change at once. */
export function editLiveDoc(live: any, edit: (doc: Y.Doc) => void) {
  const working = new Y.Doc();
  Y.applyUpdate(working, YLive.encodeStateAsUpdate(live));
  const before = Y.encodeStateVector(working);
  edit(working);
  YLive.applyUpdate(live, Y.encodeStateAsUpdate(working, before));
}

/** The full state of a live document, for saving. */
export function liveState(live: any): Uint8Array {
  return YLive.encodeStateAsUpdate(live);
}
