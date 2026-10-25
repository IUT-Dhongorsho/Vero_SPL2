import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, FolderKanban, MessageSquare, Settings2, UserPlus, Video, type LucideIcon } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Field, inputClass } from '../components/ui/Field';
import { ModuleStatusBadge, MODULE_STATUS } from '../components/project/ModuleStatusBadge';
import { ModuleMembersDialog } from '../components/project/ModuleMembersDialog';
import { toast } from '../components/Providers/ToastProvider';
import { useMeetStatus } from '../hooks/useMeetStatus';
import { moduleCrumbs } from '../lib/routes';
import { moduleService, type ModuleStatus } from '../services/moduleService';
import { useModule } from '../hooks/useModule';
import { useAuthStore } from '../stores/auth.store';
import { errorMessage } from '../utils/errors';
import { cn } from '../utils/cn';

interface Tool {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  route: string;
  isLive?: boolean;
  liveCount?: number;
}

export const ModuleHubPage: React.FC = () => {
  const { projectId, moduleId } = useParams();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const { module, missing, reload } = useModule(moduleId);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const { isLive: isMeetLive, liveCount } = useMeetStatus(moduleId);

  const isAdmin = module?.userRole === 'admin';
  const base = `/project/${projectId}/module/${moduleId}`;

  const tools: Tool[] = [
    { id: 'board', name: 'Board', icon: FolderKanban, description: 'Tasks for this module, from backlog to done', route: `${base}/board` },
    { id: 'notes', name: 'Notes', icon: FileText, description: 'Specs and documents, edited together live', route: `${base}/notes` },
    {
      id: 'chat',
      name: 'Chat',
      icon: MessageSquare,
      description: module?.isMember ? 'The conversation for everyone on this module' : 'Join the module to take part',
      route: `${base}/chat`,
    },
    {
      id: 'meet',
      name: 'Meet',
      icon: Video,
      description: isMeetLive
        ? `Meeting in progress with ${liveCount} participant${liveCount !== 1 ? 's' : ''} — Click to join`
        : 'Sync with the module team',
      route: `${base}/meet`,
      isLive: isMeetLive,
      liveCount,
    },
  ];

  const join = async () => {
    if (!moduleId) return;
    setJoining(true);
    try {
      await moduleService.join(moduleId);
      await reload();
      toast.success(`You joined ${module?.name}`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not join the module'));
    } finally {
      setJoining(false);
    }
  };

  const setStatus = async (status: ModuleStatus) => {
    if (!moduleId) return;
    try {
      await moduleService.updateModule(moduleId, { status });
      await reload();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change the status'));
    }
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleId || !name.trim()) return;
    setSaving(true);
    try {
      await moduleService.updateModule(moduleId, { name: name.trim(), description: description.trim() });
      await reload();
      setEditOpen(false);
      toast.success('Module details saved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the module'));
    } finally {
      setSaving(false);
    }
  };

  if (missing) {
    return (
      <PageContainer title="Module">
        <div className="surface rounded-2xl px-6 py-16 text-center max-w-xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-2">This module isn’t available</h2>
          <p className="text-muted-foreground mb-6">It may have been deleted, or you are no longer on its project.</p>
          <AnimatedButton variant="primary" onClick={() => navigate(projectId ? `/project/${projectId}` : '/projects')}>
            Back to the project
          </AnimatedButton>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={module?.name ?? 'Module'}
      crumbs={moduleCrumbs(module)}
      topBarActions={
        module && !module.isMember ? (
          <AnimatedButton size="sm" variant="accent" onClick={join} loading={joining}>
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Join module</span>
          </AnimatedButton>
        ) : null
      }
    >
      <div className="space-y-8">
        <header>
          {module ? (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  {isAdmin ? (
                    <select
                      value={module.status}
                      onChange={(e) => setStatus(e.target.value as ModuleStatus)}
                      aria-label="Module status"
                      className="h-8 pl-2.5 pr-7 rounded-full border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent-soft"
                    >
                      {(Object.keys(MODULE_STATUS) as ModuleStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {MODULE_STATUS[s].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <ModuleStatusBadge status={module.status} />
                  )}
                </div>
                <p className="mt-2 text-muted-foreground leading-relaxed max-w-2xl">
                  {module.description || 'No description yet.'}
                </p>
                {isAdmin && (
                  <div className="flex gap-2 mt-4">
                    <AnimatedButton
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setName(module.name);
                        setDescription(module.description ?? '');
                        setEditOpen(true);
                      }}
                    >
                      <Settings2 className="w-4 h-4" /> Edit details
                    </AnimatedButton>
                  </div>
                )}
              </div>

              <aside className="surface rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground">
                    Members <span className="text-muted-foreground font-normal">{module.members.length}</span>
                  </h2>
                  {isAdmin && (
                    <button onClick={() => setMembersOpen(true)} className="text-sm font-medium text-accent hover:underline">
                      Manage
                    </button>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {module.members.slice(0, 6).map((m) => (
                    <li key={m.userId} className="flex items-center gap-2.5">
                      <Avatar name={m.user.name} src={m.user.avatarUrl} size="xs" />
                      <span className="text-sm text-foreground truncate">
                        {m.user.name}
                        {m.userId === me?.id && <span className="text-muted-foreground"> (you)</span>}
                      </span>
                    </li>
                  ))}
                  {module.members.length === 0 && <li className="text-sm text-muted-foreground">Nobody has joined yet.</li>}
                </ul>
                {module.members.length > 6 && (
                  <p className="text-xs text-muted-foreground mt-3">and {module.members.length - 6} more</p>
                )}
                {module.isMember && (
                  <button
                    onClick={() => setLeaveOpen(true)}
                    className="mt-4 text-sm text-muted-foreground hover:text-danger transition-colors"
                  >
                    Leave module
                  </button>
                )}
              </aside>
            </div>
          ) : (
            <div className="space-y-3">
              <Skeleton width="260px" height="34px" />
              <Skeleton width="380px" height="18px" />
            </div>
          )}
        </header>

        <section className="grid sm:grid-cols-2 gap-4" aria-label="Module tools">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => navigate(tool.route)}
              className={cn(
                'group relative text-left surface rounded-2xl p-6 transition-colors hover:border-border-strong',
                tool.isLive && 'border-success/50 ring-1 ring-success/30'
              )}
            >
              {tool.isLive && (
                <span className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-soft text-success text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Live ({tool.liveCount})
                </span>
              )}
              <span
                className={cn(
                  'w-11 h-11 rounded-xl grid place-items-center mb-5 transition-colors',
                  tool.isLive ? 'bg-success-soft text-success' : 'bg-muted text-foreground group-hover:bg-accent-soft group-hover:text-accent'
                )}
              >
                <tool.icon className="w-5 h-5" strokeWidth={1.9} />
              </span>
              <h3 className="text-lg font-semibold text-foreground mb-1">{tool.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
            </button>
          ))}
        </section>

        {isAdmin && module && (
          <section className="surface rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-danger/30">
            <div>
              <h2 className="font-semibold text-danger">Delete this module</h2>
              <p className="text-sm text-muted-foreground">Its board, notes and chat go with it.</p>
            </div>
            <AnimatedButton variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete module
            </AnimatedButton>
          </section>
        )}
      </div>

      {module && (
        <>
          <ModuleMembersDialog open={membersOpen} onClose={() => setMembersOpen(false)} module={module} onChanged={reload} />

          <Modal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            title="Edit module"
            footer={
              <>
                <AnimatedButton variant="secondary" onClick={() => setEditOpen(false)}>
                  Cancel
                </AnimatedButton>
                <AnimatedButton type="submit" form="edit-module" variant="primary" loading={saving} disabled={!name.trim()}>
                  Save changes
                </AnimatedButton>
              </>
            }
          >
            <form id="edit-module" onSubmit={saveDetails} className="space-y-4">
              <Field label="Name">
                {(props) => <input {...props} value={name} onChange={(e) => setName(e.target.value)} maxLength={255} className={inputClass} />}
              </Field>
              <Field label="Description">
                {(props) => (
                  <textarea
                    {...props}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className={cn(inputClass, 'resize-none')}
                  />
                )}
              </Field>
            </form>
          </Modal>

          <ConfirmDialog
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title={`Delete ${module.name}?`}
            description="Its board, notes and chat are removed for everyone on the project."
            typeToConfirm={module.name}
            confirmLabel="Delete module"
            onConfirm={async () => {
              try {
                await moduleService.deleteModule(module.id);
                toast.success(`Deleted ${module.name}`);
                navigate(`/project/${projectId}`);
              } catch (error) {
                toast.error(errorMessage(error, 'Could not delete the module'));
                throw error;
              }
            }}
          />

          <ConfirmDialog
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title={`Leave ${module.name}?`}
            description="You leave its chat. You can still open its board and notes, and join again at any time."
            confirmLabel="Leave module"
            tone="primary"
            onConfirm={async () => {
              try {
                await moduleService.removeMember(module.id, me!.id);
                await reload();
                toast.success(`You left ${module.name}`);
              } catch (error) {
                toast.error(errorMessage(error, 'Could not leave the module'));
                throw error;
              }
            }}
          />
        </>
      )}
    </PageContainer>
  );
};
