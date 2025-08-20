import { WSMessage } from './types.js';

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
    this.token = token;
    this.url = url;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.createConnection();
    console.log(`WebSocket connecting to ${this.url}`);
  }

  private createConnection(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url, this.token);
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        console.log('Raw WebSocket event.data:', event.data);
        const message: any = JSON.parse(event.data);
        console.log('Parsed WebSocket message:', message);
        
        if (message.type === 'message') {
          this.emit(message.type, message);
        } else {
          this.emit(message.type, message.data || message);
        }
      } catch (error) {
        console.error('WS message parse error:', error);
        console.error('Raw data that failed to parse:', event.data);
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected', {});
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  private handleReconnect(): void {
    if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.shouldReconnect) {
          this.createConnection();
        }
      }, 2000 * this.reconnectAttempts);
    }
  }

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
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
}