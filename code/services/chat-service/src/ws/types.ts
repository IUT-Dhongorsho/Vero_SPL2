export enum SocketEvents {
  CONNECT = 'connection',
  DISCONNECT = 'disconnect',
  MESSAGE = 'message',
  TYPING = 'typing',
  RECEIPT = 'receipt',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ERROR = 'error',
}

export interface MessagePayload {
  channelId: string;
  content: string;
  type?: string;
}

export interface TypingPayload {
  channelId: string;
  isTyping: boolean;
}

export interface ReceiptPayload {
  messageId: string;
  channelId: string;
  status: 'delivered' | 'read';
}
