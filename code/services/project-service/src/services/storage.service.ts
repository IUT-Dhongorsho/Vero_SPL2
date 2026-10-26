import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Project files live on local disk (a volume in Docker). Kept outside src so
 * `tsx watch` does not restart on every upload.
 */
export const STORAGE_ROOT = path.resolve(env.UPLOAD_DIR ?? path.resolve(__dirname, '../../uploads'));

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES_PER_UPLOAD = 10;

/** Executables and scripts are refused — this is a document library. */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.cpl', '.dll', '.jar', '.js', '.jse', '.msi',
  '.ps1', '.scr', '.sh', '.vb', '.vbe', '.vbs', '.wsf', '.wsh', '.app', '.pkg',
]);

/** MIME types that are safe to render inline in the browser. */
const INLINE_MIME = /^(image\/(png|jpe?g|gif|webp|avif)|application\/pdf|text\/plain|video\/(mp4|webm)|audio\/(mpeg|ogg|wav))/;

export const storageService = {
  ensureRoot() {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  },

  isAllowed(filename: string) {
    return !BLOCKED_EXTENSIONS.has(path.extname(filename).toLowerCase());
  },

  storedNameFor(originalName: string) {
    const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 12);
    return `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
  },

  /** A display name with directory parts and control characters removed. */
  displayName(name: string) {
    return path.basename(name).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255) || 'file';
  },

  /** Absolute path for a stored name, or null if it would escape the root. */
  resolve(storedName: string) {
    const resolved = path.resolve(STORAGE_ROOT, path.basename(storedName));
    return resolved.startsWith(STORAGE_ROOT + path.sep) ? resolved : null;
  },

  canInline(mime: string) {
    return INLINE_MIME.test(mime);
  },

  async remove(storedNames: string[]) {
    await Promise.all(
      storedNames.map(async (name) => {
        const resolved = this.resolve(name);
        if (resolved) await fs.promises.unlink(resolved).catch(() => {});
      })
    );
  },
};
