import type { types as mediasoupTypes } from 'mediasoup';

export async function createConsumer(
  router: mediasoupTypes.Router,
  recvTransport: mediasoupTypes.WebRtcTransport,
  producer: mediasoupTypes.Producer,
  rtpCapabilities: mediasoupTypes.RtpCapabilities
): Promise<mediasoupTypes.Consumer | null> {
  if (producer.closed) {
    console.warn(`[SFU:Consumer] Producer ${producer.id} is already closed`);
    return null;
  }

  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    console.warn(
      `[SFU:Consumer] Cannot consume producer ${producer.id} — codec mismatch or device not capable`
    );
    return null;
  }

  const consumer = await recvTransport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true,
  });

  return consumer;
}
