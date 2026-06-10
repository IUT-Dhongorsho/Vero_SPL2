import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { mockTasks, Task } from '../data/mockData';
import { getDaysInMonth, getFirstDayOfMonth, isToday, formatDate } from '../utils/dateUtils';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar', active: true },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const getTasksForDate = (date: Date): Task[] => {
    return mockTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear();
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedTasks(getTasksForDate(date));
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(year, month + delta, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
    setSelectedTasks([]);
  };

  const goToToday = () => {
    setCurrentDate(today);
    setSelectedDate(today);
    setSelectedTasks(getTasksForDate(today));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const blanks = Array(firstDay).fill(null);
  const daysArray = Array(daysInMonth).fill(null).map((_, i) => i + 1);

  return (
    <PageContainer title="Calendar" sidebarItems={sidebarItems} topBarActions={<ThemeToggle />}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <AnimatedButton variant="ghost" size="sm" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></AnimatedButton>
            <h2 className="text-2xl font-bold">{currentDate.toLocaleString('default', { month: 'long' })} {year}</h2>
            <AnimatedButton variant="ghost" size="sm" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></AnimatedButton>
          </div>
          <AnimatedButton variant="outline" size="sm" onClick={goToToday}>Today</AnimatedButton>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {days.map(day => <div key={day} className="text-center font-semibold text-gray-500 py-2">{day}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {blanks.map((_, index) => <div key={`blank-${index}`} className="h-28 glass rounded-lg" />)}
          {daysArray.map(day => {
            const date = new Date(year, month, day);
            const tasks = getTasksForDate(date);
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const isCurrentToday = isToday(date);
            return (
              <motion.div
                key={day}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDateClick(date)}
                className={`h-28 glass rounded-lg p-2 cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isCurrentToday ? 'border-2 border-blue-500' : ''}`}
              >
                <div className={`text-sm font-semibold mb-1 ${isCurrentToday ? 'text-blue-500' : ''}`}>{day}</div>
                {tasks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tasks.slice(0, 2).map(task => (
                      <div key={task.id} className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    ))}
                    {tasks.length > 2 && <span className="text-xs text-gray-500">+{tasks.length - 2}</span>}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedDate && selectedTasks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mt-6">
              <GlassCard className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Tasks for {formatDate(selectedDate)}</h3>
                  <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  {selectedTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 glass rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>{task.priority.toUpperCase()}</span>
                          <span className="text-sm font-medium">{task.title}</span>
                        </div>
                        <p className="text-xs text-gray-500">{task.projectName}</p>
                      </div>
                      <span className="text-xs text-gray-500">👤 {task.assigneeName}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedDate && selectedTasks.length === 0 && (
          <GlassCard className="mt-6 p-8 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No tasks scheduled for {formatDate(selectedDate)}</p>
          </GlassCard>
        )}
      </div>
    </PageContainer>
  );
};
