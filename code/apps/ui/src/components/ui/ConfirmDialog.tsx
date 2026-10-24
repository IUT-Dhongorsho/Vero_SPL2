import React, { useState } from 'react';
import { Modal } from './Modal';
import { AnimatedButton } from './AnimatedButton';
import { inputClass } from './Field';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** Destructive actions are red. */
  tone?: 'danger' | 'primary';
  /** When set, the person must type this before the button unlocks. */
  typeToConfirm?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  typeToConfirm,
}) => {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const locked = !!typeToConfirm && typed.trim() !== typeToConfirm;

  const close = () => {
    if (busy) return;
    setTyped('');
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setTyped('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      footer={
        <>
          <AnimatedButton variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </AnimatedButton>
          <AnimatedButton variant={tone} onClick={confirm} loading={busy} disabled={locked} data-autofocus>
            {confirmLabel}
          </AnimatedButton>
        </>
      }
    >
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
        <div>{description}</div>
        {typeToConfirm && (
          <label className="block space-y-1.5">
            <span className="text-foreground">
              Type <span className="font-semibold">{typeToConfirm}</span> to confirm.
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} autoComplete="off" />
          </label>
        )}
      </div>
    </Modal>
  );
};
