import type { types as mediasoupTypes } from 'mediasoup';

export interface Peer {
  id: string; // unique peer identifier (socket.id)
  userId: string;
  socketId: string;
  userName?: string;
  rtpCapabilities: mediasoupTypes.RtpCapabilities | null;
  sendTransport: mediasoupTypes.WebRtcTransport | null;
  recvTransport: mediasoupTypes.WebRtcTransport | null;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
}

export interface Room {
  id: string;
  router: mediasoupTypes.Router;
  peers: Map<string, Peer>; // keyed by peerId (socketId)
}
