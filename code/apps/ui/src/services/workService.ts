import { apiClient } from '../utils/apiClient';

export type WorkStatus = 'backlog' | 'in_progress' | 'in_review' | 'done';
export type WorkPriority = 'low' | 'medium' | 'high' | 'urgent';

/** A row on the Progress board — either a project task or a personal one. */
export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  status: WorkStatus;
  priority: WorkPriority;
  dueDate: string | null;
  labels: string[];
  order: number;
  source: 'project' | 'personal';
  createdAt: string;
  updatedAt: string;
  // Project tasks only
  projectId?: string;
  projectName?: string;
  columnId?: string;
  columnName?: string;
  assigneeId?: string | null;
  // Personal tasks only
  pinned?: boolean;
  completedAt?: string | null;
}

export interface WorkStats {
  assignedTotal: number;
  assignedDone: number;
  assignedInProgress: number;
  assignedOverdue: number;
  createdTotal: number;
  boardsInvolved: number;
  personalTotal: number;
  personalDone: number;
}

export interface CreatePersonalTask {
  title: string;
  description?: string;
  status?: WorkStatus;
  priority?: WorkPriority;
  dueDate?: string | null;
  labels?: string[];
}

export const workService = {
  /** Assigned project tasks and personal tasks in one call. */
  async myWork(): Promise<{ projectTasks: WorkItem[]; personalTasks: WorkItem[] }> {
    const { data } = await apiClient.get('/board/my/work');
    return data;
  },

  async myStats(): Promise<WorkStats> {
    const { data } = await apiClient.get('/board/my/stats');
    return data;
  },

  async listPersonal(): Promise<WorkItem[]> {
    const { data } = await apiClient.get('/board/personal-tasks');
    return data;
  },

  async createPersonal(input: CreatePersonalTask): Promise<WorkItem> {
    const { data } = await apiClient.post('/board/personal-tasks', input);
    return data;
  },

  async updatePersonal(id: string, patch: Partial<CreatePersonalTask> & { pinned?: boolean; order?: number }) {
    const { data } = await apiClient.patch(`/board/personal-tasks/${id}`, patch);
    return data as WorkItem;
  },

  async deletePersonal(id: string): Promise<void> {
    await apiClient.delete(`/board/personal-tasks/${id}`);
  },

  async reorderPersonal(items: { id: string; status: WorkStatus; order: number }[]): Promise<WorkItem[]> {
    const { data } = await apiClient.patch('/board/personal-tasks/reorder', { items });
    return data;
  },

  /** Moves a project task by patching its status — the board column follows. */
  async updateProjectTaskStatus(id: string, status: WorkStatus): Promise<WorkItem> {
    const { data } = await apiClient.patch(`/board/tasks/${id}`, { status });
    return data;
  },
};

export const WORK_COLUMNS: { id: WorkStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
];
