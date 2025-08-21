export interface WSMessage {
  type: string;
  event?: string;
  data?: any;
  receiverId?: number;
  content?: string;
  senderId?: number;
  senderUsername?: string;
}

export interface GameMessage extends WSMessage {
  type: 'game';
  event: 'join' | 'move' | 'start' | 'state' | 'score' | 'leave' | 'reconnect' | 'game-invite' | 'invite-accepted';
  data: {
    roomId?: string;
    y?: number;
    receiverId?: number;
    senderUsername?: string;
    senderId?: number;
    acceptedBy?: number;
    [key: string]: any;
  };
}

export interface ChatMessage extends WSMessage {
  type: 'chat' | 'message' | 'read';
  receiverId?: number;
  content?: string;
  senderId?: number;
}