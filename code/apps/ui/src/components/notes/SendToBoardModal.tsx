import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useBoardStore } from '../../stores/board.store'; // Hypothetical future integration

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
  const [type, setType] = useState<'task' | 'checklist'>('task');

  const handleSend = () => {
    // TODO: call board-service when API contract is finalized
    // boardService.createTaskFromNote({ text: selectedText, noteId, projectId, type });
    
    // toast.success(`Sent to Board as ${type} — board integration coming soon`);
    console.log('Sending to board...', { selectedText, noteId, type, projectId });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to Board</DialogTitle>
          <DialogDescription>Create a task or checklist item from the selected text.</DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <div className="p-3 bg-muted rounded-md text-sm italic mb-4 border-l-2 border-primary">
            "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
          </div>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="radio" name="board_type" className="mt-1" checked={type === 'task'} onChange={() => setType('task')} />
              <div>
                <div className="font-semibold text-sm">Task (in Kanban)</div>
                <div className="text-xs text-muted-foreground">Creates a new top-level task in the project board.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="radio" name="board_type" className="mt-1" checked={type === 'checklist'} onChange={() => setType('checklist')} />
              <div>
                <div className="font-semibold text-sm">Checklist Item</div>
                <div className="text-xs text-muted-foreground">Creates a checklist item linked to an existing task.</div>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend}>Send to Board</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
