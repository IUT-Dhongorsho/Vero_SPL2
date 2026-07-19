import { Request, Response } from 'express';
import { db } from '../db/client.js';
import { projects, projectMembers, modules } from '../models/workspace.model.js';
import { eq, and } from 'drizzle-orm';

export class ProjectController {

  /**
   * GET /projects
   * Returns all projects the authenticated user is a member of.
   */
  async getUserProjects(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const memberships = await db.query.projectMembers.findMany({
        where: eq(projectMembers.userId, userId),
        with: {
          project: {
            with: {
              members: true,
            }
          }
        }
      });

      const result = memberships.map(m => ({
        ...m.project,
        memberCount: m.project.members.length,
        userRole: m.role,
      }));

      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  /**
   * GET /projects/:projectId
   */
  async getProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.id;

      const membership = await db.query.projectMembers.findFirst({
        where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied or project not found' });
      }

      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: { members: true, modules: true }
      });

      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  /**
   * POST /projects
   * Creates a new project. Creator is automatically assigned as admin.
   */
  async createProject(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      const userId = (req as any).user.id;

      const newProject = await db.transaction(async (tx) => {
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const [project] = await tx.insert(projects).values({
          name,
          description,
          inviteCode,
        }).returning();

        // Creator is automatically the admin
        await tx.insert(projectMembers).values({
          projectId: project.id,
          userId,
          role: 'admin',
        });

        return project;
      });

      res.status(201).json(newProject);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  /**
   * PATCH /projects/:projectId
   * Only project admins can update.
   */
  async updateProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, description, status } = req.body;
      const userId = (req as any).user.id;

      const member = await db.query.projectMembers.findFirst({
        where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
      });

      if (!member || member.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update the project' });
      }

      const [updated] = await db.update(projects)
        .set({ name, description, status, updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  /**
   * DELETE /projects/:projectId
   * Only project admins can delete.
   */
  async deleteProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.id;

      const member = await db.query.projectMembers.findFirst({
        where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
      });

      if (!member || member.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete the project' });
      }

      await db.delete(projects).where(eq(projects.id, projectId));
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
  /**
   * POST /projects/join
   * Joins a project using an invite code.
   */
  async joinProject(req: Request, res: Response) {
    try {
      const { inviteCode } = req.body;
      const userId = (req as any).user.id;

      if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code is required' });
      }

      // Find project by invite code
      const project = await db.query.projects.findFirst({
        where: eq(projects.inviteCode, inviteCode)
      });

      if (!project) {
        return res.status(404).json({ error: 'Invalid invite code' });
      }

      // Check if user is already a member
      const existingMember = await db.query.projectMembers.findFirst({
        where: and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, userId))
      });

      if (existingMember) {
        return res.status(400).json({ error: 'You are already a member of this project', projectId: project.id });
      }

      // Add user as a member
      await db.insert(projectMembers).values({
        projectId: project.id,
        userId,
        role: 'member'
      });

      res.status(200).json({ success: true, projectId: project.id, message: 'Successfully joined project' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to join project' });
    }
  }
  /**
   * POST /projects/:projectId/invite-code
   * Regenerates or generates an invite code for a project (Admin only)
   */
  async generateInviteCode(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.id;

      const member = await db.query.projectMembers.findFirst({
        where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
      });

      if (!member || member.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can generate an invite code' });
      }

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const [updated] = await db.update(projects)
        .set({ inviteCode })
        .where(eq(projects.id, projectId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate invite code' });
    }
  }
}

export const projectController = new ProjectController();
