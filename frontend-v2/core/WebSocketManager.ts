import { WSMessage } from './types.js';
import { AppState } from './AppState.js';
import { notify } from './notify.js';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private shouldReconnect = true;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect(token: string, url: string = 'ws://localhost:3000/ws'): void {
    console.log('🔌 WS: Connecting to', url);
    this.token = token;
    this.url = url;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  private createConnection(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url, this.token);
    
    this.ws.onopen = () => {
      console.log('🟢 WS: Connected');
      this.reconnectAttempts = 0;
      this.emit('connected', {});
      
      // Check if user is in a room and redirect to lobby
      this.checkRoomAndRedirect();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: any = JSON.parse(event.data);
        
        if (message.type === 'message') {
          console.log('📨 WS: Chat received ->', {
            from: message.from,
            to: message.to, 
            content: message.content,
            id: message.id
          });
          this.emit(message.type, message);
        } else if (message.type === 'game') {
          console.log('🎮 WS: Game received ->', {
            event: message.event,
            data: message.data
          });
          this.emit(message.type, message);
        } else {
          console.log('📡 WS:', message.type, message.data || message);
          this.emit(message.type, message);
        }
      } catch (error) {
        console.error('❌ WS: Parse error:', event.data);
      }
    };

    this.ws.onclose = () => {
      console.log('🔴 WS: Disconnected');
      this.emit('disconnected', {});
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('❌ WS: Error:', error);
      this.emit('error', error);
    };
  }

  private handleReconnect(): void {
    if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 WS: Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        if (this.shouldReconnect) {
          this.createConnection();
        }
      }, 2000 * this.reconnectAttempts);
    }
  }

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (message.type === 'message') {
        console.log('📤 WS: Chat sending ->', {
          to: message.receiverId,
          content: message.content
        });
      } else if (message.type === 'game') {
        console.log('📤 WS: Game sending ->', {
          event: message.event,
          data: message.data
        });
      } else {
        console.log('📤 WS:', message.type, message);
      }
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WS: Not connected, message dropped');
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect(): void {
    console.log('🔌 WS: Disconnecting');
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private checkRoomAndRedirect(): void {
    const appState = AppState.getInstance();
    
    if (appState.isInRoom()) {
      const currentRoom = appState.getCurrentRoom();
      console.log('🏠 User is in room:', currentRoom?.roomId, '- Redirecting to lobby');
      notify('User is in room: ' + currentRoom?.roomId + ' - Redirecting to lobby', 'red');

      setTimeout(() => {
        (window as any).router.navigate('game-lobby');
      }, 500);
    }
  }
}