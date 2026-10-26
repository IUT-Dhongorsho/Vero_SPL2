export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done';

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  projectId: string;
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
  priority: TaskPriority;
  status: TaskStatus;
  labels: string;
  createdAt: string;
  updatedAt: string;
}
