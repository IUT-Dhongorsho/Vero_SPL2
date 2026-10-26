import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, RefreshCw, UserPlus } from 'lucide-react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/Providers/ToastProvider';
import { projectService, type ProjectMember, type ProjectRole } from '../../services/projectService';
import { useAuthStore } from '../../stores/auth.store';
import { useProjectStore } from '../../stores/project.store';
import { errorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/dateUtils';
import { ROLE_LABEL, type ProjectTabProps } from './ProjectPage';

const ROLE_HELP: Record<ProjectRole, string> = {
  admin: 'Manages members, modules and settings',
  member: 'Works on boards, notes, chat and files',
  viewer: 'Can look but not change anything',
};

/** Copyable invite code; admins can replace it, which retires the old one. */
const InviteCard: React.FC<{ code?: string; onRegenerate: () => Promise<void> }> = ({ code, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="surface rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        <h3 className="font-semibold text-foreground">Invite people</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Share this code. Anyone who enters it under Projects → Join becomes a member.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={copy}
          disabled={!code}
          title="Copy invite code"
          className="flex items-center gap-3 h-11 pl-4 pr-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors"
        >
          <span className="font-mono text-lg font-semibold tracking-[0.2em] text-foreground">{code ?? '······'}</span>
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatedButton
          variant="ghost"
          size="icon"
          title="Make a new code"
          aria-label="Make a new invite code"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onRegenerate();
            } finally {
              setBusy(false);
            }
          }}
        >
          {!busy && <RefreshCw className="w-4 h-4" />}
        </AnimatedButton>
      </div>
    </div>
  );
};

export const MembersTab: React.FC<ProjectTabProps> = ({ project, refresh, setActions }) => {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const isAdmin = project.userRole === 'admin';

  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await projectService.getMembers(project.id));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load members'));
      setMembers([]);
    }
  }, [project.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setActions(
      isAdmin ? (
        <AnimatedButton size="sm" variant="accent" onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Invite</span>
        </AnimatedButton>
      ) : null
    );
  }, [isAdmin, setActions]);

  const changeRole = async (member: ProjectMember, role: ProjectRole) => {
    const previous = member.role;
    setMembers((list) => list?.map((m) => (m.id === member.id ? { ...m, role } : m)) ?? null);
    try {
      await projectService.setMemberRole(project.id, member.userId, role);
      toast.success(`${member.user.name} is now ${role === 'admin' ? 'an' : 'a'} ${ROLE_LABEL[role].toLowerCase()}`);
      if (member.userId === me?.id) await refresh();
    } catch (error) {
      setMembers((list) => list?.map((m) => (m.id === member.id ? { ...m, role: previous } : m)) ?? null);
      toast.error(errorMessage(error, 'Could not change the role'));
    }
  };

  const regenerate = async () => {
    try {
      await projectService.generateInviteCode(project.id);
      await refresh();
      toast.success('New invite code ready — the old one no longer works');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not make a new code'));
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && <InviteCard code={project.inviteCode} onRegenerate={regenerate} />}

      {members === null ? (
        <ListSkeleton rows={3} />
      ) : (
        <ul className="surface rounded-2xl divide-y divide-border overflow-hidden">
          {members.map((member) => {
            const isMe = member.userId === me?.id;
            return (
              <li key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={member.user.name} src={member.user.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{member.user.name}</span>
                      {isMe && <Badge>You</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Joined {timeAgo(member.joinedAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  {isAdmin ? (
                    <select
                      value={member.role}
                      onChange={(e) => changeRole(member, e.target.value as ProjectRole)}
                      aria-label={`Role for ${member.user.name}`}
                      title={ROLE_HELP[member.role]}
                      className="h-9 pl-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    >
                      {(Object.keys(ROLE_LABEL) as ProjectRole[]).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={member.role === 'admin' ? 'accent' : 'neutral'}>{ROLE_LABEL[member.role]}</Badge>
                  )}

                  {isMe ? (
                    <AnimatedButton size="sm" variant="ghost" onClick={() => setLeaving(true)}>
                      Leave
                    </AnimatedButton>
                  ) : (
                    isAdmin && (
                      <AnimatedButton size="sm" variant="ghost" onClick={() => setRemoving(member)}>
                        Remove
                      </AnimatedButton>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={`Invite people to ${project.name}`}
        description="Send them this code. They enter it under Projects → Join and arrive as members; change their role here afterwards."
      >
        <InviteCard code={project.inviteCode} onRegenerate={regenerate} />
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.user.name ?? ''}?`}
        description="They lose access to every module, board, note, chat and file in this project. You can invite them again later."
        confirmLabel="Remove from project"
        onConfirm={async () => {
          if (!removing) return;
          try {
            await projectService.removeMember(project.id, removing.userId);
            toast.success(`Removed ${removing.user.name}`);
            await Promise.all([load(), refresh()]);
          } catch (error) {
            toast.error(errorMessage(error, 'Could not remove them'));
            throw error;
          }
        }}
      />

      <ConfirmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title={`Leave ${project.name}?`}
        description="You lose access to its modules, notes, chat and files until someone invites you back."
        confirmLabel="Leave project"
        onConfirm={async () => {
          try {
            await projectService.removeMember(project.id, me!.id);
            toast.success(`You left ${project.name}`);
            await fetchProjects();
            navigate('/projects');
          } catch (error) {
            toast.error(errorMessage(error, 'Could not leave the project'));
            throw error;
          }
        }}
      />
    </div>
  );
};
