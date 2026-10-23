import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Loader2, Search, UserPlus, X } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { toast } from '../../components/Providers/ToastProvider';
import { profileService, type DirectoryUser } from '../../services/profileService';
import { inboxService } from '../../services/inboxService';
import { useInboxStore } from '../../stores/inbox.store';
import { fadeUp } from '../../lib/motion';

/** Search users by username or email, then send a connection request. */
export const AddConnectionPanel: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const connections = useInboxStore((state) => state.connections);
  const loadConnections = useInboxStore((state) => state.loadConnections);

  // Existing relationships are shown inline so the button reflects reality.
  const relationshipByUserId = useMemo(() => {
    const map = new Map<string, 'connected' | 'requested' | 'awaiting-you'>();
    connections.accepted.forEach((c) => map.set(c.user.id, 'connected'));
    connections.outgoing.forEach((c) => map.set(c.user.id, 'requested'));
    connections.incoming.forEach((c) => map.set(c.user.id, 'awaiting-you'));
    return map;
  }, [connections]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
    else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await profileService.search(query));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [query]);

  const sendRequest = async (user: DirectoryUser) => {
    setPendingId(user.id);
    try {
      const result = await inboxService.requestConnection(user.id);
      await loadConnections();
      toast.success(
        result.autoAccepted
          ? `You and ${user.name} are now connected`
          : `Request sent to ${user.name}`
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Could not send that request');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed left-1/2 -translate-x-1/2 top-[12vh] w-[min(94vw,34rem)] surface-elevated rounded-2xl overflow-hidden z-[91]"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username or email…"
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-subtle-foreground"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {query.trim().length < 2 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground leading-relaxed">
                  Type at least two characters.
                  <br />
                  Once they accept — or add you back — you can start chatting.
                </p>
              ) : results.length === 0 && !searching ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nobody matches “{query}”.
                </p>
              ) : (
                results.map((user) => {
                  const relationship = relationshipByUserId.get(user.id);
                  return (
                    <motion.div
                      key={user.id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <Avatar name={user.name} src={user.image} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.username ? `@${user.username}` : user.email}
                          {user.jobTitle ? ` · ${user.jobTitle}` : ''}
                        </p>
                      </div>

                      {relationship === 'connected' ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-success font-medium shrink-0">
                          <Check className="w-4 h-4" /> Connected
                        </span>
                      ) : relationship === 'requested' ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                          <Clock className="w-4 h-4" /> Requested
                        </span>
                      ) : (
                        <AnimatedButton
                          size="sm"
                          variant={relationship === 'awaiting-you' ? 'accent' : 'secondary'}
                          loading={pendingId === user.id}
                          onClick={() => sendRequest(user)}
                        >
                          <UserPlus className="w-4 h-4" />
                          {relationship === 'awaiting-you' ? 'Add back' : 'Add'}
                        </AnimatedButton>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
