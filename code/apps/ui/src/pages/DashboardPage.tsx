import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/Layout/PageContainer';
import { LayoutDashboard, CheckSquare, Clock, ArrowRight, FileText, Zap, FolderOpen, MoreHorizontal, Activity } from 'lucide-react';
import { useBoardStore } from '../stores/board.store';
import { useMeetStore } from '../stores/meet.store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { AnimatedButton } from '../components/ui/AnimatedButton';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, fetchTasks, loading: tasksLoading } = useBoardStore();
  const { todayMeetings, fetchTodayMeetings } = useMeetStore();

  useEffect(() => {
    fetchTasks('3'); // Default mock workspace
    fetchTodayMeetings();
  }, [fetchTasks, fetchTodayMeetings]);

  const dueTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  const chartData = [
    { name: 'To Do', count: tasks.filter(t => t.status === 'todo').length },
    { name: 'In Progress', count: tasks.filter(t => t.status === 'progress').length },
    { name: 'Done', count: tasks.filter(t => t.status === 'done').length },
  ];

  // Project Velocity mock data
  const velocityData = [
    { name: 'Global Rebrand', progress: 85, color: 'var(--foreground)' },
    { name: 'Backend API', progress: 45, color: 'var(--muted-foreground)' },
    { name: 'SPL-II Dev', progress: 62, color: 'var(--border)' },
    { name: 'User Research', progress: 15, color: 'var(--ring)' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.1 } }
  };
  
  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <PageContainer title="Dashboard">
      <motion.div initial="initial" animate="animate" variants={stagger} className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {getGreeting()}, Jane.
            </h1>
            <p className="text-muted-foreground text-lg">
              Here is your command center for today.
            </p>
          </div>
        </motion.div>

        {/* Pick up where you left off (Recents) */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-primary" /> Pick up where you left off
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Q3 Marketing Roadmap', type: 'Notes', project: 'Global Rebrand', icon: FileText, color: 'text-foreground' },
              { title: 'Authentication Module', type: 'Board', project: 'Backend API', icon: LayoutDashboard, color: 'text-foreground' },
              { title: 'Weekly Sync', type: 'Meet', project: 'SPL-II Dev', icon: FolderOpen, color: 'text-foreground' }
            ].map((item, i) => (
              <div key={i} className="group bg-card hover:bg-muted/50 border border-border rounded-2xl p-5 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-xl bg-muted ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.project} • {item.type}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Due Tasks & Action Inbox */}
          <motion.div variants={fadeUp} className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-foreground" /> Action Inbox
                </h3>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">{dueTasks.length} Due</span>
              </div>
              
              {tasksLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : dueTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">All caught up! No pending actions.</div>
              ) : (
                <div className="space-y-4">
                  {dueTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="group relative pl-4 border-l-2 border-transparent hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/tasks')}>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className={`font-semibold ${
                          task.priority === 'high' ? 'text-red-500' :
                          task.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span>{task.projectName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Project Velocity */}
          <motion.div variants={fadeUp} className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full">
               <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-foreground" /> Project Pulse
                </h3>
              </div>
              <div className="space-y-6">
                {velocityData.map((project, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-foreground">{project.name}</span>
                      <span className="text-muted-foreground">{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Task Overview Chart */}
          <motion.div variants={fadeUp} className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-foreground" /> Task Overview
                </h3>
              </div>
              
              <div className="flex-1 min-h-[200px] w-full">
                {tasksLoading ? (
                   <div className="flex justify-center h-full items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: 'var(--color-secondary)' }} 
                        contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)' }} 
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--muted-foreground)' : index === 1 ? 'var(--border)' : 'var(--foreground)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </PageContainer>
  );
};
