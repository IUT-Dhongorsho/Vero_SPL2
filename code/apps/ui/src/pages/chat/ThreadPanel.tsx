import React from 'react';
import { X } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';

interface ThreadPanelProps {
  messageId: string;
  onClose: () => void;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({ messageId, onClose }) => {
  const { messages } = useChatStore();
  const parentMessage = messages.find(m => m.id === messageId);
  
  // In a real app, threaded replies would have a parentId field.
  // For this mock, we just show empty thread or specific mock data if we had it.
  const replies = messages.filter(m => m.id !== messageId && (m as any).parentId === messageId);

  if (!parentMessage) return null;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/90 backdrop-blur z-10">
        <h3 className="font-bold text-foreground">Thread</h3>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Parent Message Context */}
        <MessageBubble message={parentMessage} onReply={() => {}} />
        
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">{replies.length} Replies</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Replies */}
        {replies.map(reply => (
          <MessageBubble key={reply.id} message={reply} onReply={() => {}} />
        ))}
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-border shrink-0 bg-card">
        <ChatComposer channelId={parentMessage.channelId} parentId={parentMessage.id} />
      </div>
    </div>
  );
};
