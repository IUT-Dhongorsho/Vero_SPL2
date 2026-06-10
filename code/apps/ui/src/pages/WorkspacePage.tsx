import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Plus, Video, Users, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files, 
  GripVertical, Trash2, Edit2, X, Circle, CheckCircle 
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { InviteMemberModal } from '../components/modals/InviteMemberModal';
import { taskService, Task } from '../services/taskService';
import { toast } from '../components/ui/Toast';

const SortableTaskCard: React.FC<{ 
  task: Task; 
  onToggleStatus: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}> = ({ task, onToggleStatus, onDelete, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <GlassCard className="p-4 group">
        <div className="flex items-start gap-2">
          <div {...listeners} className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 -ml-1">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-white/20">
                  <Edit2 className="w-3 h-3 text-gray-500" />
                </button>
                <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-white/20">
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-500">👤 {task.assignee}</span>
              <button onClick={() => onToggleStatus(task.id)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700">
                {task.status === 'todo' ? 'Start' : task.status === 'progress' ? 'Complete' : 'Reopen'}
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

const TaskEditModal: React.FC<{
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}> = ({ task, isOpen, onClose, onSave }) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  useEffect(() => { if (task) setEditedTask({ ...task }); }, [task]);
  if (!isOpen || !editedTask) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Edit Task</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" value={editedTask.title} onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })} className="w-full px-4 py-2 glass rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={editedTask.description} onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })} rows={3} className="w-full px-4 py-2 glass rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Priority</label><select value={editedTask.priority} onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })} className="w-full px-4 py-2 glass rounded-lg"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Assignee</label><input type="text" value={editedTask.assignee} onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })} className="w-full px-4 py-2 glass rounded-lg" /></div>
          <div className="flex gap-3 pt-4"><AnimatedButton variant="outline" fullWidth onClick={onClose}>Cancel</AnimatedButton><AnimatedButton variant="primary" fullWidth onClick={() => onSave(editedTask)}>Save</AnimatedButton></div>
        </div>
      </motion.div>
    </div>
  );
};

export const WorkspacePage: React.FC = () => {
  const { projectId, workspaceId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const fetchTasks = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await taskService.getTasks(workspaceId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [workspaceId]);

  const getColumnTasks = (status: string) => tasks.filter(t => t.status === status);
  const columns = [
    { id: 'todo', title: 'To Do', icon: <Circle className="w-4 h-4" />, tasks: getColumnTasks('todo') },
    { id: 'progress', title: 'In Progress', icon: <div className="w-4 h-4 rounded-full border-2 border-yellow-500" />, tasks: getColumnTasks('progress') },
    { id: 'done', title: 'Done', icon: <CheckCircle className="w-4 h-4 text-green-500" />, tasks: getColumnTasks('done') },
  ];

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
  ];

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;
    let newStatus: 'todo' | 'progress' | 'done' | null = null;
    if (over.id === 'todo' || over.id === 'progress' || over.id === 'done') newStatus = over.id as any;
    else { const overTask = tasks.find(t => t.id === over.id); if (overTask) newStatus = overTask.status; }
    if (newStatus && activeTask.status !== newStatus) {
      setTasks(prev => prev.map(task => task.id === active.id ? { ...task, status: newStatus! } : task));
      await taskService.moveTask(active.id as string, newStatus);
      toast.success(`Task moved to ${columns.find(c => c.id === newStatus)?.title}`);
    }
  };

  const handleToggleStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    let newStatus: 'todo' | 'progress' | 'done';
    if (task.status === 'todo') newStatus = 'progress';
    else if (task.status === 'progress') newStatus = 'done';
    else newStatus = 'todo';
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await taskService.moveTask(taskId, newStatus);
  };

  const handleDeleteTask = async (taskId: string) => {
    await taskService.deleteTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success('Task deleted');
  };

  const handleEditTask = (task: Task) => setEditingTask(task);
  const handleSaveTask = async (updatedTask: Task) => {
    await taskService.updateTask(updatedTask.id, updatedTask);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
    toast.success('Task updated');
  };

  const handleAddTask = async () => {
    const newTask = await taskService.createTask({
      title: 'New Task',
      description: 'Click to edit this task',
      priority: 'medium',
      assignee: 'Unassigned',
      status: 'todo',
      workspaceId: workspaceId || '',
    });
    setTasks(prev => [...prev, newTask]);
    setEditingTask(newTask);
    toast.success('New task created');
  };

  const getDragOverlayTask = () => tasks.find(t => t.id === activeId);
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  const dragOverlayTask = getDragOverlayTask();

  if (loading) {
    return (
      <PageContainer title="Frontend Development" sidebarItems={sidebarItems}>
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        title="Frontend Development"
        sidebarItems={sidebarItems}
        topBarActions={
          <div className="flex gap-3 items-center">
            <AnimatedButton variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}`)}><ArrowLeft className="w-4 h-4 mr-1" />Back</AnimatedButton>
            <AnimatedButton variant="primary" size="sm" onClick={() => navigate(`/project/${projectId}/workspace/${workspaceId}/meet`)}><Video className="w-4 h-4 mr-1" />Start Meet</AnimatedButton>
            <AnimatedButton variant="outline" size="sm" onClick={() => setIsInviteModalOpen(true)}><Users className="w-4 h-4 mr-1" />Invite</AnimatedButton>
            <AnimatedButton variant="outline" size="sm" onClick={handleAddTask}><Plus className="w-4 h-4 mr-1" />Add Card</AnimatedButton>
            <ThemeToggle />
          </div>
        }
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 mb-8 border border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Frontend Development</h1><p className="text-gray-600 dark:text-gray-400">Build React components and pages for Vero platform</p></div>
            <div className="flex gap-2"><AnimatedButton variant="primary" size="sm" onClick={() => navigate(`/project/${projectId}/workspace/${workspaceId}/meet`)}><Video className="w-4 h-4 mr-1" />Start Meet</AnimatedButton><AnimatedButton variant="outline" size="sm" onClick={() => setIsInviteModalOpen(true)}><Users className="w-4 h-4 mr-1" />Invite</AnimatedButton></div>
          </div>
        </motion.div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="grid md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <SortableContext key={column.id} items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">{column.icon} {column.title} ({column.tasks.length})</h3>
                  <div className="space-y-3">
                    {column.tasks.map((task) => (
                      <SortableTaskCard key={task.id} task={task} onToggleStatus={handleToggleStatus} onDelete={handleDeleteTask} onEdit={handleEditTask} />
                    ))}
                    {column.tasks.length === 0 && <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">Drop cards here</div>}
                  </div>
                </div>
              </SortableContext>
            ))}
          </div>
          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
            {dragOverlayTask && (
              <GlassCard className="p-4 w-80">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2"><span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(dragOverlayTask.priority)}`}>{dragOverlayTask.priority.toUpperCase()}</span></div>
                    <h4 className="font-semibold mb-1">{dragOverlayTask.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{dragOverlayTask.description}</p>
                    <div><span className="text-sm text-gray-500">👤 {dragOverlayTask.assignee}</span></div>
                  </div>
                </div>
              </GlassCard>
            )}
          </DragOverlay>
        </DndContext>
      </PageContainer>

      <TaskEditModal task={editingTask} isOpen={editingTask !== null} onClose={() => setEditingTask(null)} onSave={handleSaveTask} />
      <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onSuccess={() => {}} />
    </>
  );
};
