import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Field, inputClass } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/Providers/ToastProvider';
import { projectService } from '../../services/projectService';
import { useProjectStore } from '../../stores/project.store';
import { useAuthStore } from '../../stores/auth.store';
import { errorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';
import type { ProjectTabProps } from './ProjectPage';

const Section: React.FC<{ title: string; description: string; children: React.ReactNode; danger?: boolean }> = ({
  title,
  description,
  children,
  danger,
}) => (
  <section className={cn('surface rounded-2xl p-6 grid md:grid-cols-[16rem_1fr] gap-6', danger && 'border-danger/40')}>
    <div>
      <h3 className={cn('font-semibold', danger ? 'text-danger' : 'text-foreground')}>{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

export const SettingsTab: React.FC<ProjectTabProps> = ({ project, refresh, setActions }) => {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const isAdmin = project.userRole === 'admin';

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => setActions(null), [setActions]);
  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
  }, [project.name, project.description]);

  const dirty = name.trim() !== project.name || description.trim() !== (project.description ?? '');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await projectService.updateProject(project.id, { name: name.trim(), description: description.trim() });
      await Promise.all([refresh(), fetchProjects()]);
      toast.success('Project details saved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the project'));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: 'active' | 'completed') => {
    try {
      await projectService.updateProject(project.id, { status });
      await Promise.all([refresh(), fetchProjects()]);
      toast.success(status === 'completed' ? 'Marked as completed' : 'Reopened');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change the status'));
    }
  };

  return (
    <div className="space-y-5">
      {isAdmin ? (
        <>
          <Section title="Details" description="Shown to everyone on the project.">
            <form onSubmit={save} className="space-y-4 max-w-xl">
              <Field label="Project name">
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
              <AnimatedButton type="submit" variant="primary" loading={saving} disabled={!dirty || !name.trim()}>
                Save changes
              </AnimatedButton>
            </form>
          </Section>

          <Section
            title="Status"
            description="Marking a project completed only changes its label. Everything in it stays open to members."
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-foreground">
                This project is <span className="font-semibold">{project.status === 'completed' ? 'completed' : 'active'}</span>.
              </p>
              <AnimatedButton
                size="sm"
                variant="secondary"
                onClick={() => setStatus(project.status === 'completed' ? 'active' : 'completed')}
              >
                {project.status === 'completed' ? 'Reopen project' : 'Mark as completed'}
              </AnimatedButton>
            </div>
          </Section>

          <Section
            danger
            title="Delete project"
            description="Removes the project, its modules, chats and files for everyone. This cannot be undone."
          >
            <AnimatedButton variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete {project.name}
            </AnimatedButton>
          </Section>
        </>
      ) : (
        <Section title="Your membership" description="Only project admins can change the project's details.">
          <AnimatedButton variant="secondary" onClick={() => setConfirmLeave(true)}>
            Leave {project.name}
          </AnimatedButton>
        </Section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${project.name}?`}
        description="Every module, board, note, chat and file in it is deleted for everyone."
        typeToConfirm={project.name}
        confirmLabel="Delete project"
        onConfirm={async () => {
          try {
            await projectService.deleteProject(project.id);
            await fetchProjects();
            toast.success(`Deleted ${project.name}`);
            navigate('/projects');
          } catch (error) {
            toast.error(errorMessage(error, 'Could not delete the project'));
            throw error;
          }
        }}
      />

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={`Leave ${project.name}?`}
        description="You lose access to its modules, notes, chat and files until someone invites you back."
        confirmLabel="Leave project"
        onConfirm={async () => {
          try {
            await projectService.removeMember(project.id, me!.id);
            await fetchProjects();
            toast.success(`You left ${project.name}`);
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
