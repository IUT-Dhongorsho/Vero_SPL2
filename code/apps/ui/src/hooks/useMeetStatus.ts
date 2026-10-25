import { useEffect, useState } from 'react';
import { meetService, type RoomStatus } from '../services/meetService';

/** Polls a module's meeting room so a call in progress shows up within seconds. */
export function useMeetStatus(moduleId: string | undefined) {
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);

  useEffect(() => {
    if (!moduleId) return;
    let isMounted = true;
    setRoomStatus(null);

    const check = async () => {
      try {
        const res = await meetService.getRoomStatus(moduleId);
        if (isMounted) setRoomStatus(res);
      } catch {
        // Meet service unreachable or no active room
      }
    };

    check();
    const interval = setInterval(check, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [moduleId]);

  const liveCount = roomStatus?.livePeerCount ?? 0;
  return { roomStatus, isLive: roomStatus?.status === 'active' && liveCount > 0, liveCount };
}
