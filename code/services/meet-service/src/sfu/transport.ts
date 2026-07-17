import type { types as mediasoupTypes } from 'mediasoup';
import { env } from '../config/env.js';

export async function createWebRtcTransport(
  router: mediasoupTypes.Router
): Promise<mediasoupTypes.WebRtcTransport> {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: env.MEDIASOUP_ANNOUNCED_IP,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1_000_000,
    minimumAvailableOutgoingBitrate: 600_000,
    maxSctpMessageSize: 262_144,
  });

  transport.on('dtlsstatechange', (state) => {
    if (state === 'failed' || state === 'closed') {
      console.warn(`⚠️ [SFU:Transport] DTLS state → ${state} (id: ${transport.id})`);
    }
  });

  return transport;
}
