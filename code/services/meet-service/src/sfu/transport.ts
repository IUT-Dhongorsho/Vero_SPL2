import type { types as mediasoupTypes } from 'mediasoup';
import { getTransportListenIps } from './network.js';

export async function createWebRtcTransport(
  router: mediasoupTypes.Router
): Promise<mediasoupTypes.WebRtcTransport> {
  const listenIps = await getTransportListenIps();

  const transport = await router.createWebRtcTransport({
    listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1_000_000,
  });

  transport.on('dtlsstatechange', (state) => {
    if (state === 'failed' || state === 'closed') {
      console.warn(`⚠️ [SFU:Transport] DTLS state → ${state} (id: ${transport.id})`);
    }
  });

  return transport;
}
