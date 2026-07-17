import { Request, Response } from 'express';
import { taskService } from '../services/task.service.js';

export const taskController = {
  async getByProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const tasks = await taskService.getTasksByProject(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { title, description, columnId, assigneeId, creatorId, dueDate, priority, labels } = req.body;

      if (!title || !columnId || !creatorId) {
        return res.status(400).json({ error: 'title, columnId, and creatorId are required' });
      }

      const task = await taskService.createTask({
        title,
        description,
        columnId,
        assigneeId,
        creatorId,
        dueDate,
        priority,
        labels,
      });

      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const task = await taskService.updateTask(id, req.body);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await taskService.deleteTask(id);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },

  async move(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { columnId, order } = req.body;

      if (!columnId || order === undefined) {
        return res.status(400).json({ error: 'columnId and order are required' });
      }

      const task = await taskService.moveTask(id, { columnId, order });
      res.json(task);
    } catch (error: any) {
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.status(500).json({ error: 'Failed to move task' });
    }
  },
};
