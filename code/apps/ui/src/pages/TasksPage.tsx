import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { EmptyState } from '../components/ui/EmptyState';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { mockTasks, Task } from '../data/mockData';
import { groupTasksByDueDate, formatDate } from '../utils/dateUtils';

export const TasksPage: React.FC = () => {
  const { projectId, moduleId } = useParams<{ projectId?: string; moduleId?: string }>();

  // If accessed from a module route, render the Kanban board
  if (projectId && moduleId) {
    return (
      <PageContainer title="Kanban Board">
        <div className="max-w-full mx-auto">
          <KanbanBoard />
        </div>
      </PageContainer>
    );
  }

  // Top-level personal task list view
  return <PersonalTaskList />;
};

const PersonalTaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showFilter, setShowFilter] = useState(false);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.priority === filter;
  });

  const groups = groupTasksByDueDate(filteredTasks);
  const hasTasks = filteredTasks.length > 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
        : task
    ));
  };

  const TaskItem = ({ task }: { task: Task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ scale: 1.01 }}
    >
      <GlassCard className="p-4 mb-3">
        <div className="flex items-start gap-3">
          <button onClick={() => toggleTaskStatus(task.id)} className="mt-0.5">
            {task.status === 'done' ? (
              <CheckCircle2 className="w-5 h-5 text-foreground" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            )}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className={`font-semibold text-gray-900 dark:text-white ${task.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                {task.title}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-1">{task.projectName}</span>
              <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Due: {formatDate(new Date(task.dueDate))}</span>
              <span>{task.assigneeName}</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );

  return (
    <PageContainer
      title="My Tasks"
      topBarActions={
        <div className="flex gap-3 items-center">
          <div className="relative">
            <AnimatedButton variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)}>
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </AnimatedButton>
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-36 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10"
                >
                  {['all', 'high', 'medium', 'low'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        setFilter(priority as any);
                        setShowFilter(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${filter === priority ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                    >
                      {priority === 'all' ? 'All Tasks' : `${priority.toUpperCase()} Priority`}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ThemeToggle />
        </div>
      }
    >
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Tasks</h2>
          <p className="text-gray-600 dark:text-gray-400">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>

        {!hasTasks ? (
          <EmptyState type="tasks" />
        ) : (
          <>
            {groups.today.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-foreground">Due Today</span> ({groups.today.length})
                </h3>
                {groups.today.map((task: Task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}

            {groups.tomorrow.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-foreground">Due Tomorrow</span> ({groups.tomorrow.length})
                </h3>
                {groups.tomorrow.map((task: Task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}

            {groups.thisWeek.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-foreground">This Week</span> ({groups.thisWeek.length})
                </h3>
                {groups.thisWeek.map((task: Task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}

            {groups.later.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-muted-foreground">Later</span> ({groups.later.length})
                </h3>
                {groups.later.map((task: Task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};
