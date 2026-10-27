import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { taskService } from '../services/task.service.js';
import { publisherService } from '../services/publisher.service.js';
import { db } from '../db/client.js';
import { columns } from '../models/column.model.js';
import { projectMemberIds, type BoardRequest } from '../middleware/access.js';

const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

/** Tells the assignee — unless they assigned it to themselves. */
async function announceAssignment(req: BoardRequest, task: { id: string; title: string; assigneeId: string | null }) {
  const board = req.board!;
  if (!task.assigneeId || task.assigneeId === req.userId) return;
  await publisherService.taskAssigned({
    taskId: task.id,
    taskTitle: task.title,
    assigneeId: task.assigneeId,
    assignerId: req.userId!,
    projectId: board.projectId,
    projectName: board.projectName,
    moduleId: board.boardId,
    moduleName: board.moduleName,
  });
}

/** Every member of the board's project reloads their board, calendar and work. */
function announceChange(req: BoardRequest) {
  const board = req.board!;
  projectMemberIds(req, board.projectId)
    .then((recipientIds) => publisherService.workChanged({ recipientIds, boardId: board.boardId, projectId: board.projectId }))
    .catch(() => {});
}

export const taskController = {
  async getByProject(req: BoardRequest, res: Response) {
    try {
      const tasks = await taskService.getTasksByProject(req.board!.boardId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },

  async getById(req: BoardRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const task = await taskService.getTaskById(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  },

  async create(req: BoardRequest, res: Response) {
    try {
      const { title, description, columnId, assigneeId, dueDate, priority, labels } = req.body;

      if (typeof title !== 'string' || !title.trim() || !columnId) {
        return res.status(400).json({ error: 'A task needs a title and a column' });
      }
      if (priority !== undefined && !PRIORITIES.has(priority)) {
        return res.status(400).json({ error: 'Unknown priority' });
      }

      const task = await taskService.createTask({
        title: title.trim().slice(0, 255),
        description,
        columnId,
        assigneeId,
        // The creator is whoever is signed in, not whatever the client claims.
        creatorId: req.userId!,
        dueDate,
        priority,
        labels,
      });

      await announceAssignment(req, task);
      announceChange(req);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  async update(req: BoardRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { priority, title } = req.body ?? {};
      if (priority !== undefined && !PRIORITIES.has(priority)) {
        return res.status(400).json({ error: 'Unknown priority' });
      }
      if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        return res.status(400).json({ error: 'A task needs a title' });
      }

      const before = await taskService.getTaskById(id);
      const { creatorId: _ignored, columnId: _moveSeparately, ...patch } = req.body ?? {};
      const task = await taskService.updateTask(id, patch);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      if (task.assigneeId && task.assigneeId !== before?.assigneeId) {
        await announceAssignment(req, task);
      }
      announceChange(req);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  },

  async delete(req: BoardRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const deleted = await taskService.deleteTask(id);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      announceChange(req);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },

  async move(req: BoardRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { columnId, order } = req.body;

      if (!columnId || order === undefined) {
        return res.status(400).json({ error: 'columnId and order are required' });
      }

      // A task can only move between columns of the board it is on.
      const [target] = await db.select({ projectId: columns.projectId }).from(columns).where(eq(columns.id, columnId));
      if (!target || target.projectId !== req.board!.boardId) {
        return res.status(400).json({ error: 'That column is not on this board' });
      }

      const task = await taskService.moveTask(id, { columnId, order });
      announceChange(req);
      res.json(task);
    } catch (error: any) {
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.status(500).json({ error: 'Failed to move task' });
    }
  },
};
