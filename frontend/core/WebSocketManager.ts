import { WSMessage } from './types.js';
import { AppState } from './AppState.js';
import { notify } from './notify.js';
import { getWsUrl } from '../config.js';

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

  connect(token: string, url?: string): void {
    const wsUrl = url || getWsUrl();
    console.log('🔌 WS: Connecting to', wsUrl);
    this.token = token;
    this.url = wsUrl;
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
    };
    console.log('WebSocket connection established');
    this.ws.onmessage = (event) => {
      try {
        const message: any = JSON.parse(event.data);
        console.log('🔹 WS: Raw message received:', message);
        
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
          
          // If room-state message, redirect to remote-game
          if (message.event === 'room-state') {
            console.log('🎮 WS: Game state received, redirecting to remote-game');
            const currentPath = window.location.pathname;
            if (!currentPath.includes('remote-game')) {
              console.log(`🎮 WS: Current page is ${currentPath}, redirecting to remote-game`);
              setTimeout(() => {
                (window as any).router.navigate('remote-game');
              }, 100);
            }
          }
          
          // Emit both the general 'game' event and the specific event
          this.emit(message.type, message.data || message);
          if (message.event) {
            this.emit(message.event, message.data || message);
          }
        } else if (message.type === 'tournament') {
          console.log('🏆 WS: Tournament received ->', {
            event: message.event,
            data: message.data
          });
          // Emit both the general 'tournament' event and the specific event
          this.emit(message.type, message.data || message);
          if (message.event) {
            this.emit(`tournament:${message.event}`, message.data || message);
          }
        } else if (message.type === 'navigation') {
          console.log('🧭 WS: Navigation received ->', message);
          this.handleNavigation(message);
        } else {
          console.log('📡 WS: Other message type ->', message.type, 'content:', message);
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

  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      // Remove specific callback
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      // Remove all callbacks for event
      this.listeners.set(event, []);
    }
  }

  clearAllListeners(): void {
    this.listeners.clear();
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

  private handleNavigation(message: any): void {
    const { page, reason } = message;
    console.log(`🧭 WS: Navigation redirect to ${page} (reason: ${reason})`);
    
    if (!page) {
      console.log('❌ WS: Navigation page is undefined, skipping redirect');
      return;
    }
    
    setTimeout(() => {
      (window as any).router.navigate(page);
    }, 100);
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