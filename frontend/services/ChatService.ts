import { WebSocketManager } from '../core/WebSocketManager.js';
import { ChatMessage } from '../core/types.js';

export class ChatService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  sendMessage(receiverId: number, content: string): void {
    this.wsManager.send({
      type: 'message',
      receiverId,
      content
    });
  }

  markMessagesAsRead(senderId?: number): void {
    this.wsManager.send({
      type: 'read',
      senderId
    });
  }

  onNewMessage(callback: (data: any) => void): void {
    this.wsManager.on('message', callback);
  }

  onOnlineClients(callback: (data: any) => void): void {
    this.wsManager.on('onlineClients', callback);
  }

  onDeliveryStatus(callback: (data: any) => void): void {
    this.wsManager.on('delivered', callback);
  }

  onReadStatus(callback: (data: any) => void): void {
    this.wsManager.on('read', callback);
  }

  removeListener(event: string, callback: Function): void {
    this.wsManager.off(event, callback);
  }
}