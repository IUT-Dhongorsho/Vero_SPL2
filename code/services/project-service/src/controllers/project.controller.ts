import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { projects, projectMembers } from '../models/workspace.model.js';
import { eq, and } from 'drizzle-orm';
import { accessService, AccessError, sendError } from '../services/access.service.js';
import { publisherService } from '../services/publisher.service.js';

const PROJECT_STATUSES = new Set(['active', 'completed']);
const userIdOf = (req: Request) => (req as any).user.id as string;

/** Six characters from an alphabet without look-alikes (0/O, 1/I/L). */
function newInviteCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join('');
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, max);
}

export class ProjectController {

  /**
   * GET /projects
   * Returns all projects the authenticated user is a member of.
   */
  async getUserProjects(req: Request, res: Response) {
    try {
      const userId = userIdOf(req);

      const memberships = await db.query.projectMembers.findMany({
        where: eq(projectMembers.userId, userId),
        with: {
          project: {
            with: {
              members: true,
              modules: { columns: { id: true } },
            }
          }
        }
      });

      const result = memberships.map(({ project, role }) => {
        const { members, modules, ...rest } = project;
        return {
          ...rest,
          memberCount: members.length,
          moduleCount: modules.length,
          userRole: role,
        };
      });

      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      res.json(result);
    } catch (error) {
      sendError(res, error, 'Failed to fetch projects');
    }
  }

  /**
   * GET /projects/:projectId
   */
  async getProject(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      const membership = await accessService.require(projectId, userIdOf(req));

      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: { members: true, modules: { columns: { id: true } } }
      });
      if (!project) throw new AccessError(404, 'Project not found', 'NOT_FOUND');

      const { members, modules, inviteCode, ...rest } = project;
      res.json({
        ...rest,
        // Only admins hand out invite codes, so only they see them.
        inviteCode: membership.role === 'admin' ? inviteCode : undefined,
        memberCount: members.length,
        moduleCount: modules.length,
        userRole: membership.role,
      });
    } catch (error) {
      sendError(res, error, 'Failed to fetch project');
    }
  }

  /**
   * POST /projects
   * Creates a new project. Creator is automatically assigned as admin.
   */
  async createProject(req: Request, res: Response) {
    try {
      const name = cleanText(req.body?.name, 255);
      const description = cleanText(req.body?.description, 2000) ?? '';
      const userId = userIdOf(req);

      if (!name) throw new AccessError(400, 'A project needs a name', 'VALIDATION_FAILED');

      const newProject = await db.transaction(async (tx) => {
        const [project] = await tx.insert(projects).values({
          name,
          description,
          inviteCode: newInviteCode(),
        }).returning();

        // Creator is automatically the admin
        await tx.insert(projectMembers).values({
          projectId: project.id,
          userId,
          role: 'admin',
        });

        return project;
      });

      res.status(201).json({ ...newProject, memberCount: 1, moduleCount: 0, userRole: 'admin' });
    } catch (error) {
      sendError(res, error, 'Failed to create project');
    }
  }

  /**
   * PATCH /projects/:projectId
   * Only project admins can update.
   */
  async updateProject(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      await accessService.require(projectId, userIdOf(req), 'manageProject');

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      const name = cleanText(req.body?.name, 255);
      const description = cleanText(req.body?.description, 2000);
      const status = req.body?.status;

      if (name !== undefined) {
        if (!name) throw new AccessError(400, 'A project needs a name', 'VALIDATION_FAILED');
        patch.name = name;
      }
      if (description !== undefined) patch.description = description;
      if (status !== undefined) {
        if (!PROJECT_STATUSES.has(status)) throw new AccessError(400, 'Unknown project status', 'VALIDATION_FAILED');
        patch.status = status;
      }

      const [updated] = await db.update(projects)
        .set(patch)
        .where(eq(projects.id, projectId))
        .returning();

      res.json(updated);
    } catch (error) {
      sendError(res, error, 'Failed to update project');
    }
  }

  /**
   * DELETE /projects/:projectId
   * Only project admins can delete.
   */
  async deleteProject(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      await accessService.require(projectId, userIdOf(req), 'manageProject');

      await db.delete(projects).where(eq(projects.id, projectId));
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      sendError(res, error, 'Failed to delete project');
    }
  }

  /**
   * POST /projects/join
   * Joins a project using an invite code.
   */
  async joinProject(req: Request, res: Response) {
    try {
      const inviteCode = cleanText(req.body?.inviteCode, 20)?.toUpperCase();
      const user = (req as any).user;

      if (!inviteCode) {
        throw new AccessError(400, 'Invite code is required', 'VALIDATION_FAILED');
      }

      const project = await db.query.projects.findFirst({
        where: eq(projects.inviteCode, inviteCode)
      });

      if (!project) {
        throw new AccessError(404, 'That invite code does not match any project', 'NOT_FOUND');
      }

      const existingMember = await db.query.projectMembers.findFirst({
        where: and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, user.id))
      });

      if (existingMember) {
        return res.status(409).json({ error: 'You are already a member of this project', code: 'CONFLICT', projectId: project.id });
      }

      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: user.id,
        role: 'member'
      });

      const admins = await db.query.projectMembers.findMany({
        where: and(eq(projectMembers.projectId, project.id), eq(projectMembers.role, 'admin')),
        columns: { userId: true },
      });
      await publisherService.project({
        type: 'project.member_joined',
        data: {
          projectId: project.id,
          projectName: project.name,
          userId: user.id,
          userName: user.name ?? 'Someone',
          adminIds: admins.map((a) => a.userId),
        },
      });

      res.status(200).json({ success: true, projectId: project.id, message: 'Successfully joined project' });
    } catch (error) {
      sendError(res, error, 'Failed to join project');
    }
  }

  /**
   * POST /projects/:projectId/invite-code
   * Regenerates the invite code (admin only). The old code stops working.
   */
  async generateInviteCode(req: Request, res: Response) {
    try {
      const projectId = String(req.params.projectId);
      await accessService.require(projectId, userIdOf(req), 'manageMembers');

      const [updated] = await db.update(projects)
        .set({ inviteCode: newInviteCode(), updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .returning();

      res.json(updated);
    } catch (error) {
      sendError(res, error, 'Failed to generate invite code');
    }
  }
}

export const projectController = new ProjectController();
