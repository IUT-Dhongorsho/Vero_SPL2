import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send, X, Reply } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';

export const ChatComposer: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { sendMessage, setTyping, activeThreadMessageId, setActiveThread, messages } = useChatStore();
  const user = useAuthStore(state => state.user);
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const replyingToMessage = messages.find(m => m.id === activeThreadMessageId);

  const handleSend = () => {
    if (!content.trim()) return;
    
    sendMessage(channelId, content.trim(), user?.id || 'u1', undefined, activeThreadMessageId || undefined);
    setContent('');
    setActiveThread(null); // Clear reply state after sending
    setTyping(channelId, user?.name || 'You', false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Typing indicator logic
    setTyping(channelId, user?.name || 'You', true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(channelId, user?.name || 'You', false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(channelId, user?.name || 'You', false);
    };
  }, [channelId]);

  return (
    <div className={`flex flex-col border rounded-xl overflow-hidden transition-colors bg-card ${isFocused ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      {replyingToMessage && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2 truncate text-sm text-muted-foreground">
            <Reply className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{replyingToMessage.senderId}</span>
            <span className="truncate">{replyingToMessage.content}</span>
          </div>
          <button onClick={() => setActiveThread(null)} className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <textarea
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Type a message..."
        className="w-full bg-transparent resize-none p-3 max-h-40 min-h-[60px] focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
        rows={1}
      />
      <div className="flex items-center justify-between p-2 bg-muted/30">
        <div className="flex items-center gap-1">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Mock sending a file
                sendMessage(channelId, "Attached a file", user?.id || 'u1', {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: URL.createObjectURL(file)
                }, activeThreadMessageId || undefined);
                setActiveThread(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Attach file">
            <Paperclip className="w-4 h-4" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Emoji">
            <Smile className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={handleSend}
          disabled={!content.trim()}
          className="p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
