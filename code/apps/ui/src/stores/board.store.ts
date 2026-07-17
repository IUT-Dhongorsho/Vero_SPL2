import { create } from 'zustand';
import { taskService, Task } from '../services/taskService';

interface BoardState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (workspaceId: string) => Promise<void>;
  moveTask: (taskId: string, status: 'todo' | 'progress' | 'done') => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  loading: false,
  fetchTasks: async (workspaceId: string) => {
    set({ loading: true });
    try {
      const tasks = await taskService.getTasks(workspaceId);
      set({ tasks, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
  moveTask: async (taskId, status) => {
    const { tasks } = get();
    set({ tasks: tasks.map(t => t.id === taskId ? { ...t, status } : t) });
    await taskService.moveTask(taskId, status);
  }
}));
