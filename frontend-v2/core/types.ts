export interface WSMessage {
  type: string;
  event?: string;
  data?: any;
  receiverId?: number;
  content?: string;
  senderId?: number;
}

export interface GameMessage extends WSMessage {
  type: 'game';
  event: 'join' | 'move' | 'start' | 'state' | 'score' | 'leave' | 'reconnect';
  data: {
    roomId?: string;
    y?: number;
    [key: string]: any;
  };
}

export interface ChatMessage extends WSMessage {
  type: 'chat' | 'message' | 'read';
  receiverId?: number;
  content?: string;
  senderId?: number;
}