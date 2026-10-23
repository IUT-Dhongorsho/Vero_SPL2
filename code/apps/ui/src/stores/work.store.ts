import { create } from 'zustand';
import {
  workService,
  type CreatePersonalTask,
  type WorkItem,
  type WorkStats,
  type WorkStatus,
} from '../services/workService';

interface WorkState {
  projectTasks: WorkItem[];
  personalTasks: WorkItem[];
  stats: WorkStats | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  loadStats: () => Promise<void>;
  createPersonal: (input: CreatePersonalTask) => Promise<WorkItem | null>;
  updatePersonal: (id: string, patch: Partial<CreatePersonalTask> & { pinned?: boolean }) => Promise<void>;
  deletePersonal: (id: string) => Promise<void>;
  move: (id: string, status: WorkStatus) => Promise<void>;

  allItems: () => WorkItem[];
}

export const useWorkStore = create<WorkState>((set, get) => ({
  projectTasks: [],
  personalTasks: [],
  stats: null,
  loading: false,
  error: null,

  async load() {
    set({ loading: true, error: null });
    try {
      const { projectTasks, personalTasks } = await workService.myWork();
      set({ projectTasks, personalTasks });
    } catch (error: any) {
      set({ error: error?.response?.data?.error ?? 'Could not load your work' });
    } finally {
      set({ loading: false });
    }
  },

  async loadStats() {
    try {
      set({ stats: await workService.myStats() });
    } catch {
      /* the stat tiles fall back to zeroes */
    }
  },

  async createPersonal(input) {
    const created = await workService.createPersonal(input);
    set((state) => ({ personalTasks: [created, ...state.personalTasks] }));
    return created;
  },

  async updatePersonal(id, patch) {
    const updated = await workService.updatePersonal(id, patch);
    set((state) => ({
      personalTasks: state.personalTasks.map((task) => (task.id === id ? updated : task)),
    }));
  },

  async deletePersonal(id) {
    await workService.deletePersonal(id);
    set((state) => ({ personalTasks: state.personalTasks.filter((task) => task.id !== id) }));
  },

  /** Optimistic move; reverts to the server state if the request fails. */
  async move(id, status) {
    const { projectTasks, personalTasks } = get();
    const isPersonal = personalTasks.some((task) => task.id === id);

    set(
      isPersonal
        ? { personalTasks: personalTasks.map((t) => (t.id === id ? { ...t, status } : t)) }
        : { projectTasks: projectTasks.map((t) => (t.id === id ? { ...t, status } : t)) }
    );

    try {
      if (isPersonal) {
        await workService.updatePersonal(id, { status });
      } else {
        await workService.updateProjectTaskStatus(id, status);
      }
      get().loadStats();
    } catch {
      set(isPersonal ? { personalTasks } : { projectTasks });
      throw new Error('Could not move that task');
    }
  },

  allItems() {
    return [...get().projectTasks, ...get().personalTasks];
  },
}));
