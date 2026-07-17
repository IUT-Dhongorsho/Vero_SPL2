import React, { useState } from 'react';
import { Message, useChatStore } from '../../stores/chat.store';
import { Pin, MessageSquare, Smile, MoreHorizontal, FileText, Download } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

export const MessageBubble: React.FC<{ message: Message; onReply: () => void }> = ({ message, onReply }) => {
  const user = useAuthStore(state => state.user);
  const { pinMessage, toggleReaction } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  const isMe = message.senderId === user?.id; // Or mock ID if user not setup properly in mock

  return (
    <div 
      className={`group flex gap-4 relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
        {message.senderId.charAt(0).toUpperCase()}
      </div>

      <div className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-foreground">{message.senderId}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.pinned && <Pin className="w-3 h-3 text-emerald-500 ml-1" />}
        </div>

        <div className={`px-4 py-2.5 rounded-2xl relative ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {message.file && (
            <div className={`mt-2 flex items-center gap-3 p-3 rounded-lg border ${isMe ? 'border-primary-foreground/20 bg-primary-foreground/10' : 'border-border bg-card'}`}>
              <FileText className="w-8 h-8 opacity-70" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{message.file.name}</p>
                <p className="text-xs opacity-70">{(message.file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button 
                key={emoji}
                onClick={() => toggleReaction(message.id, emoji, user?.id || 'u1')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                  users.includes(user?.id || 'u1') 
                    ? 'bg-primary/10 border-primary/20 text-primary' 
                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {message.threadCount ? (
           <button onClick={onReply} className="mt-1 text-xs font-semibold text-primary hover:underline flex items-center gap-1">
             <MessageSquare className="w-3 h-3" /> {message.threadCount} replies
           </button>
        ) : null}
      </div>

      {/* Floating Action Menu */}
      <div className={`absolute -top-4 ${isMe ? 'left-12' : 'right-12'} flex items-center gap-1 opacity-0 transition-opacity z-20 ${showActions || showReactionPicker ? 'opacity-100' : ''}`}>
        
        {showReactionPicker && (
          <div className={`absolute top-full mt-2 ${isMe ? 'left-0' : 'right-0'} bg-card border border-border shadow-xl rounded-full flex items-center p-1 gap-1 z-50`}>
            {['👍', '❤️', '🚀', '😂', '👀'].map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  toggleReaction(message.id, emoji, user?.id || 'u1');
                  setShowReactionPicker(false);
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-full transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="bg-card border border-border shadow-sm rounded-lg flex items-center p-1">
          <button 
            onClick={() => setShowReactionPicker(!showReactionPicker)} 
            className={`p-1.5 rounded-md transition-colors ${showReactionPicker ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`} 
            title="React"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button onClick={onReply} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Reply in thread">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={() => pinMessage(message.id)} className={`p-1.5 hover:bg-muted rounded-md transition-colors ${message.pinned ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`} title={message.pinned ? "Unpin" : "Pin"}>
            <Pin className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="More">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
