import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { EmptyState } from '../components/ui/EmptyState';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { mockTasks, Task } from '../data/mockData';
import { groupTasksByDueDate, formatDate } from '../utils/dateUtils';

export const TasksPage: React.FC = () => {
  const { projectId, moduleId } = useParams<{ projectId?: string; moduleId?: string }>();

  if (projectId && moduleId) {
    return (
      <PageContainer title="Kanban Board">
        <div className="max-w-full mx-auto">
          <KanbanBoard />
        </div>
      </PageContainer>
    );
  }

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
      default: return 'bg-muted text-muted-foreground';
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
      <div className="bg-card border border-border rounded-xl p-5 mb-3 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start gap-4">
          <button onClick={() => toggleTaskStatus(task.id)} className="mt-0.5">
            {task.status === 'done' ? (
              <CheckCircle2 className="w-5 h-5 text-foreground" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            )}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h4 className={`font-semibold text-base text-foreground ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h4>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2.5">{task.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">{task.projectName}</span>
              <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Due: {formatDate(new Date(task.dueDate))}</span>
              <span>{task.assigneeName}</span>
            </div>
          </div>
        </div>
      </div>
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
                  className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10"
                >
                  {['all', 'high', 'medium', 'low'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        setFilter(priority as any);
                        setShowFilter(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${filter === priority ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Your Tasks</h2>
          <p className="text-muted-foreground">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>

        {!hasTasks ? (
          <EmptyState type="tasks" />
        ) : (
          <>
            {groups.today.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span>Due Today</span> ({groups.today.length})
                </h3>
                {groups.today.map((task: Task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}

            {groups.tomorrow.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span>Due Tomorrow</span> ({groups.tomorrow.length})
                </h3>
                {groups.tomorrow.map((task: Task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}

            {groups.thisWeek.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span>This Week</span> ({groups.thisWeek.length})
                </h3>
                {groups.thisWeek.map((task: Task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}

            {groups.later.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
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
