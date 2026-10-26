import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useSFUStore } from '../store/useSFUStore';

interface MeetControlsProps {
  onLeave: () => void;
}

export const MeetControls: React.FC<MeetControlsProps> = ({ onLeave }) => {
  const { isMicOn, isCamOn, toggleMic, toggleCam } = useSFUStore();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-card/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-border text-foreground">
      
      <button 
        onClick={toggleMic}
        className={`p-3 rounded-full transition-all duration-300 ${
          isMicOn 
            ? 'bg-secondary hover:bg-muted text-foreground border border-border' 
            : 'bg-destructive hover:opacity-90 text-destructive-foreground shadow-[0_0_15px_rgba(220,38,38,0.4)]'
        }`}
        title={isMicOn ? "Turn off mic" : "Turn on mic"}
      >
        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      <button 
        onClick={toggleCam}
        className={`p-3 rounded-full transition-all duration-300 ${
          isCamOn 
            ? 'bg-secondary hover:bg-muted text-foreground border border-border' 
            : 'bg-destructive hover:opacity-90 text-destructive-foreground shadow-[0_0_15px_rgba(220,38,38,0.4)]'
        }`}
        title={isCamOn ? "Turn off camera" : "Turn on camera"}
      >
        {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
      </button>

      <div className="w-px h-8 bg-border mx-2" />

      <button 
        onClick={onLeave}
        className="px-6 py-2.5 bg-destructive hover:opacity-90 text-destructive-foreground font-semibold rounded-full flex items-center gap-2 transition-all duration-300 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
      >
        <PhoneOff size={18} />
        Leave
      </button>
      
    </div>
  );
};
