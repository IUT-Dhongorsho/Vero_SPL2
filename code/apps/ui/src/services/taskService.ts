import { mockTasks } from '../data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface CreateTaskData {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  status: 'todo' | 'progress' | 'done';
  workspaceId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  assigneeId: string;
  workspaceId: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  createdAt: string;
}

export const taskService = {
  async getTasks(workspaceId: string): Promise<Task[]> {
    await delay(500);
    return mockTasks.filter(t => t.workspaceId === workspaceId).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status === 'in-progress' ? 'progress' : t.status as 'todo' | 'progress' | 'done',
      priority: t.priority,
      assignee: t.assigneeName,
      assigneeId: t.assigneeId,
      workspaceId: t.workspaceId,
      projectId: t.projectId,
      projectName: t.projectName,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
    }));
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    await delay(800);
    const newTask: Task = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      assignee: data.assignee,
      assigneeId: 'user1',
      workspaceId: data.workspaceId,
      projectId: '3',
      projectName: 'SPL-II Development',
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    console.log('Created task:', newTask);
    return newTask;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    await delay(500);
    console.log('Updated task:', id, updates);
    return { ...mockTasks[0] as any, ...updates, id };
  },

  async deleteTask(id: string): Promise<void> {
    await delay(500);
    console.log('Deleted task:', id);
  },

  async moveTask(id: string, newStatus: 'todo' | 'progress' | 'done'): Promise<void> {
    await delay(300);
    console.log('Moved task:', id, 'to', newStatus);
  },
};
