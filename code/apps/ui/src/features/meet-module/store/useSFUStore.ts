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

  toggleMic: () => {
    const { localStream, isMicOn } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
    }
    set({ isMicOn: !isMicOn });
  },

  toggleCam: () => {
    const { localStream, isCamOn } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !isCamOn);
    }
    set({ isCamOn: !isCamOn });
  },

  setConnectionState: (state) => set({ connectionState: state }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  
  clearState: () => set({
    localStream: null,
    peers: new Map(),
    isMicOn: false,
    isCamOn: false,
    connectionState: 'idle',
    errorMessage: null,
  }),
}));
