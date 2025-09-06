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
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };
    this.ws.onmessage = (event) => {
      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch (parseError) {
        return;
      }
      
      try {
        if (message.type === 'message') {
          this.emit(message.type, message);
        } else if (message.type === 'game') {

          if (message.event === 'room-state') {
            const currentPage = (window as any).router?.currentPage;
            if (currentPage !== 'remote-game') {
              setTimeout(() => {
                (window as any).router.navigate('remote-game');
              }, 100);
            }
          } else if (message.event === 'match-found') {
            const currentPage = (window as any).router?.currentPage;

            setTimeout(() => {
              (window as any).router.navigate('remote-game');
            }, 100);
          } else if (message.event === 'room-created') {
            const currentPage = (window as any).router?.currentPage;
            if (currentPage !== 'game-lobby') {
              setTimeout(() => {
                (window as any).router.navigate('game-lobby');
              }, 100);
            }
          } else if (message.event === 'game-over') {
            const currentPage = (window as any).router?.currentPage;
            
            if (message.data && message.data.isTournamentMatch && message.data.tournamentId) {
              if (currentPage !== 'tournament') {
                if (message.data) {
                  localStorage.setItem('lastTournamentMatchResult', JSON.stringify({
                    winner: message.data.winner,
                    finalScore: message.data.finalScore,
                    message: message.data.message,
                    round: message.data.round,
                    timestamp: Date.now()
                  }));
                }
                setTimeout(() => {
                  (window as any).router.navigate('tournament');
                }, 100);
              }
            } else {

              if (currentPage !== 'end-game' && currentPage !== 'home') {
                if (message.data) {
                  localStorage.setItem('gameResult', JSON.stringify(message.data));
                }
                setTimeout(() => {
                  (window as any).router.navigate('end-game');
                }, 100);
              }
            }
          } else if (message.event === 'all-ready') {
            const currentPage = (window as any).router?.currentPage;
            if (currentPage !== 'remote-game') {
              setTimeout(() => {
                (window as any).router.navigate('remote-game');
              }, 200);
            }
          }
          
          this.emit(message.type, message.data || message);
          if (message.event) {
            this.emit(message.event, message.data || message);
          }
        } else if (message.type === 'tournament') {
          this.emit(message.type, message.data || message);
          if (message.event) {
            this.emit(`tournament:${message.event}`, message.data || message);
          }
        } else if (message.type === 'navigation') {
          this.handleNavigation(message);
        } else {
          this.emit(message.type, message);
        }
      } catch (handlerError) {
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

  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
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
    
    if (!page) {
      return;
    }
    
    const currentPage = (window as any).router?.currentPage;
    if (currentPage === page) {
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
      notify('User is in room: ' + currentRoom?.roomId + ' - Redirecting to lobby', 'red');

      setTimeout(() => {
        (window as any).router.navigate('game-lobby');
      }, 500);
    }
  }
}