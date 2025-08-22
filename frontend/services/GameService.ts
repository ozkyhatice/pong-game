import { WebSocketManager } from '../core/WebSocketManager.js';
import { GameMessage } from '../core/types.js';

export class GameService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  joinGame(roomId?: string): void {
    this.send('join', { roomId: roomId || null });
  }

  startGame(roomId: string): void {
    this.send('start', { roomId });
  }

  leaveGame(roomId: string): void {
    this.send('leave', { roomId });
  }

  setPlayerReady(roomId: string): void {
    this.send('ready', { roomId });
  }

  movePlayer(roomId: string, y: number): void {
    this.send('move', { roomId, y });
  }

  requestGameState(roomId: string): void {
    this.send('state', { roomId });
  }

  scorePoint(roomId: string): void {
    this.send('score', { roomId });
  }

  reconnectToGame(): void {
    this.send('reconnect', {});
  }

  sendGameInvite(receiverId: number, senderUsername: string): void {
    this.send('game-invite', {
      receiverId,
      senderUsername
    });
  }

  acceptGameInvite(senderId: number): void {
    this.send('invite-accepted', {
      senderId
    });
  }

  onRoomCreated(callback: (data: any) => void): void {
    this.wsManager.on('room-created', callback);
  }

  onPlayerJoined(callback: (data: any) => void): void {
    this.wsManager.on('joined', callback);
  }

  onGameStarted(callback: (data: any) => void): void {
    this.wsManager.on('game-started', callback);
  }

  onStateUpdate(callback: (data: any) => void): void {
    this.wsManager.on('state-update', callback);
  }

  onRoomState(callback: (data: any) => void): void {
    this.wsManager.on('room-state', callback);
  }

  onPlayerReconnected(callback: (data: any) => void): void {
    this.wsManager.on('reconnected', callback);
  }

  onGameError(callback: (data: any) => void): void {
    this.wsManager.on('error', callback);
  }

  onGameInvite(callback: (data: any) => void): void {
    this.wsManager.on('game-invite', callback);
  }

  onInviteAccepted(callback: (data: any) => void): void {
    this.wsManager.on('invite-accepted', callback);
  }

  onPlayerLeft(callback: (data: any) => void): void {
    this.wsManager.on('player left', callback);
  }

  onPlayerReady(callback: (data: any) => void): void {
    this.wsManager.on('player-ready', callback);
  }

  onAllReady(callback: (data: any) => void): void {
    this.wsManager.on('all-ready', callback);
  }

  removeListener(event: string, callback: Function): void {
    this.wsManager.off(event, callback);
  }

  private send(event: GameMessage['event'], data: any = {}): void {
    this.wsManager.send({ 
      type: 'game', 
      event, 
      data 
    });
  }
}