import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../components/Layout/PageContainer';
import { useChatStore } from '../../stores/chat.store';
import { ChatWindow } from './ChatWindow';
import { MessageCircle } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { workspaceId, projectId, moduleId } = useParams();
  const navigate = useNavigate();
  const { 
    channels, 
    activeThreadMessageId 
  } = useChatStore();

  // For a simplified chat, we just use the first channel associated with this module, 
  // or default to a single global one if none exists.
  const activeChannel = channels.find(c => c.moduleId === moduleId) || channels[0];

  return (
    <PageContainer title="Chat">
      <div className="max-w-[1200px] mx-auto h-[calc(100vh-140px)] bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex relative">
        
        {/* Main Chat Area */}
        <div className="flex-1 flex min-w-0">
          {activeChannel ? (
            <ChatWindow channel={activeChannel} showThread={!!activeThreadMessageId} />
          ) : (
            <div className="m-auto text-center p-8">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                 <MessageCircle className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No active chat</h3>
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
};
