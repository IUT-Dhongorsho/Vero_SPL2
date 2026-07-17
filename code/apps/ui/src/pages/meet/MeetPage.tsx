import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  ScreenShare, StopCircle, MessageSquare, Users, 
  Settings, ArrowLeft, LayoutDashboard, FolderKanban, 
  CheckSquare, CalendarDays, Files, X 
} from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { toast } from '../../components/Providers/ToastProvider';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export const MeetPage: React.FC = () => {
  const { projectId, workspaceId, moduleId } = useParams();
  const navigate = useNavigate();
  const [meetingMode, setMeetingMode] = useState<'hub' | 'in-call'>('hub');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('Weekly Sync');
  const [scheduleDate, setScheduleDate] = useState('');
  const { sendMessage: sendChannelMessage, channels } = useChatStore();
  const user = useAuthStore(state => state.user);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      userId: 'user2',
      userName: 'John Smith',
      message: 'Hey everyone! Ready for the meeting?',
      timestamp: new Date(),
    },
    {
      id: '2',
      userId: 'user3',
      userName: 'Sarah Chen',
      message: 'Yes, let\'s go over the Q3 plans',
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'user1', name: 'Jane Doe (You)', avatar: 'JD', isMuted: false, isVideoOff: false, isSpeaking: true },
    { id: 'user2', name: 'John Smith', avatar: 'JS', isMuted: false, isVideoOff: false, isSpeaking: false },
    { id: 'user3', name: 'Sarah Chen', avatar: 'SC', isMuted: true, isVideoOff: false, isSpeaking: false },
    { id: 'user4', name: 'Mike Johnson', avatar: 'MJ', isMuted: false, isVideoOff: true, isSpeaking: false },
  ]);

  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <Files className="w-4 h-4" />, label: 'Files', href: '/files' },
  ];

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'Microphone unmuted' : 'Microphone muted');
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    toast.success(isVideoOff ? 'Camera turned on' : 'Camera turned off');
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    toast.success(isScreenSharing ? 'Screen sharing stopped' : 'Screen sharing started');
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setRecordingTime(0);
      toast.success('Recording started');
    } else {
      toast.success(`Recording saved: ${formatTime(recordingTime)}`);
    }
  };

  const endCall = () => {
    toast.success('Call ended');
    setMeetingMode('hub');
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        userId: 'user1',
        userName: 'Jane Doe',
        message: newMessage,
        timestamp: new Date(),
      },
    ]);
    setNewMessage('');
  };

  const createAutoNote = () => {
    toast.success('Meeting note created automatically');
    navigate(`/project/${projectId}/notes`);
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleStartInstant = () => {
    const activeChannel = channels.find(c => c.moduleId === moduleId) || channels[0];
    if (activeChannel) {
      sendChannelMessage(
        activeChannel.id,
        `🎥 I'm starting an instant meeting! Join here: ${window.location.origin}/workspace/${workspaceId}/project/${projectId}/module/${moduleId}/meet`,
        user?.id || 'u1'
      );
      toast.success("Meeting link sent to chat!");
    }
    setMeetingMode('in-call');
  };

  const handleSchedule = () => {
    if (!scheduleDate) return toast.error("Please select a date & time");
    const activeChannel = channels.find(c => c.moduleId === moduleId) || channels[0];
    if (activeChannel) {
      sendChannelMessage(
        activeChannel.id,
        `📅 Scheduled Meeting: **${scheduleTitle}** at ${new Date(scheduleDate).toLocaleString()}. Join here: ${window.location.origin}/workspace/${workspaceId}/project/${projectId}/module/${moduleId}/meet`,
        user?.id || 'u1'
      );
      toast.success("Meeting scheduled and notified in chat!");
      setShowScheduleModal(false);
    }
  };

  if (meetingMode === 'hub') {
    return (
      <PageContainer title="Meet" sidebarItems={sidebarItems} topBarActions={<ThemeToggle />}>
        <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-140px)]">
          <div className="bg-card border border-border shadow-sm rounded-2xl p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
               <Video className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Team Meetings</h2>
            <p className="text-muted-foreground mb-8">Start an instant meeting or schedule one for later. We'll automatically notify the team in the chat.</p>
            
            <div className="flex flex-col gap-4">
              <AnimatedButton variant="primary" size="lg" onClick={handleStartInstant} className="w-full justify-center">
                <Video className="w-5 h-5 mr-2" /> Start Instant Meeting
              </AnimatedButton>
              <AnimatedButton variant="outline" size="lg" onClick={() => setShowScheduleModal(true)} className="w-full justify-center">
                <CalendarDays className="w-5 h-5 mr-2" /> Schedule Meeting
              </AnimatedButton>
            </div>
          </div>
        </div>
        
        {/* Simple Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-border shadow-xl rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-foreground mb-4">Schedule Meeting</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Meeting Title</label>
                  <input type="text" value={scheduleTitle} onChange={e => setScheduleTitle(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date & Time</label>
                  <div className="relative">
                    <input 
                      type="datetime-local" 
                      value={scheduleDate} 
                      onChange={e => setScheduleDate(e.target.value)} 
                      onClick={e => 'showPicker' in HTMLInputElement.prototype && (e.target as HTMLInputElement).showPicker()}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]" 
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <AnimatedButton variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</AnimatedButton>
                <AnimatedButton variant="primary" onClick={handleSchedule}>Schedule</AnimatedButton>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Meeting Room"
      sidebarItems={sidebarItems}
      topBarActions={<ThemeToggle />}
    >
      <div className="h-[calc(100vh-100px)] flex gap-4">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 glass rounded-xl p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
              {/* Screen Share (if active) */}
              {isScreenSharing && (
                <div className="col-span-full bg-gray-900 rounded-xl flex items-center justify-center relative min-h-[300px]">
                  <div className="text-center">
                    <ScreenShare className="w-16 h-16 text-blue-400 mx-auto mb-3" />
                    <p className="text-white">Screen sharing in progress</p>
                    <p className="text-gray-400 text-sm">You are sharing your screen</p>
                  </div>
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Sharing
                  </div>
                </div>
              )}

              {/* Participant Videos */}
              {participants.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex flex-col items-center justify-center relative min-h-[200px] ${
                    participant.isSpeaking ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-3">
                    {participant.avatar}
                  </div>
                  <p className="text-white font-medium">{participant.name}</p>
                  <div className="flex gap-2 mt-2">
                    {participant.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                    {participant.isVideoOff && <VideoOff className="w-3 h-3 text-red-400" />}
                  </div>
                  {participant.isSpeaking && (
                    <div className="absolute bottom-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                  {participant.isMuted && (
                    <div className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-0.5 rounded-full">
                      Muted
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Call Controls */}
          <div className="glass rounded-xl p-4 flex justify-center gap-3">
            <AnimatedButton
              variant={isMuted ? "danger" : "outline"}
              size="md"
              onClick={toggleMute}
              className="flex flex-col items-center p-3"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-xs mt-1">{isMuted ? 'Unmute' : 'Mute'}</span>
            </AnimatedButton>

            <AnimatedButton
              variant={isVideoOff ? "danger" : "outline"}
              size="md"
              onClick={toggleVideo}
              className="flex flex-col items-center p-3"
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              <span className="text-xs mt-1">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
            </AnimatedButton>

            <AnimatedButton
              variant={isScreenSharing ? "primary" : "outline"}
              size="md"
              onClick={toggleScreenShare}
              className="flex flex-col items-center p-3"
            >
              <ScreenShare className="w-5 h-5" />
              <span className="text-xs mt-1">Share</span>
            </AnimatedButton>

            <AnimatedButton
              variant={isRecording ? "danger" : "outline"}
              size="md"
              onClick={toggleRecording}
              className="flex flex-col items-center p-3"
            >
              <div className="relative">
                <div className={`w-2 h-2 rounded-full absolute -top-1 -right-1 ${isRecording ? 'bg-red-500 animate-pulse' : ''}`} />
                <StopCircle className="w-5 h-5" />
              </div>
              <span className="text-xs mt-1">{isRecording ? formatTime(recordingTime) : 'Record'}</span>
            </AnimatedButton>

            <AnimatedButton
              variant="danger"
              size="md"
              onClick={endCall}
              className="flex flex-col items-center p-3"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-xs mt-1">Leave</span>
            </AnimatedButton>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 glass rounded-lg p-2 flex items-center justify-center gap-2"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-500">Recording</span>
              <span className="text-xs text-gray-500">{formatTime(recordingTime)}</span>
            </motion.div>
          )}
        </div>

        {/* Right Sidebar - Participants/Chat */}
        <div className="w-80 flex flex-col gap-4">
          {/* Tabs */}
          <div className="glass rounded-xl p-1 flex">
            <button
              onClick={() => {
                setShowParticipants(true);
                setShowChat(false);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                showParticipants ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Participants ({participants.length})
            </button>
            <button
              onClick={() => {
                setShowChat(true);
                setShowParticipants(false);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                showChat ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Chat
            </button>
          </div>

          {/* Participants List */}
          <AnimatePresence mode="wait">
            {showParticipants && (
              <motion.div
                key="participants"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 glass rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold">In Meeting ({participants.length})</h3>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto h-[calc(100%-60px)]">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/20">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            {participant.avatar}
                          </div>
                          {participant.isSpeaking && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{participant.name}</p>
                          <div className="flex gap-1">
                            {participant.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                            {participant.isVideoOff && <VideoOff className="w-3 h-3 text-red-400" />}
                          </div>
                        </div>
                      </div>
                      {participant.id === 'user1' && (
                        <span className="text-xs text-blue-500">You</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Chat Panel */}
            {showChat && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 glass rounded-xl overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold">Meeting Chat</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.userId === 'user1' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${msg.userId === 'user1' ? 'bg-blue-500 text-white' : 'glass'} rounded-lg p-2`}>
                        {msg.userId !== 'user1' && (
                          <p className="text-xs font-medium mb-1">{msg.userName}</p>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{formatMessageTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <AnimatedButton variant="primary" size="sm" onClick={sendMessage}>
                    Send
                  </AnimatedButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto Note Button */}
          <AnimatedButton variant="outline" onClick={createAutoNote} className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Auto-create Meeting Note
          </AnimatedButton>
        </div>
      </div>
    </PageContainer>
  );
};
