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

export interface MessageAttachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

export interface MessagePayload {
  channelId: string;
  content: string;
  /** text | file | image | action | system */
  type?: string;
  attachment?: MessageAttachment;
  replyToId?: string;
  /** Echoed back so the sender can reconcile its optimistic bubble. */
  clientId?: string;
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
