import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Plus, Video, Users, MoreVertical, CheckCircle, Circle, 
  LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files, 
  GripVertical, Trash2, Edit2, X 
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
import { toast } from '../components/ui/Toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
}

interface Column {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  tasks: Task[];
}

// Sortable Task Card Component
const SortableTaskCard: React.FC<{ 
  task: Task; 
  onToggleStatus: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}> = ({ task, onToggleStatus, onDelete, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 -ml-1"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit?.(task)}
                  className="p-1 rounded hover:bg-white/20 transition-colors"
                >
                  <Edit2 className="w-3 h-3 text-gray-500" />
                </button>
                <button
                  onClick={() => onDelete?.(task.id)}
                  className="p-1 rounded hover:bg-white/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-500">👤 {task.assignee}</span>
              <button
                onClick={() => onToggleStatus(task.id)}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
              >
                {task.status === 'todo' ? 'Start' : task.status === 'progress' ? 'Complete' : 'Reopen'}
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Column Component
const Column: React.FC<{
  column: Column;
  onToggleStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddTask: (columnId: string) => void;
}> = ({ column, onToggleStatus, onDeleteTask, onEditTask, onAddTask }) => {
  return (
    <div className="bg-gray-100/50 dark:bg-gray-900/50 rounded-xl p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {column.icon} {column.title} ({column.tasks.length})
        </h3>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1 rounded hover:bg-white/20 transition-colors"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <SortableContext
        items={column.tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 flex-1 min-h-[200px]">
          {column.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
            />
          ))}
          {column.tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              Drop cards here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// Task Edit Modal
const TaskEditModal: React.FC<{
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}> = ({ task, isOpen, onClose, onSave }) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);

  React.useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
    }
  }, [task]);

  if (!isOpen || !editedTask) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass rounded-2xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Edit Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={editedTask.priority}
              onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as 'high' | 'medium' | 'low' })}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assignee</label>
            <input
              type="text"
              value={editedTask.assignee}
              onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <AnimatedButton variant="outline" fullWidth onClick={onClose}>
              Cancel
            </AnimatedButton>
            <AnimatedButton variant="primary" fullWidth onClick={() => onSave(editedTask)}>
              Save Changes
            </AnimatedButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const WorkspacePage: React.FC = () => {
  const { projectId, workspaceId } = useParams();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Finalize Q3 Marketing Assets', description: 'Review and approve all banner ads', status: 'todo', priority: 'high', assignee: 'Jane' },
    { id: '2', title: 'Product Requirements v2.0', description: 'Update PRD with new features', status: 'todo', priority: 'medium', assignee: 'John' },
    { id: '3', title: 'Live Sync Implementation', description: 'Real-time sync for editing', status: 'progress', priority: 'high', assignee: 'Sarah' },
    { id: '4', title: 'User Authentication API', description: 'Implement backend auth', status: 'progress', priority: 'high', assignee: 'Mike' },
    { id: '5', title: 'Write Documentation', description: 'API documentation for developers', status: 'done', priority: 'low', assignee: 'Jane' },
  ]);

  const getColumnTasks = (status: string) => tasks.filter(t => t.status === status);
  
  const columns: Column[] = [
    { 
      id: 'todo', 
      title: 'To Do', 
      icon: <Circle className="w-4 h-4" />, 
      color: 'text-gray-500',
      tasks: getColumnTasks('todo')
    },
    { 
      id: 'progress', 
      title: 'In Progress', 
      icon: <div className="w-4 h-4 rounded-full border-2 border-yellow-500" />, 
      color: 'text-yellow-500',
      tasks: getColumnTasks('progress')
    },
    { 
      id: 'done', 
      title: 'Done', 
      icon: <CheckCircle className="w-4 h-4 text-green-500" />, 
      color: 'text-green-500',
      tasks: getColumnTasks('done')
    },
  ];

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Find which column the task was dropped into
    let newStatus: 'todo' | 'progress' | 'done' | null = null;
    
    if (over.id === 'todo' || over.id === 'progress' || over.id === 'done') {
      newStatus = over.id as 'todo' | 'progress' | 'done';
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && activeTask.status !== newStatus) {
      setTasks(prev =>
        prev.map(task =>
          task.id === active.id ? { ...task, status: newStatus! } : task
        )
      );
      toast.success(`Task moved to ${columns.find(c => c.id === newStatus)?.title}`);
    }
  };

  const handleToggleStatus = (taskId: string) => {
    setTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          let newStatus: 'todo' | 'progress' | 'done';
          if (task.status === 'todo') newStatus = 'progress';
          else if (task.status === 'progress') newStatus = 'done';
          else newStatus = 'todo';
          return { ...task, status: newStatus };
        }
        return task;
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    toast.success('Task deleted');
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
    setEditingTask(null);
    toast.success('Task updated');
  };

  const handleAddTask = (columnId: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: 'New Task',
      description: 'Click to edit this task',
      status: columnId as 'todo' | 'progress' | 'done',
      priority: 'medium',
      assignee: 'Unassigned',
    };
    setTasks(prev => [...prev, newTask]);
    setEditingTask(newTask);
    toast.success('New task created');
  };

  const getDragOverlayTask = () => {
    if (!activeId) return null;
    return tasks.find(t => t.id === activeId);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const dragOverlayTask = getDragOverlayTask();

  return (
    <>
      <PageContainer
        title="Frontend Development"
        sidebarItems={sidebarItems}
        topBarActions={
          <div className="flex gap-3 items-center">
            <AnimatedButton variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </AnimatedButton>
            <AnimatedButton variant="primary" size="sm" onClick={() => navigate(`/project/${projectId}/workspace/${workspaceId}/meet`)}>
              <Video className="w-4 h-4 mr-1" />
              Start Meet
            </AnimatedButton>
            <AnimatedButton variant="outline" size="sm">
              <Users className="w-4 h-4 mr-1" />
              Invite
            </AnimatedButton>
            <ThemeToggle />
          </div>
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 mb-8 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Frontend Development</h1>
              <p className="text-gray-600 dark:text-gray-400">Build React components and pages for Vero platform</p>
            </div>
            <div className="flex gap-2">
              <AnimatedButton variant="primary" size="sm" onClick={() => navigate(`/project/${projectId}/workspace/${workspaceId}/meet`)}>
                <Video className="w-4 h-4 mr-1" /> Start Meet
              </AnimatedButton>
              <AnimatedButton variant="outline" size="sm"><Users className="w-4 h-4 mr-1" /> Invite</AnimatedButton>
            </div>
          </div>
        </motion.div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <SortableContext
                key={column.id}
                items={column.tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Column
                  column={column}
                  onToggleStatus={handleToggleStatus}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleEditTask}
                  onAddTask={handleAddTask}
                />
              </SortableContext>
            ))}
          </div>

          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.4',
                  },
                },
              }),
            }}
          >
            {dragOverlayTask && (
              <GlassCard className="p-4 w-80 opacity-90">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(dragOverlayTask.priority)}`}>
                        {dragOverlayTask.priority.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{dragOverlayTask.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{dragOverlayTask.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-500">👤 {dragOverlayTask.assignee}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </DragOverlay>
        </DndContext>
      </PageContainer>

      <TaskEditModal
        task={editingTask}
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
      />
    </>
  );
};
