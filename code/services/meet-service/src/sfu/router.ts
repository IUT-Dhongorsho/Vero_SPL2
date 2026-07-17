import type { types as mediasoupTypes } from 'mediasoup';

const mediaCodecs: mediasoupTypes.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
];

export async function createRouter(
  worker: mediasoupTypes.Worker
): Promise<mediasoupTypes.Router> {
  const router = await worker.createRouter({ mediaCodecs });
  console.log(`✅ [SFU:Router] Router created on Worker PID ${worker.pid}`);
  return router;
}
