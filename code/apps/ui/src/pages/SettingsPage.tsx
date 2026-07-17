import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building2, Users, CreditCard, AlertTriangle, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ProfileTab } from './settings/ProfileTab';
import { WorkspaceTab } from './settings/WorkspaceTab';
import { MembersTab } from './settings/MembersTab';
import { BillingTab } from './settings/BillingTab';
import { DangerZoneTab } from './settings/DangerZoneTab';
import { toast } from '../components/Providers/ToastProvider';

type Tab = 'profile' | 'workspace' | 'members' | 'billing' | 'danger';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'workspace', label: 'Workspace', icon: <Building2 className="w-4 h-4" /> },
  { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> },
];

const tabComponents = {
  profile: ProfileTab,
  workspace: WorkspaceTab,
  members: MembersTab,
  billing: BillingTab,
  danger: DangerZoneTab,
};

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const ActiveComponent = tabComponents[activeTab];

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
  ];

  return (
    <PageContainer title="Settings" sidebarItems={sidebarItems} topBarActions={<ThemeToggle />}>
      <ToastProvider />
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-1 glass rounded-lg p-1 mb-8">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </PageContainer>
  );
};
