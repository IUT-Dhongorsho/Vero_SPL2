import React, { useCallback, useEffect, useState } from 'react';
import { ListChecks, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AnimatedButton } from '../ui/AnimatedButton';
import { PriorityBadge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { SendToBoardModal } from './SendToBoardModal';
import { notesService, type NoteDigest } from '../../services/notesService';
import { errorMessage } from '../../utils/errors';

interface Props {
  open: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  moduleId: string;
  /** Viewers can read a summary but not add tasks. */
  canAddTasks: boolean;
}

/** Gemini's reading of the note: what it says, and what it commits people to. */
export const NoteDigestPanel: React.FC<Props> = ({ open, onClose, noteId, noteTitle, moduleId, canAddTasks }) => {
  const [digest, setDigest] = useState<NoteDigest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDigest(await notesService.digest(noteId));
    } catch (err) {
      setError(errorMessage(err, 'The summary could not be made'));
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (open) {
      setDigest(null);
      run();
    }
  }, [open, run]);

  return (
    <>
      <Modal
        open={open && !sending}
        onClose={onClose}
        title="Summary"
        description={`Generated from “${noteTitle}” as it is right now. Check it before relying on it.`}
        size="lg"
        footer={
          digest && (
            <>
              <AnimatedButton variant="secondary" onClick={run} loading={loading}>
                {!loading && <RefreshCw className="w-4 h-4" />} Summarise again
              </AnimatedButton>
              {canAddTasks && digest.actionItems.length > 0 && (
                <AnimatedButton variant="primary" onClick={() => setSending(true)}>
                  <ListChecks className="w-4 h-4" />
                  Add {digest.actionItems.length === 1 ? 'action item' : `${digest.actionItems.length} action items`} to the board
                </AnimatedButton>
              )}
            </>
          )
        }
      >
        {loading && !digest ? (
          <div className="space-y-3" aria-busy="true" aria-label="Summarising">
            <Skeleton width="100%" height="16px" />
            <Skeleton width="92%" height="16px" />
            <Skeleton width="70%" height="16px" />
            <div className="pt-4 space-y-2">
              <Skeleton width="40%" height="14px" />
              <Skeleton width="80%" height="14px" />
              <Skeleton width="65%" height="14px" />
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="font-medium text-foreground">{error}</p>
            <AnimatedButton variant="secondary" size="sm" className="mt-4" onClick={run}>
              Try again
            </AnimatedButton>
          </div>
        ) : digest ? (
          <div className="space-y-6">
            <p className="text-foreground leading-relaxed">{digest.summary}</p>

            {digest.keyPoints.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2">Key points</h3>
                <ul className="space-y-1.5 list-disc pl-5 text-sm text-muted-foreground marker:text-subtle-foreground">
                  {digest.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Action items</h3>
              {digest.actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in this note asks anyone to do something.</p>
              ) : (
                <ul className="divide-y divide-border border border-border rounded-xl">
                  {digest.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 px-3.5 py-3">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-foreground">{item.title}</span>
                        {item.detail && <span className="block text-xs text-muted-foreground mt-0.5">{item.detail}</span>}
                      </span>
                      <PriorityBadge priority={item.priority} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      {digest && (
        <SendToBoardModal
          isOpen={sending}
          onClose={() => setSending(false)}
          moduleId={moduleId}
          noteTitle={noteTitle}
          items={digest.actionItems}
        />
      )}
    </>
  );
};
