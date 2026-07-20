import { create } from 'zustand';
import { taskService, Column, Task, CreateTaskData, UpdateTaskData, MoveTaskData } from '../services/taskService';

interface BoardState {
  columns: Column[];
  tasks: Task[];
  loading: boolean;
  initialized: boolean;
  fetchBoard: (projectId: string, projectInfo?: { name?: string; description?: string; ownerId?: string }) => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, data: MoveTaskData) => Promise<Task>;
  createColumn: (name: string, projectId: string) => Promise<Column>;
  updateColumn: (id: string, data: { name?: string; order?: number }) => Promise<Column>;
  deleteColumn: (id: string) => Promise<void>;
  reset: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  columns: [],
  tasks: [],
  loading: false,
  initialized: false,

  fetchBoard: async (projectId: string, projectInfo?: { name?: string; description?: string; ownerId?: string }) => {
    set({ loading: true });
    try {
      // Initialize board if needed (auto-creates project stub in board_db if missing)
      await taskService.initializeBoard(projectId, projectInfo);
      const [columns, tasks] = await Promise.all([
        taskService.getColumns(projectId),
        taskService.getTasks(projectId),
      ]);
      set({ columns, tasks, loading: false, initialized: true });
    } catch (e) {
      console.error('Failed to fetch board:', e);
      set({ loading: false });
    }
  },

  createTask: async (data: CreateTaskData) => {
    const task = await taskService.createTask(data);
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: async (id: string, data: UpdateTaskData) => {
    const updated = await taskService.updateTask(id, data);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  deleteTask: async (id: string) => {
    await taskService.deleteTask(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  moveTask: async (taskId: string, data: MoveTaskData) => {
    // Optimistic update
    const prevTasks = get().tasks;
    const movedTask = prevTasks.find((t) => t.id === taskId);
    if (movedTask) {
      const optimistic = prevTasks.map((t) =>
        t.id === taskId ? { ...t, columnId: data.columnId, order: data.order } : t
      );
      set({ tasks: optimistic });
    }

    try {
      const updated = await taskService.moveTask(taskId, data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
      }));
      return updated;
    } catch (e) {
      // Revert on failure
      set({ tasks: prevTasks });
      throw e;
    }
  },

  createColumn: async (name: string, projectId: string) => {
    const col = await taskService.createColumn(name, projectId);
    set((state) => ({
      columns: [...state.columns, col].sort((a, b) => a.order - b.order),
    }));
    return col;
  },

  updateColumn: async (id: string, data: { name?: string; order?: number }) => {
    const updated = await taskService.updateColumn(id, data);
    set((state) => ({
      columns: state.columns.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.order - b.order),
    }));
    return updated;
  },

  deleteColumn: async (id: string) => {
    await taskService.deleteColumn(id);
    set((state) => ({
      columns: state.columns.filter((c) => c.id !== id),
      tasks: state.tasks.filter((t) => t.columnId !== id),
    }));
  },

  reset: () => set({ columns: [], tasks: [], loading: false, initialized: false }),
}));
