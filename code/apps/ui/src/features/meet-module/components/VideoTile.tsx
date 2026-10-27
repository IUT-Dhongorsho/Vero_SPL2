import React, { useEffect, useRef } from 'react';

interface VideoTileProps {
  stream: MediaStream | null;
  muted?: boolean;
  name?: string;
  isLocal?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({ stream, muted = false, name, isLocal = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      // Prevents flickering by only assigning if different
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="flex items-center justify-center bg-muted border border-border rounded-xl w-full h-full aspect-video shadow-md overflow-hidden">
        <span className="text-muted-foreground font-medium">Loading...</span>
      </div>
    );
  }

  // Check if video track exists. For remote streams, we shouldn't check .enabled 
  // because it doesn't automatically sync over WebRTC when the remote peer toggles it.
  const hasVideo = stream.getVideoTracks().length > 0;

  return (
    <div className="relative bg-card border border-border rounded-xl w-full h-full aspect-video overflow-hidden shadow-lg group">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-muted">
          <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xl font-bold shadow-md">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      )}
      
      {name && (
        <div className="absolute bottom-3 left-3 bg-card dark:bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg text-foreground dark:text-white text-sm font-medium border border-border dark:border-white/15 shadow-sm">
          {name} {isLocal && '(You)'}
        </div>
      )}
    </div>
  );
};
