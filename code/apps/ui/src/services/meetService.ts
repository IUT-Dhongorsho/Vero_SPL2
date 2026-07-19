import api from '../api/client';

export interface RoomStatus {
  roomId: string;
  status: 'active' | 'idle';
  livePeerCount: number;
  meeting: any;
}

export const meetService = {
  async getRoomStatus(roomId: string): Promise<RoomStatus> {
    const response = await api.get(`/meet/rooms/${roomId}`);
    return response.data;
  }
};
