import { WebSocketManager } from '../core/WebSocketManager.js';
import { ChatMessage } from '../core/types.js';
import { API_CONFIG, getApiUrl } from '../config.js';
import { XSSProtection } from '../core/XSSProtection.js';

export class ChatService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  sendMessage(receiverId: number, content: string): void {
    // Sanitize message content before sending
    const cleanContent = XSSProtection.cleanInput(content, 2000);
    
    this.wsManager.send({
      type: 'message',
      receiverId,
      content: cleanContent
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
      const token = localStorage.getItem('authToken');
      if (!token) return [];

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT.HISTORY(userId.toString())), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return [];
      const rawData = await response.json();
      // Sanitize chat history data
      return XSSProtection.sanitizeJSON(rawData);
    } catch {
      return [];
    }
  }

  async markMessagesAsReadHTTP(userId: number): Promise<boolean> {
    try {
      const token = localStorage.getItem('authToken');
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
    const chatEvents = ['message', 'onlineClients', 'delivered', 'read'];
    
    chatEvents.forEach(event => {
      this.wsManager.off(event);
    });
  }
}