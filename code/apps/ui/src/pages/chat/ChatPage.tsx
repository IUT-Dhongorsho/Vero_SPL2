import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, MessageSquare } from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AvatarStack } from '../../components/project/AvatarStack';
import { MessageThread } from '../../components/chat/MessageThread';
import { toast } from '../../components/Providers/ToastProvider';
import { Composer } from '../inbox/Composer';
import { inboxService } from '../../services/inboxService';
import { moduleService } from '../../services/moduleService';
import { useModule } from '../../hooks/useModule';
import { useConversation } from '../../hooks/useConversation';
import { useInboxStore } from '../../stores/inbox.store';
import { useAuthStore } from '../../stores/auth.store';
import { errorMessage } from '../../utils/errors';
import { moduleCrumbs } from '../../lib/routes';

type ChatState = 'loading' | 'ready' | 'not-member' | 'provisioning' | 'failed';

/**
 * A module's group chat. It runs on the same socket, store and components as
 * the Inbox, so messages, files, slash commands and typing behave identically.
 */
export const ChatPage: React.FC = () => {
  const { moduleId } = useParams();
  const me = useAuthStore((s) => s.user);
  const { module, missing, reload } = useModule(moduleId);
  const { activeChannelId, messagesLoading, onlineUserIds, connected, openChannel, closeConversation, deleteMessage } =
    useInboxStore();
  const [state, setState] = useState<ChatState>('loading');
  const [failure, setFailure] = useState('');
  const [joining, setJoining] = useState(false);
  const attempts = useRef(0);

  const channelId = state === 'ready' ? activeChannelId : null;
  const { messages, addNotice, clearView, scrollRef, typingNames } = useConversation(channelId);

  const connect = useCallback(async () => {
    if (!moduleId) return;
    try {
      const channel = await inboxService.moduleChannel(moduleId);
      await openChannel(channel.id);
      setState('ready');
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404 && attempts.current < 10) {
        // The chat is created in the background right after the module.
        attempts.current += 1;
        setState('provisioning');
        setTimeout(connect, 1500);
      } else if (status === 403 && attempts.current === 0) {
        // On the module but not yet in its channel (modules made before chat
        // sync existed): joining again re-syncs access.
        attempts.current += 1;
        await moduleService.join(moduleId).catch(() => {});
        connect();
      } else {
        setFailure(errorMessage(error, 'The chat could not be opened'));
        setState('failed');
      }
    }
  }, [moduleId, openChannel]);

  useEffect(() => {
    if (!module) return;
    attempts.current = 0;
    if (!module.isMember) {
      setState('not-member');
      return;
    }
    setState('loading');
    connect();
  }, [module, connect]);

  // Leave the room when navigating away so the Inbox does not inherit it.
  useEffect(() => () => closeConversation(), [closeConversation]);

  const join = async () => {
    if (!moduleId) return;
    setJoining(true);
    try {
      await moduleService.join(moduleId);
      await reload();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not join the module'));
    } finally {
      setJoining(false);
    }
  };

  const online = module?.members.filter((m) => onlineUserIds.includes(m.userId) && m.userId !== me?.id).length ?? 0;
  const status =
    typingNames.length > 0
      ? `${typingNames.slice(0, 2).join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing…`
      : !connected
        ? 'Reconnecting…'
        : online > 0
          ? `${online} online now`
          : `${module?.members.length ?? 0} ${module?.members.length === 1 ? 'member' : 'members'}`;

  return (
    <PageContainer title={module?.name ?? 'Chat'} crumbs={moduleCrumbs(module)} layout="full">
      <div className="h-[calc(100vh-var(--shell-top))] flex flex-col">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-card">
          <span className="w-9 h-9 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
            <MessageSquare className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate leading-tight">Chat</p>
            <p className="text-xs text-muted-foreground truncate">{status}</p>
          </div>
          {module && <AvatarStack people={module.members.map((m) => m.user)} />}
        </header>

        {state === 'ready' ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-background">
              <MessageThread
                messages={messages}
                loading={messagesLoading}
                meId={me?.id}
                meName={me?.name}
                fallbackName="A teammate"
                typingNames={typingNames}
                emptyTitle={`Start the conversation in ${module?.name ?? 'this module'}`}
                emptyHint="Everyone on the module sees what you post here, files included."
                onDelete={(id) => deleteMessage(id)}
              />
            </div>
            {activeChannelId && (
              <Composer
                channelId={activeChannelId}
                onLocalNotice={addNotice}
                onClear={() => {
                  clearView();
                  toast.success('Cleared from your view — nothing was deleted');
                }}
              />
            )}
          </>
        ) : (
          <div className="flex-1 grid place-items-center p-6 bg-background">
            {missing ? (
              <p className="text-muted-foreground">This module isn’t available.</p>
            ) : state === 'not-member' ? (
              <div className="text-center max-w-sm">
                <MessageSquare className="w-10 h-10 text-subtle-foreground mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-1">Join {module?.name} to read its chat</p>
                <p className="text-sm text-muted-foreground mb-5">
                  The chat is for the people working on this module. Joining also adds it to your work.
                </p>
                <AnimatedButton variant="primary" onClick={join} loading={joining}>
                  Join module
                </AnimatedButton>
              </div>
            ) : state === 'failed' ? (
              <div className="text-center max-w-sm">
                <p className="font-semibold text-foreground mb-1">{failure}</p>
                <AnimatedButton
                  variant="secondary"
                  className="mt-4"
                  onClick={() => {
                    attempts.current = 0;
                    setState('loading');
                    connect();
                  }}
                >
                  Try again
                </AnimatedButton>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                {state === 'provisioning' ? 'Setting up the chat for this module…' : 'Opening the chat…'}
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
