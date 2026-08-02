import fs from 'node:fs';
import { Request, Response } from 'express';
import multer from 'multer';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_ROOT,
  displayName,
  ensureUploadRoot,
  isAllowedFilename,
  publicUrlFor,
  resolveStoredPath,
  safeStoredName,
} from '../services/upload.service.js';
import { channelService } from '../services/channel.service.js';

ensureUploadRoot();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => cb(null, safeStoredName(file.originalname)),
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedFilename(file.originalname)) {
      return cb(new Error('That file type is not allowed'));
    }
    cb(null, true);
  },
}).single('file');

export const fileController = {
  /**
   * Stores an attachment and returns the metadata the client then sends as a
   * `message` socket event. Uploading is separate from sending so a large file
   * does not block the socket.
   */
  async upload(req: Request, res: Response) {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file received' });

    const channelId = String(req.body?.channelId ?? '');
    const userId = (req as any).user.id;

    if (!channelId || !(await channelService.isMember(channelId, userId))) {
      // Do not keep files uploaded to channels the user cannot post in.
      fs.unlink(file.path, () => {});
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    res.status(201).json({
      url: publicUrlFor(file.filename),
      name: displayName(file.originalname),
      mime: file.mimetype,
      size: file.size,
      kind: file.mimetype.startsWith('image/') ? 'image' : 'file',
    });
  },

  /** Streams a stored attachment back. Membership is enforced on upload. */
  download(req: Request, res: Response) {
    const resolved = resolveStoredPath(req.params.storedName);
    if (!resolved || !fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const downloadName = typeof req.query.name === 'string' ? displayName(req.query.name) : undefined;
    // Never render uploaded content inline as HTML in the app's own origin.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved, { headers: downloadName ? { 'Content-Disposition': `inline; filename="${downloadName}"` } : {} });
  },
};
