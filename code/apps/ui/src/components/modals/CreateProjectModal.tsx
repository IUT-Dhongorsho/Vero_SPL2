import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Field, inputClass } from '../ui/Field';
import { AnimatedButton } from '../ui/AnimatedButton';
import { toast } from '../Providers/ToastProvider';
import { useProjectStore } from '../../stores/project.store';
import { errorMessage } from '../../utils/errors';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const createProject = useProjectStore((s) => s.createProject);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const project = await createProject({ name: name.trim(), description: description.trim() });
      toast.success(`Created ${project.name}`);
      close();
      navigate(`/project/${project.id}`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create the project'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={close}
      title="New project"
      description="You become its admin. Invite people with the code on its Members tab."
      footer={
        <>
          <AnimatedButton variant="secondary" onClick={close}>
            Cancel
          </AnimatedButton>
          <AnimatedButton type="submit" form="create-project" variant="primary" loading={loading} disabled={!name.trim()}>
            Create project
          </AnimatedButton>
        </>
      }
    >
      <form id="create-project" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          {(props) => <input {...props} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mobile app relaunch" maxLength={255} className={inputClass} />}
        </Field>
        <Field label="Description" hint="Optional.">
          {(props) => (
            <textarea {...props} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} className={`${inputClass} resize-none`} />
          )}
        </Field>
      </form>
    </Modal>
  );
};
