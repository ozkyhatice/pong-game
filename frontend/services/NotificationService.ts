import { WebSocketManager } from '../core/WebSocketManager.js';

export class NotificationService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  onConnected(callback: (data: any) => void): void {
    this.wsManager.on('connected', callback);
  }

  onDisconnected(callback: (data: any) => void): void {
    this.wsManager.on('disconnected', callback);
  }

  onError(callback: (data: any) => void): void {
    this.wsManager.on('error', callback);
  }

  onGameNotification(callback: (data: any) => void): void {
    this.wsManager.on('game', callback);
  }

  onChatNotification(callback: (data: any) => void): void {
    this.wsManager.on('chat', callback);
  }

  removeListener(event: string, callback: Function): void {
    this.wsManager.off(event, callback);
  }
}