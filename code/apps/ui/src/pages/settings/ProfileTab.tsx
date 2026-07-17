import React, { useState } from 'react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { toast } from '../../components/Providers/ToastProvider';
import { User, Mail, Github, Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from '../../components/Providers/ThemeProvider';

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
      <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profile Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">GitHub Handle</label>
            <input
              type="text"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Moon className="w-5 h-5 text-primary" /> Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-medium text-foreground">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</p>
              <p className="text-sm text-muted-foreground">Adjust how the app looks on your device.</p>
            </div>
          </div>
          <AnimatedButton variant="outline" onClick={toggleTheme}>
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </AnimatedButton>
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notifications
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
            />
            <span className="text-foreground font-medium group-hover:text-primary transition-colors">Email me when assigned to a task</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={notifications.push}
              onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
            />
            <span className="text-foreground font-medium group-hover:text-primary transition-colors">Push notification when meeting starts</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={notifications.weekly}
              onChange={(e) => setNotifications({ ...notifications, weekly: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
            />
            <span className="text-foreground font-medium group-hover:text-primary transition-colors">Weekly digest email</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <AnimatedButton variant="primary" onClick={handleSave}>
          Save Changes
        </AnimatedButton>
      </div>
    </div>
  );
};
