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
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id': 0,
      'x-google-start-bitrate': 1000,
    },
  },
  {
    // H264 Baseline — universally supported by Android hardware decoders
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f', // Baseline Level 3.1
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
  {
    // H264 High — for desktop browsers
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032', // Main Level 5.0
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
