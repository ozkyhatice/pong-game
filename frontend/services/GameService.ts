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
    this.send('game-invite', { receiverId, senderUsername });
  }

  acceptGameInvite(senderId: number): void {
    this.send('invite-accepted', { senderId });
  }

  // Matchmaking methods
  joinMatchmakingQueue(): void {
    console.log('🎮 GAMESERVICE: Sending matchmaking-join-queue event...');
    this.send('matchmaking-join-queue', {});
  }

  leaveMatchmakingQueue(): void {
    console.log('🎮 GAMESERVICE: Sending matchmaking-leave-queue event...');
    this.send('matchmaking-leave-queue', {});
  }

  cancelMatchmaking(): void {
    this.send('matchmaking-cancel', {});
  }

  getMatchmakingStatus(): void {
    this.send('matchmaking-status', {});
  }

  isConnected(): boolean {
    return this.wsManager.isConnected();
  }

  onRoomCreated(callback: (data: any) => void): void { this.wsManager.on('room-created', callback); }
  onPlayerJoined(callback: (data: any) => void): void { this.wsManager.on('joined', callback); }
  onGameStarted(callback: (data: any) => void): void { this.wsManager.on('game-started', callback); }
  onStateUpdate(callback: (data: any) => void): void { this.wsManager.on('state-update', callback); }
  onGameError(callback: (data: any) => void): void { this.wsManager.on('error', callback); }
  onGameInvite(callback: (data: any) => void): void { this.wsManager.on('game-invite', callback); }
  onInviteAccepted(callback: (data: any) => void): void { this.wsManager.on('invite-accepted', callback); }
  onPlayerLeft(callback: (data: any) => void): void { this.wsManager.on('player left', callback); }
  onPlayerReady(callback: (data: any) => void): void { this.wsManager.on('player-ready', callback); }
  onAllReady(callback: (data: any) => void): void { this.wsManager.on('all-ready', callback); }
  onGameOver(callback: (data: any) => void): void { this.wsManager.on('game-over', callback); }
  onGamePaused(callback: (data: any) => void): void { this.wsManager.on('paused', callback); }
  onGameResumed(callback: (data: any) => void): void { this.wsManager.on('resumed', callback); }
  onPlayerReconnected(callback: (data: any) => void): void { this.wsManager.on('reconnected', callback); }

  // Matchmaking event listeners
  onMatchmakingJoined(callback: (data: any) => void): void { this.wsManager.on('matchmaking-joined', callback); }
  onMatchmakingLeft(callback: (data: any) => void): void { this.wsManager.on('matchmaking-left', callback); }
  onMatchmakingStatus(callback: (data: any) => void): void { this.wsManager.on('matchmaking-status', callback); }
  onMatchFound(callback: (data: any) => void): void { this.wsManager.on('match-found', callback); }

  private send(event: GameMessage['event'], data: any = {}): void {
    this.wsManager.send({ type: 'game', event, data });
  }
}