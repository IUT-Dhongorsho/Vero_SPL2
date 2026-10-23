import { create } from 'zustand';

interface SFUState {
  localStream: MediaStream | null;
  peers: Map<string, MediaStream>;
  isMicOn: boolean;
  isCamOn: boolean;
  connectionState: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string | null;

  setLocalStream: (stream: MediaStream | null) => void;
  addPeerTrack: (userId: string, track: MediaStreamTrack) => void;
  removePeerTrack: (userId: string, track: MediaStreamTrack) => void;
  removePeer: (userId: string) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void;
  setErrorMessage: (msg: string | null) => void;
  clearState: () => void;
}

export const useSFUStore = create<SFUState>((set, get) => ({
  localStream: null,
  peers: new Map(),
  isMicOn: false,
  isCamOn: false,
  connectionState: 'idle',
  errorMessage: null,

  setLocalStream: (stream) => set({ localStream: stream }),
  
  addPeerTrack: (userId, track) => {
    set((state) => {
      const newPeers = new Map(state.peers);
      const oldStream = newPeers.get(userId) || new MediaStream();
      
      // Prevent adding duplicates
      if (!oldStream.getTracks().find(t => t.id === track.id)) {
        // Create a new stream reference so React's useEffect detects the change
        const newStream = new MediaStream([...oldStream.getTracks(), track]);
        newPeers.set(userId, newStream);
      }
      
      return { peers: newPeers };
    });
  },

  removePeerTrack: (userId, track) => {
    set((state) => {
      const newPeers = new Map(state.peers);
      const stream = newPeers.get(userId);
      if (stream) {
        stream.removeTrack(track);
        // If no tracks left, you might want to remove the peer, but we'll leave the empty stream 
        // to maintain the peer's UI tile if they are still connected.
      }
      return { peers: newPeers };
    });
  },

  removePeer: (userId) => {
    set((state) => {
      const newPeers = new Map(state.peers);
      newPeers.delete(userId);
      return { peers: newPeers };
    });
  },

  toggleMic: async () => {
    const { localStream, isMicOn } = get();
    if (isMicOn) {
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.stop();
          localStream.removeTrack(track);
        });
      }
      set({ isMicOn: false });
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = audioStream.getAudioTracks()[0];
        if (newTrack) {
          let updatedStream = localStream;
          if (!updatedStream) {
            updatedStream = new MediaStream([newTrack]);
          } else {
            updatedStream.addTrack(newTrack);
          }
          newTrack.onended = () => {
            get().toggleMic();
          };
          set({ localStream: new MediaStream(updatedStream.getTracks()), isMicOn: true });
        }
      } catch (err) {
        console.error('Failed to acquire audio track:', err);
      }
    }
  },

  toggleCam: async () => {
    const { localStream, isCamOn } = get();
    if (isCamOn) {
      // Turn camera OFF: stop all video tracks to detach hardware device
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.stop();
          localStream.removeTrack(track);
        });
      }
      set({ isCamOn: false });
    } else {
      // Turn camera ON: request camera device from navigator.mediaDevices
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const newTrack = videoStream.getVideoTracks()[0];
        if (newTrack) {
          let updatedStream = localStream;
          if (!updatedStream) {
            updatedStream = new MediaStream([newTrack]);
          } else {
            updatedStream.addTrack(newTrack);
          }
          newTrack.onended = () => {
            get().toggleCam();
          };
          set({ localStream: new MediaStream(updatedStream.getTracks()), isCamOn: true });
        }
      } catch (err) {
        console.error('Failed to acquire camera track:', err);
      }
    }
  },

  setConnectionState: (state) => set({ connectionState: state }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  
  clearState: () => {
    const { localStream } = get();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    set({
      localStream: null,
      peers: new Map(),
      isMicOn: false,
      isCamOn: false,
      connectionState: 'idle',
      errorMessage: null,
    });
  },
}));
