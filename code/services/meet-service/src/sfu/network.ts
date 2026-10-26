import os from 'os';
import dgram from 'dgram';
import { env } from '../config/env.js';

let cachedLanIp: string | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 10_000; // re-check every 10s if network switches

/**
 * Resolves the primary outbound LAN IP of this machine using standard OS routing.
 * Does not transmit packets; queries the routing table via UDP connect.
 */
export function getOutboundLanIp(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const socket = dgram.createSocket('udp4');
      socket.connect(53, '8.8.8.8', () => {
        try {
          const addr = socket.address().address;
          socket.close();
          resolve(addr);
        } catch {
          socket.close();
          resolve(null);
        }
      });
      socket.on('error', () => {
        socket.close();
        resolve(null);
      });
      setTimeout(() => {
        try {
          socket.close();
        } catch {}
        resolve(null);
      }, 300);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Scans local network interfaces for non-internal IPv4 addresses.
 * Prioritizes physical / Wi-Fi interfaces over virtual bridges (docker, veth, etc.).
 */
export function getInterfaceIps(): string[] {
  const interfaces = os.networkInterfaces();
  const physicalIps: string[] = [];
  const virtualIps: string[] = [];

  for (const [name, iface] of Object.entries(interfaces)) {
    if (!iface) continue;
    const isVirtual = /^(docker|br-|veth|vmnet|vboxnet|virbr|tailscale)/i.test(name);
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        if (!isVirtual) {
          physicalIps.push(info.address);
        } else {
          virtualIps.push(info.address);
        }
      }
    }
  }

  return [...physicalIps, ...virtualIps];
}

/**
 * Resolves the active LAN IP dynamically, refreshing if the machine
 * changes Wi-Fi networks or routers.
 */
export async function getActiveLanIp(): Promise<string> {
  const now = Date.now();
  if (cachedLanIp && now - lastCheckTime < CACHE_TTL_MS) {
    return cachedLanIp;
  }

  const outbound = await getOutboundLanIp();
  if (outbound && outbound !== '127.0.0.1') {
    cachedLanIp = outbound;
    lastCheckTime = now;
    return outbound;
  }

  const ifaces = getInterfaceIps();
  if (ifaces.length > 0) {
    cachedLanIp = ifaces[0];
    lastCheckTime = now;
    return cachedLanIp;
  }

  cachedLanIp = '127.0.0.1';
  lastCheckTime = now;
  return cachedLanIp;
}

/**
 * Builds the array of listenIps for mediasoup WebRtcTransport:
 * - Always includes 127.0.0.1 (lightning-fast loopback for same-host dev/desktop)
 * - Includes the dynamically auto-detected active LAN IP (for phones/laptops on same router)
 * - Includes any custom configured MEDIASOUP_ANNOUNCED_IP if valid and distinct
 */
export async function getTransportListenIps(): Promise<Array<{ ip: string; announcedIp: string }>> {
  const listenIps: Array<{ ip: string; announcedIp: string }> = [
    { ip: '0.0.0.0', announcedIp: '127.0.0.1' },
  ];

  const lanIp = await getActiveLanIp();
  if (lanIp && lanIp !== '127.0.0.1') {
    listenIps.push({ ip: '0.0.0.0', announcedIp: lanIp });
  }

  // If user configured a specific announced IP (e.g. public IP or domain), include it
  const configuredIp = env.MEDIASOUP_ANNOUNCED_IP;
  if (
    configuredIp &&
    configuredIp !== 'auto' &&
    configuredIp !== '127.0.0.1' &&
    configuredIp !== lanIp
  ) {
    listenIps.push({ ip: '0.0.0.0', announcedIp: configuredIp });
  }

  return listenIps;
}
