import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useBoardStore } from '../../stores/board.store';
import { useAuthStore } from '../../stores/auth.store';
import { toast } from '../../components/Providers/ToastProvider';
import { Loader2 } from 'lucide-react';

interface SendToBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  noteId: string;
  projectId?: string;
}

export const SendToBoardModal: React.FC<SendToBoardModalProps> = ({
  isOpen, onClose, selectedText, noteId, projectId
}) => {
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [sending, setSending] = useState(false);
  const { columns, fetchBoard, createTask } = useBoardStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen && projectId && columns.length === 0) {
      fetchBoard(projectId);
    }
  }, [isOpen, projectId, columns.length, fetchBoard]);

  useEffect(() => {
    if (columns.length > 0 && !columnId) {
      const backlog = columns.find(c => c.name === 'Backlog');
      setColumnId(backlog?.id || columns[0]?.id || '');
    }
  }, [columns, columnId]);

  const handleSend = async () => {
    if (!columnId || !user?.id) return;
    setSending(true);
    try {
      await createTask({
        title: selectedText.length > 120 ? selectedText.substring(0, 120) + '...' : selectedText,
        description: `Source: Note ${noteId}\n\n${selectedText}`,
        columnId,
        creatorId: user.id,
        priority,
      });
      toast.success('Task created on board');
      onClose();
    } catch (e) {
      toast.error('Failed to create task');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to Board</DialogTitle>
          <DialogDescription>Create a task on the Kanban board from selected text.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-4">
          <div className="p-4 bg-muted rounded-xl text-sm text-foreground border-l-4 border-primary">
            "{selectedText.length > 120 ? selectedText.substring(0, 120) + '...' : selectedText}"
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Column</label>
            <div className="grid grid-cols-2 gap-2">
              {columns.sort((a, b) => a.order - b.order).map((col) => (
                <button
                  key={col.id}
                  onClick={() => setColumnId(col.id)}
                  className={`text-sm font-medium px-3 py-2.5 rounded-lg border-2 transition-all text-left ${
                    columnId === col.id
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-full uppercase tracking-wider transition-all ${
                    priority === p
                      ? p === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-300'
                      : p === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 ring-1 ring-yellow-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-green-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !columnId}>
            {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating...</> : 'Send to Board'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
