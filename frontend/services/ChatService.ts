import { WebSocketManager } from '../core/WebSocketManager.js';
import { ChatMessage } from '../core/types.js';
import { API_CONFIG, getApiUrl } from '../config.js';

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

  async getChatHistory(userId: number): Promise<ChatMessage[]> {
    try {
      const token = localStorage.getItem('authToken'); // Fix: use 'authToken' not 'token'
      if (!token) return [];

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT.HISTORY(userId.toString())), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  async markMessagesAsReadHTTP(userId: number): Promise<boolean> {
    try {
      const token = localStorage.getItem('authToken'); // Fix: use 'authToken' not 'token'
      if (!token) return false;

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT.MARK_READ(userId.toString())), {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  cleanup(): void {
    console.log('🧹 ChatService cleanup: Removing all event listeners');
    const chatEvents = ['message', 'onlineClients', 'delivered', 'read'];
    
    chatEvents.forEach(event => {
      this.wsManager.off(event);
    });
  }
}