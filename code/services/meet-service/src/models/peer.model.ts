import type { types as mediasoupTypes } from 'mediasoup';

export interface Peer {
  userId: string;
  socketId: string;
  rtpCapabilities: mediasoupTypes.RtpCapabilities | null;
  sendTransport: mediasoupTypes.WebRtcTransport | null;
  recvTransport: mediasoupTypes.WebRtcTransport | null;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
}

export interface Room {
  id: string;
  router: mediasoupTypes.Router;
  peers: Map<string, Peer>;
}
