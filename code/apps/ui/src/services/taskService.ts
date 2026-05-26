import { mockTasks, Task } from '../data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface CreateTaskData {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  status: 'todo' | 'progress' | 'done';
  workspaceId: string;
}

export const taskService = {
  async getTasks(workspaceId: string): Promise<Task[]> {
    await delay(500);
    return mockTasks.filter(t => t.workspaceId === workspaceId);
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    await delay(800);
    const newTask: Task = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      assigneeId: 'user1',
      assigneeName: data.assignee,
      projectId: '3',
      projectName: 'SPL-II Development',
      workspaceId: data.workspaceId,
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    console.log('Created task:', newTask);
    return newTask;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    await delay(500);
    console.log('Updated task:', id, updates);
    return { ...mockTasks[0], ...updates, id };
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
