import React, { useRef, useEffect } from 'react';
import { Channel, useChatStore } from '../../stores/chat.store';
import { ChatComposer } from './ChatComposer';
import { MessageBubble } from './MessageBubble';
import { Hash, Pin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ChatWindowProps {
  channel: Channel;
  showThread?: boolean; // Kept for backwards compatibility but unused
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ channel }) => {
  const { messages, setActiveThread, markChannelRead, typingUsers } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Do not filter out thread replies anymore, show all messages inline
  const channelMessages = messages.filter(m => m.channelId === channel.id);
  const pinnedMessages = channelMessages.filter(m => m.pinned);
  
  const typingInChannel = typingUsers[channel.id] || [];

  useEffect(() => {
    // Mark as read when channel changes or new message arrives
    markChannelRead(channel.id);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channel.id, channelMessages.length, markChannelRead]);

  return (
    <div className="flex flex-1 min-w-0 h-full relative">
      
      {/* Main Message Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 border-r border-border border-transparent">
        
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center px-6 shrink-0 bg-card/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Project Chat</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Avatars of participants */}
            <div className="flex -space-x-2">
              {channel.participants.slice(0, 3).map((p, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-medium">
                  {p.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-2 shrink-0 flex items-center gap-2 z-10 text-sm">
            <Pin className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-primary">{pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}:</span>
            <div className="truncate text-foreground/80 flex-1">
               {pinnedMessages[pinnedMessages.length - 1].content}
            </div>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {channelMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Hash className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">Welcome to #{channel.name}</p>
              <p className="text-sm">This is the start of the channel.</p>
            </div>
          ) : (
            channelMessages.map(msg => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onReply={() => setActiveThread(msg.id)} 
              />
            ))
          )}
          
          {typingInChannel.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic animate-pulse">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full delay-75" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full delay-150" />
              </div>
              {typingInChannel.join(', ')} {typingInChannel.length > 1 ? 'are' : 'is'} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-4 shrink-0 bg-card">
          <ChatComposer channelId={channel.id} />
        </div>

      </div>

    </div>
  );
};
