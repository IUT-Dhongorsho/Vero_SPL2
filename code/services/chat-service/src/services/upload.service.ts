import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Files live outside src so `tsx watch` does not restart on every upload. */
export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Executable and script types are rejected outright — this is a chat file
 * transfer, not a software distribution channel.
 */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.cpl', '.dll', '.jar', '.js', '.jse', '.msi',
  '.ps1', '.scr', '.sh', '.vb', '.vbe', '.vbs', '.wsf', '.wsh', '.app', '.pkg',
]);

export function ensureUploadRoot() {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

export function isAllowedFilename(filename: string): boolean {
  return !BLOCKED_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

/** Strips directory components and anything that could escape the upload root. */
export function safeStoredName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().slice(0, 12);
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

export function displayName(originalName: string): string {
  return path.basename(originalName).replace(/[\r\n]/g, '').slice(0, 255) || 'file';
}

export function publicUrlFor(storedName: string): string {
  return `/api/chat/files/${storedName}`;
}

export function resolveStoredPath(storedName: string): string | null {
  const resolved = path.resolve(UPLOAD_ROOT, path.basename(storedName));
  // Defence in depth: never serve anything outside the upload root.
  return resolved.startsWith(UPLOAD_ROOT) ? resolved : null;
}
