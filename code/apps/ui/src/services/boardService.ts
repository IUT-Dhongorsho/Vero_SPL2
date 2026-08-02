import { apiClient } from '../utils/apiClient';
import type { WorkPriority, WorkStatus } from './workService';

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  projectId: string;
  taskCount?: number;
}

export interface BoardTask {
  id: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  priority: WorkPriority;
  status: WorkStatus;
  labels: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardTask {
  title: string;
  description?: string;
  columnId: string;
  creatorId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: WorkPriority;
  labels?: string[];
}

export const boardService = {
  /** Creates the default columns if the project has never had a board. */
  async initialise(projectId: string): Promise<{ projectId: string; columns: BoardColumn[] }> {
    const { data } = await apiClient.post(`/board/init/${projectId}`);
    return data;
  },

  async columns(projectId: string): Promise<BoardColumn[]> {
    const { data } = await apiClient.get(`/board/columns/${projectId}`);
    return data;
  },

  async tasks(projectId: string): Promise<BoardTask[]> {
    const { data } = await apiClient.get(`/board/tasks/${projectId}`);
    return data;
  },

  async createTask(input: CreateBoardTask): Promise<BoardTask> {
    const { data } = await apiClient.post('/board/tasks', input);
    return data;
  },

  async updateTask(id: string, patch: Partial<CreateBoardTask> & { status?: WorkStatus }) {
    const { data } = await apiClient.patch(`/board/tasks/${id}`, patch);
    return data as BoardTask;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/board/tasks/${id}`);
  },

  async moveTask(id: string, columnId: string, order: number): Promise<BoardTask> {
    const { data } = await apiClient.patch(`/board/tasks/${id}/move`, { columnId, order });
    return data;
  },
};
