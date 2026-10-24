import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Field, inputClass } from '../ui/Field';
import { AnimatedButton } from '../ui/AnimatedButton';
import { toast } from '../Providers/ToastProvider';
import { useModuleStore } from '../../stores/module.store';
import { errorMessage } from '../../utils/errors';

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const CreateModuleModal: React.FC<CreateModuleModalProps> = ({ isOpen, onClose, projectId }) => {
  const navigate = useNavigate();
  const createModule = useModuleStore((s) => s.createModule);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await createModule({ name: name.trim(), description: description.trim(), projectId });
      toast.success(`Created ${created.name}`);
      close();
      navigate(`/project/${projectId}/module/${created.id}`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create the module'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={close}
      title="New module"
      description="A module is one stream of work with its own board, notes and chat. Project admins join it automatically."
      footer={
        <>
          <AnimatedButton variant="secondary" onClick={close}>
            Cancel
          </AnimatedButton>
          <AnimatedButton type="submit" form="create-module" variant="primary" loading={saving} disabled={!name.trim()}>
            Create module
          </AnimatedButton>
        </>
      }
    >
      <form id="create-module" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          {(props) => (
            <input
              {...props}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Checkout redesign"
              maxLength={255}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Description" hint="Optional. Shown on the module page.">
          {(props) => (
            <textarea
              {...props}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className={`${inputClass} resize-none`}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
};
