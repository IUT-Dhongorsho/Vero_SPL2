import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth'; // Assumes a global useAuth exists, adjust as needed
import { useMeetSocket } from '../hooks/useMeetSocket';
import { useMediasoup } from '../hooks/useMediasoup';
import { useSFUStore } from '../store/useSFUStore';
import { VideoTile } from './VideoTile';
import { MeetControls } from './MeetControls';
import { Loader2 } from 'lucide-react';

interface MeetRoomProps {
  moduleId: string;
}

export const MeetRoom: React.FC<MeetRoomProps> = ({ moduleId }) => {
  const { session } = useAuth(); // or grab token from Zustand store
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  
  const { 
    localStream, 
    setLocalStream, 
    peers, 
    connectionState, 
    clearState 
  } = useSFUStore();

  // 1. Get Camera/Mic permissions first
  useEffect(() => {
    async function getMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        // Disable tracks by default (muted)
        stream.getAudioTracks().forEach(t => t.enabled = false);
        stream.getVideoTracks().forEach(t => t.enabled = false);
        
        setLocalStream(stream);
        setHasPermissions(true);
      } catch (err: any) {
        setPermissionError('Could not access camera or microphone. Please check your permissions.');
        console.error(err);
      }
    }
    getMedia();

    return () => {
      clearState();
      // Stop local tracks on unmount
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Initialize Socket and Mediasoup once permissions are granted
  const token = session?.token || ''; // Use your actual auth token here
  const socketRef = useMeetSocket(hasPermissions ? token : '', moduleId);
  useMediasoup(socketRef, hasPermissions ? moduleId : '');

  const handleLeave = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    clearState();
    // In a real app, you'd navigate back to the module page or dashboard here
    window.history.back();
  };

  if (permissionError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-white p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center max-w-md">
          <h3 className="font-semibold text-lg mb-2">Permission Denied</h3>
          <p>{permissionError}</p>
        </div>
      </div>
    );
  }

  if (!hasPermissions || connectionState === 'connecting') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-white">
        <Loader2 className="animate-spin mb-4 text-indigo-500" size={48} />
        <h2 className="text-xl font-medium tracking-tight">
          {!hasPermissions ? 'Requesting Camera...' : 'Joining Room...'}
        </h2>
      </div>
    );
  }

  // Calculate dynamic grid columns based on number of participants (local + remote)
  const totalParticipants = 1 + peers.size;
  let gridClass = "grid-cols-1 md:grid-cols-2"; // default 2-4 people
  if (totalParticipants === 1) gridClass = "grid-cols-1";
  else if (totalParticipants > 4) gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  else if (totalParticipants > 9) gridClass = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="relative w-full h-full bg-gray-950 p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className={`grid ${gridClass} gap-4 w-full h-full max-h-[85vh] auto-rows-fr`}>
        
        {/* Local Video */}
        <VideoTile 
          stream={localStream} 
          isLocal={true} 
          muted={true} // Always mute local video so you don't hear yourself
          name="You" 
        />
        
        {/* Remote Peers */}
        {Array.from(peers.entries()).map(([userId, stream]) => (
          <VideoTile 
            key={userId} 
            stream={stream} 
            name={`User ${userId.slice(0,4)}`} // In a real app, map userId to actual name
          />
        ))}

      </div>

      <MeetControls onLeave={handleLeave} />
    </div>
  );
};
