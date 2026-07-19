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
      <div className="flex items-center justify-center bg-gray-800 rounded-xl w-full h-full aspect-video shadow-md overflow-hidden">
        <span className="text-gray-400 font-medium">Loading...</span>
      </div>
    );
  }

  // Check if video track exists. For remote streams, we shouldn't check .enabled 
  // because it doesn't automatically sync over WebRTC when the remote peer toggles it.
  const hasVideo = stream.getVideoTracks().length > 0;

  return (
    <div className="relative bg-gray-900 rounded-xl w-full h-full aspect-video overflow-hidden shadow-lg group">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-800">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-xl text-white font-bold shadow-md">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      )}
      
      {name && (
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-md text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {name} {isLocal && '(You)'}
        </div>
      )}
    </div>
  );
};
