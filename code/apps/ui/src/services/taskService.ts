import { apiClient } from '../utils/apiClient';

export interface Column {
  id: string;
  name: string;
  order: number;
  projectId: string;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  columnId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  labels?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string | null;
  dueDate?: string | null;
  labels?: string[];
}

export interface MoveTaskData {
  columnId: string;
  order: number;
}

const parseLabels = (labels: any): string[] => {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === 'string' && labels.length > 0) return labels.split(',').map((l: string) => l.trim()).filter(Boolean);
  return [];
};

export const taskService = {
  async getColumns(projectId: string): Promise<Column[]> {
    const { data } = await apiClient.get(`/board/columns/${projectId}`);
    return data;
  },

  async getTasks(projectId: string): Promise<Task[]> {
    const { data } = await apiClient.get(`/board/tasks/${projectId}`);
    return data.map((t: any) => ({ ...t, labels: parseLabels(t.labels) }));
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    const { data: task } = await apiClient.post('/board/tasks', data);
    return { ...task, labels: parseLabels(task.labels) };
  },

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const { data: task } = await apiClient.patch(`/board/tasks/${id}`, data);
    return { ...task, labels: parseLabels(task.labels) };
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/board/tasks/${id}`);
  },

  async moveTask(id: string, data: MoveTaskData): Promise<Task> {
    const { data: task } = await apiClient.patch(`/board/tasks/${id}/move`, data);
    return { ...task, labels: parseLabels(task.labels) };
  },

  async createColumn(name: string, projectId: string): Promise<Column> {
    const { data: col } = await apiClient.post('/board/columns', { name, projectId });
    return col;
  },

  async updateColumn(id: string, data: { name?: string; order?: number }): Promise<Column> {
    const { data: col } = await apiClient.patch(`/board/columns/${id}`, data);
    return col;
  },

  async deleteColumn(id: string): Promise<void> {
    await apiClient.delete(`/board/columns/${id}`);
  },

  async initializeBoard(projectId: string, projectInfo?: { name?: string; description?: string; ownerId?: string }): Promise<{ projectId: string; columns: Column[] }> {
    const { data } = await apiClient.post(`/board/init/${projectId}`, projectInfo || {});
    return data;
  },
};
