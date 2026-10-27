import { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import {
  PERSONAL_TASK_STATUSES,
  TASK_PRIORITIES,
  personalTaskService,
  type PersonalTaskStatus,
  type TaskPriority,
} from '../services/personalTask.service.js';
import { taskService } from '../services/task.service.js';
import { publisherService } from '../services/publisher.service.js';
import { adminBoardIds } from '../middleware/access.js';

function parseStatus(value: unknown): PersonalTaskStatus | undefined {
  return PERSONAL_TASK_STATUSES.includes(value as PersonalTaskStatus)
    ? (value as PersonalTaskStatus)
    : undefined;
}

function parsePriority(value: unknown): TaskPriority | undefined {
  return TASK_PRIORITIES.includes(value as TaskPriority) ? (value as TaskPriority) : undefined;
}

/** Personal lists are private: only the owner's other tabs and devices reload. */
function mineChanged(req: AuthedRequest) {
  publisherService.workChanged({ recipientIds: [req.userId!], boardId: null, projectId: null });
}

function shape(task: any) {
  return {
    ...task,
    source: 'personal' as const,
    labels: task.labels ? String(task.labels).split(',').filter(Boolean) : [],
  };
}

export const personalTaskController = {
  async list(req: AuthedRequest, res: Response) {
    try {
      const tasks = await personalTaskService.list(req.userId!);
      res.json(tasks.map(shape));
    } catch (error) {
      console.error('[personalTask:list]', error);
      res.status(500).json({ error: 'Failed to fetch personal tasks' });
    }
  },

  async create(req: AuthedRequest, res: Response) {
    try {
      const title = String(req.body?.title ?? '').trim();
      if (!title) return res.status(400).json({ error: 'title is required' });

      const task = await personalTaskService.create({
        userId: req.userId!,
        title,
        description: req.body?.description,
        status: parseStatus(req.body?.status),
        priority: parsePriority(req.body?.priority),
        dueDate: req.body?.dueDate ?? null,
        labels: req.body?.labels,
      });

      mineChanged(req);
      res.status(201).json(shape(task));
    } catch (error) {
      console.error('[personalTask:create]', error);
      res.status(500).json({ error: 'Failed to create personal task' });
    }
  },

  async update(req: AuthedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const task = await personalTaskService.update(id, req.userId!, {
        title: req.body?.title,
        description: req.body?.description,
        status: parseStatus(req.body?.status),
        priority: parsePriority(req.body?.priority),
        dueDate: req.body?.dueDate,
        labels: req.body?.labels,
        order: req.body?.order,
        pinned: req.body?.pinned,
      });

      if (!task) return res.status(404).json({ error: 'Task not found' });
      mineChanged(req);
      res.json(shape(task));
    } catch (error) {
      console.error('[personalTask:update]', error);
      res.status(500).json({ error: 'Failed to update personal task' });
    }
  },

  async remove(req: AuthedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const deleted = await personalTaskService.remove(id, req.userId!);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      mineChanged(req);
      res.status(204).send();
    } catch (error) {
      console.error('[personalTask:remove]', error);
      res.status(500).json({ error: 'Failed to delete personal task' });
    }
  },

  async reorder(req: AuthedRequest, res: Response) {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const valid = items
        .map((item: any) => ({
          id: String(item?.id ?? ''),
          status: parseStatus(item?.status) ?? 'backlog',
          order: Number(item?.order) || 0,
        }))
        .filter((item: any) => item.id);

      const tasks = await personalTaskService.reorder(req.userId!, valid);
      mineChanged(req);
      res.json(tasks.map(shape));
    } catch (error) {
      console.error('[personalTask:reorder]', error);
      res.status(500).json({ error: 'Failed to reorder personal tasks' });
    }
  },
};

export const myWorkController = {
  /**
   * GET /my/calendar?scope=mine|team. Everyone sees their own deadlines (tasks
   * assigned to them plus their personal tasks). A project admin may also ask
   * for `team`: every dated task in the projects they administer, whoever it is
   * assigned to. Other people's personal tasks are never included.
   */
  async calendar(req: AuthedRequest, res: Response) {
    try {
      const scope = req.query.scope === 'team' ? 'team' : 'mine';
      const [boards, personal] = await Promise.all([adminBoardIds(req), personalTaskService.list(req.userId!)]);
      if (boards === null) return res.status(503).json({ error: 'Could not check your projects right now' });

      const canSeeTeam = boards.length > 0;
      if (scope === 'team' && !canSeeTeam) {
        return res.status(403).json({ error: 'Only project admins can see the team calendar' });
      }

      const projectTasks =
        scope === 'team' ? await taskService.getDatedTasksOnBoards(boards) : await taskService.getTasksAssignedTo(req.userId!);
      res.json({ scope, canSeeTeam, projectTasks, personalTasks: personal.map(shape) });
    } catch (error) {
      console.error('[myWork:calendar]', error);
      res.status(500).json({ error: 'Failed to load the calendar' });
    }
  },

  /** Everything on my plate: project tasks assigned to me + my own tasks. */
  async assigned(req: AuthedRequest, res: Response) {
    try {
      const [projectTasks, personal] = await Promise.all([
        taskService.getTasksAssignedTo(req.userId!),
        personalTaskService.list(req.userId!),
      ]);

      res.json({
        projectTasks,
        personalTasks: personal.map(shape),
      });
    } catch (error) {
      console.error('[myWork:assigned]', error);
      res.status(500).json({ error: 'Failed to fetch assigned work' });
    }
  },

  async stats(req: AuthedRequest, res: Response) {
    try {
      const [projectStats, personal] = await Promise.all([
        taskService.getStatsFor(req.userId!),
        personalTaskService.list(req.userId!),
      ]);

      res.json({
        ...projectStats,
        personalTotal: personal.length,
        personalDone: personal.filter((t) => t.status === 'done').length,
      });
    } catch (error) {
      console.error('[myWork:stats]', error);
      res.status(500).json({ error: 'Failed to fetch task statistics' });
    }
  },
};
