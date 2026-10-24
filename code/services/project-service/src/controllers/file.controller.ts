import fs from 'node:fs';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { and, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projectFiles, projectFolders } from '../models/file.model.js';
import { projectMembers, projects } from '../models/workspace.model.js';
import { accessService, AccessError, sendError } from '../services/access.service.js';
import { MAX_FILE_BYTES, MAX_FILES_PER_UPLOAD, STORAGE_ROOT, storageService } from '../services/storage.service.js';
import { publisherService } from '../services/publisher.service.js';

storageService.ensureRoot();

const userIdOf = (req: Request) => (req as any).user.id as string;

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, STORAGE_ROOT),
    filename: (_req, file, cb) => cb(null, storageService.storedNameFor(file.originalname)),
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_UPLOAD },
  fileFilter: (_req, file, cb) => {
    if (!storageService.isAllowed(file.originalname)) {
      return cb(new AccessError(400, `${file.originalname}: that file type is not allowed`, 'FILE_TYPE_BLOCKED'));
    }
    cb(null, true);
  },
}).array('files', MAX_FILES_PER_UPLOAD);

/** Runs multer and turns its limit errors into readable 400s. */
export function receiveUpload(req: Request, res: Response, next: NextFunction) {
  upload(req as any, res as any, (error: any) => {
    if (!error) return next();
    if (error instanceof AccessError) return res.status(error.status).json({ error: error.message, code: error.code });
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Files can be at most 50 MB'
        : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Upload at most ${MAX_FILES_PER_UPLOAD} files at a time`
          : error.message;
    res.status(400).json({ error: message, code: error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'VALIDATION_FAILED' });
  });
}

const fileView = (f: any) => ({
  id: f.id,
  projectId: f.projectId,
  folderId: f.folderId,
  name: f.name,
  mime: f.mime,
  size: f.size,
  createdAt: f.createdAt,
  updatedAt: f.updatedAt,
  uploader: f.uploader ? { id: f.uploader.id, name: f.uploader.name, avatarUrl: f.uploader.avatarUrl ?? null } : null,
});

async function loadFolder(folderId: string, projectId?: string) {
  const folder = await db.query.projectFolders.findFirst({ where: eq(projectFolders.id, folderId) });
  if (!folder || (projectId && folder.projectId !== projectId)) {
    throw new AccessError(404, 'Folder not found', 'NOT_FOUND');
  }
  return folder;
}

/** Root-to-folder trail for the breadcrumb. */
async function breadcrumbFor(folderId: string | null) {
  if (!folderId) return [];
  const { rows } = await db.execute(sql`
    WITH RECURSIVE trail AS (
      SELECT id, name, parent_id, 0 AS depth FROM project_folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id, f.name, f.parent_id, t.depth + 1 FROM project_folders f JOIN trail t ON f.id = t.parent_id
    )
    SELECT id, name FROM trail ORDER BY depth DESC
  `);
  return rows as { id: string; name: string }[];
}

/** Stored names of every file in a folder and all of its descendants. */
async function storedNamesUnder(folderId: string) {
  const { rows } = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT id FROM project_folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM project_folders f JOIN tree t ON f.parent_id = t.id
    )
    SELECT stored_name FROM project_files WHERE folder_id IN (SELECT id FROM tree)
  `);
  return (rows as { stored_name: string }[]).map((r) => r.stored_name);
}

export class FileController {
  /** GET /projects/:projectId/files?folderId= — one folder's contents. */
  async list(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      const member = await accessService.require(projectId, userIdOf(req));
      const folderId = typeof req.query.folderId === 'string' && req.query.folderId ? req.query.folderId : null;
      if (folderId) await loadFolder(folderId, projectId);

      const [folders, files, breadcrumb] = await Promise.all([
        db.query.projectFolders.findMany({
          where: and(
            eq(projectFolders.projectId, projectId),
            folderId ? eq(projectFolders.parentId, folderId) : isNull(projectFolders.parentId)
          ),
          orderBy: (f, { asc }) => [asc(f.name)],
        }),
        db.query.projectFiles.findMany({
          where: and(
            eq(projectFiles.projectId, projectId),
            folderId ? eq(projectFiles.folderId, folderId) : isNull(projectFiles.folderId)
          ),
          with: { uploader: true },
          orderBy: (f, { desc }) => [desc(f.createdAt)],
        }),
        breadcrumbFor(folderId),
      ]);

      // Item counts let the UI say "3 items" without opening each folder.
      const itemsBy = new Map<string, number>();
      if (folders.length) {
        const folderIds = folders.map((f) => f.id);
        const [subfolders, contained] = await Promise.all([
          db
            .select({ id: projectFolders.parentId, n: sql<number>`count(*)::int` })
            .from(projectFolders)
            .where(inArray(projectFolders.parentId, folderIds))
            .groupBy(projectFolders.parentId),
          db
            .select({ id: projectFiles.folderId, n: sql<number>`count(*)::int` })
            .from(projectFiles)
            .where(inArray(projectFiles.folderId, folderIds))
            .groupBy(projectFiles.folderId),
        ]);
        for (const row of [...subfolders, ...contained]) {
          if (row.id) itemsBy.set(row.id, (itemsBy.get(row.id) ?? 0) + row.n);
        }
      }

      res.json({
        folderId,
        breadcrumb,
        canWrite: member.role !== 'viewer',
        isAdmin: member.role === 'admin',
        folders: folders.map((f) => ({ ...f, items: itemsBy.get(f.id) ?? 0 })),
        files: files.map(fileView),
      });
    } catch (error) {
      sendError(res, error, 'Failed to list files');
    }
  }

  /**
   * GET /files?projectId=&q= — recent files across every project the caller is
   * on, newest first. Powers the global Files page and search.
   */
  async recent(req: Request, res: Response) {
    try {
      const userId = userIdOf(req);
      const memberships = await db.query.projectMembers.findMany({
        where: eq(projectMembers.userId, userId),
        columns: { projectId: true },
      });
      let projectIds = memberships.map((m) => m.projectId);

      const wanted = typeof req.query.projectId === 'string' ? req.query.projectId : '';
      if (wanted) projectIds = projectIds.filter((id) => id === wanted);
      if (projectIds.length === 0) return res.json([]);

      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
      const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);

      const rows = await db.query.projectFiles.findMany({
        where: and(
          inArray(projectFiles.projectId, projectIds),
          q ? ilike(projectFiles.name, `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`) : undefined
        ),
        with: { uploader: true, project: true, folder: true },
        orderBy: [desc(projectFiles.createdAt)],
        limit,
      });

      res.json(
        rows.map((f: any) => ({
          ...fileView(f),
          project: { id: f.project.id, name: f.project.name },
          folder: f.folder ? { id: f.folder.id, name: f.folder.name } : null,
        }))
      );
    } catch (error) {
      sendError(res, error, 'Failed to list files');
    }
  }

  /** POST /projects/:projectId/folders  { name, parentId? } */
  async createFolder(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      const userId = userIdOf(req);
      await accessService.require(projectId, userId, 'write');

      const name = storageService.displayName(String(req.body?.name ?? ''));
      if (!req.body?.name || !name.trim()) throw new AccessError(400, 'A folder needs a name', 'VALIDATION_FAILED');
      const parentId = typeof req.body?.parentId === 'string' && req.body.parentId ? req.body.parentId : null;
      if (parentId) await loadFolder(parentId, projectId);

      const clash = await db.query.projectFolders.findFirst({
        where: and(
          eq(projectFolders.projectId, projectId),
          parentId ? eq(projectFolders.parentId, parentId) : isNull(projectFolders.parentId),
          sql`lower(${projectFolders.name}) = lower(${name})`
        ),
      });
      if (clash) throw new AccessError(409, `A folder called "${name}" already exists here`, 'CONFLICT');

      const [folder] = await db
        .insert(projectFolders)
        .values({ projectId, parentId, name, createdBy: userId })
        .returning();
      res.status(201).json({ ...folder, items: 0 });
    } catch (error) {
      sendError(res, error, 'Failed to create folder');
    }
  }

  /** PATCH /folders/:folderId  { name } */
  async renameFolder(req: Request, res: Response) {
    try {
      const folder = await loadFolder(String(req.params.folderId));
      await accessService.require(folder.projectId, userIdOf(req), 'write');

      const name = storageService.displayName(String(req.body?.name ?? ''));
      if (!req.body?.name || !name.trim()) throw new AccessError(400, 'A folder needs a name', 'VALIDATION_FAILED');

      const [updated] = await db
        .update(projectFolders)
        .set({ name, updatedAt: new Date() })
        .where(eq(projectFolders.id, folder.id))
        .returning();
      res.json(updated);
    } catch (error) {
      sendError(res, error, 'Failed to rename folder');
    }
  }

  /** DELETE /folders/:folderId — removes everything inside it, bytes included. */
  async deleteFolder(req: Request, res: Response) {
    try {
      const folder = await loadFolder(String(req.params.folderId));
      const userId = userIdOf(req);
      const member = await accessService.require(folder.projectId, userId, 'write');
      if (member.role !== 'admin' && folder.createdBy !== userId) {
        throw new AccessError(403, 'Only an admin or whoever created this folder can delete it', 'FORBIDDEN');
      }

      const storedNames = await storedNamesUnder(folder.id);
      await db.delete(projectFolders).where(eq(projectFolders.id, folder.id));
      await storageService.remove(storedNames);

      res.json({ success: true, filesRemoved: storedNames.length });
    } catch (error) {
      sendError(res, error, 'Failed to delete folder');
    }
  }

  /** POST /projects/:projectId/files — multipart `files[]` plus optional `folderId`. */
  async upload(req: Request, res: Response) {
    const received = ((req as any).files ?? []) as Express.Multer.File[];
    const discard = () => storageService.remove(received.map((f) => f.filename));

    try {
      const projectId = String(req.params.projectId);
      const userId = userIdOf(req);
      await accessService.require(projectId, userId, 'write');

      if (received.length === 0) throw new AccessError(400, 'No files received', 'VALIDATION_FAILED');
      const folderId = typeof req.body?.folderId === 'string' && req.body.folderId ? req.body.folderId : null;
      if (folderId) await loadFolder(folderId, projectId);

      const inserted = await db
        .insert(projectFiles)
        .values(
          received.map((f) => ({
            projectId,
            folderId,
            // multer decodes multipart names as latin1; recover UTF-8 names.
            name: storageService.displayName(Buffer.from(f.originalname, 'latin1').toString('utf8')),
            storedName: f.filename,
            mime: f.mimetype || 'application/octet-stream',
            size: f.size,
            uploadedBy: userId,
          }))
        )
        .returning();

      const [project, members] = await Promise.all([
        db.query.projects.findFirst({ where: eq(projects.id, projectId) }),
        db.query.projectMembers.findMany({ where: eq(projectMembers.projectId, projectId), columns: { userId: true } }),
      ]);
      await publisherService.resource({
        type: 'file.uploaded',
        data: {
          projectId,
          projectName: project?.name ?? 'a project',
          folderId,
          fileIds: inserted.map((f) => f.id),
          fileNames: inserted.map((f) => f.name),
          uploaderId: userId,
          uploaderName: (req as any).user.name ?? 'Someone',
          recipientIds: members.map((m) => m.userId).filter((id) => id !== userId),
        },
      });

      const uploader = { id: userId, name: (req as any).user.name, avatarUrl: (req as any).user.avatarUrl ?? null };
      res.status(201).json(inserted.map((f) => fileView({ ...f, uploader })));
    } catch (error) {
      await discard();
      sendError(res, error, 'Failed to upload files');
    }
  }

  /** PATCH /files/:fileId  { name?, folderId? } — rename or move. */
  async update(req: Request, res: Response) {
    try {
      const file = await db.query.projectFiles.findFirst({ where: eq(projectFiles.id, String(req.params.fileId)) });
      if (!file) throw new AccessError(404, 'File not found', 'NOT_FOUND');
      await accessService.require(file.projectId, userIdOf(req), 'write');

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (req.body?.name !== undefined) {
        const name = storageService.displayName(String(req.body.name));
        if (!String(req.body.name).trim()) throw new AccessError(400, 'A file needs a name', 'VALIDATION_FAILED');
        patch.name = name;
      }
      if (req.body?.folderId !== undefined) {
        const folderId = req.body.folderId || null;
        if (folderId) await loadFolder(folderId, file.projectId);
        patch.folderId = folderId;
      }

      const [updated] = await db.update(projectFiles).set(patch).where(eq(projectFiles.id, file.id)).returning();
      res.json(fileView(updated));
    } catch (error) {
      sendError(res, error, 'Failed to update file');
    }
  }

  /** DELETE /files/:fileId — the uploader or an admin. */
  async remove(req: Request, res: Response) {
    try {
      const userId = userIdOf(req);
      const file = await db.query.projectFiles.findFirst({ where: eq(projectFiles.id, String(req.params.fileId)) });
      if (!file) throw new AccessError(404, 'File not found', 'NOT_FOUND');
      const member = await accessService.require(file.projectId, userId, 'write');
      if (member.role !== 'admin' && file.uploadedBy !== userId) {
        throw new AccessError(403, 'Only an admin or whoever uploaded this file can delete it', 'FORBIDDEN');
      }

      await db.delete(projectFiles).where(eq(projectFiles.id, file.id));
      await storageService.remove([file.storedName]);
      res.json({ success: true });
    } catch (error) {
      sendError(res, error, 'Failed to delete file');
    }
  }

  /** GET /files/:fileId/content[?download=1] — streams the bytes to a project member. */
  async content(req: Request, res: Response) {
    try {
      const file = await db.query.projectFiles.findFirst({ where: eq(projectFiles.id, String(req.params.fileId)) });
      if (!file) throw new AccessError(404, 'File not found', 'NOT_FOUND');
      await accessService.require(file.projectId, userIdOf(req));

      const resolved = storageService.resolve(file.storedName);
      const stat = resolved ? await fs.promises.stat(resolved).catch(() => null) : null;
      if (!resolved || !stat?.isFile()) throw new AccessError(404, 'The stored file is missing', 'NOT_FOUND');

      const inline = req.query.download !== '1' && storageService.canInline(file.mime);
      const asciiName = file.name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
      res.setHeader('Content-Type', file.mime);
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader(
        'Content-Disposition',
        `${inline ? 'inline' : 'attachment'}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`
      );

      // Streamed rather than res.sendFile: `send` refuses paths containing a
      // dot-directory, which breaks whenever the checkout lives under one.
      const stream = fs.createReadStream(resolved);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      sendError(res, error, 'Failed to read file');
    }
  }
}

export const fileController = new FileController();
