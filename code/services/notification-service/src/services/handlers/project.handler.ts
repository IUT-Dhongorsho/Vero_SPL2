import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users } from '../../models/user.model.js';
import { notify } from '../notify.service.js';

const nameOf = async (userId: string) =>
  (await db.query.users.findFirst({ where: eq(users.id, userId) }))?.name ?? 'Someone';

export class ProjectHandler {
  async handle(event: any) {
    const { type, data } = event ?? {};
    switch (type) {
      case 'project.member_joined':
        return this.memberJoined(data);
      case 'project.role_changed':
        return this.roleChanged(data);
      case 'project.member_removed':
        return this.memberRemoved(data);
      case 'module.member_added':
        return this.moduleMemberAdded(data);
    }
  }

  /** Admins hear about newcomers; project-service tells us who the admins are. */
  private async memberJoined(data: any) {
    const admins: string[] = Array.isArray(data.adminIds) ? data.adminIds : [];
    for (const adminId of admins.filter((id) => id !== data.userId)) {
      await notify({
        userId: adminId,
        type: 'project.member_joined',
        entityId: data.projectId,
        entityType: 'project',
        actorId: data.userId,
        title: `${data.userName} joined ${data.projectName}`,
        body: 'They joined with the invite code. You can change their role on the Members tab.',
        resourceUrl: `/project/${data.projectId}?tab=members`,
      });
    }
  }

  private async roleChanged(data: any) {
    if (data.userId === data.actorId) return;
    const role = data.role === 'admin' ? 'an admin' : data.role === 'viewer' ? 'a viewer' : 'a member';
    await notify({
      userId: data.userId,
      type: 'project.role_changed',
      entityId: data.projectId,
      entityType: 'project',
      actorId: data.actorId,
      title: `You are now ${role} of ${data.projectName}`,
      body: `${await nameOf(data.actorId)} changed your role.`,
      resourceUrl: `/project/${data.projectId}`,
      email: true,
    });
  }

  private async memberRemoved(data: any) {
    if (data.userId === data.actorId) return; // they left on their own
    await notify({
      userId: data.userId,
      type: 'project.member_removed',
      entityId: data.projectId,
      entityType: 'project',
      actorId: data.actorId,
      title: `You were removed from ${data.projectName}`,
      body: `${await nameOf(data.actorId)} removed you from the project.`,
      resourceUrl: '/projects',
      email: true,
    });
  }

  private async moduleMemberAdded(data: any) {
    const userIds: string[] = Array.isArray(data.userIds) ? data.userIds : [];
    if (userIds.length === 0) return;
    const recipients = await db.query.users.findMany({ where: and(inArray(users.id, userIds)) });
    for (const recipient of recipients) {
      await notify({
        userId: recipient.id,
        type: 'module.member_added',
        entityId: data.moduleId,
        entityType: 'module',
        actorId: data.actorId,
        title: `${data.actorName} added you to ${data.moduleName}`,
        body: 'You can now use its board, notes and chat.',
        resourceUrl: `/project/${data.projectId}/module/${data.moduleId}`,
        email: true,
      });
    }
  }
}

export const projectHandler = new ProjectHandler();
