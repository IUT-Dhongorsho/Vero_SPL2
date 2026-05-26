import React, { useState } from 'react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { toast } from '../../components/ui/Toast';
import { User, Mail, Github, Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ProfileTab: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('Jane Doe');
  const [email, setEmail] = useState('jane@example.com');
  const [github, setGithub] = useState('janedoe');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weekly: false,
  });

  const handleSave = () => {
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" /> Profile Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GitHub Handle</label>
            <input
              type="text"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Moon className="w-5 h-5" /> Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <AnimatedButton variant="outline" size="sm" onClick={toggleTheme}>
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </AnimatedButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" /> Notifications
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span>Email me when assigned to a task</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.push}
              onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span>Push notification when meeting starts</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.weekly}
              onChange={(e) => setNotifications({ ...notifications, weekly: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span>Weekly digest email</span>
          </label>
        </div>
      </GlassCard>

      <div className="flex justify-end">
        <AnimatedButton variant="primary" onClick={handleSave}>
          Save Changes
        </AnimatedButton>
      </div>
    </div>
  );
};
