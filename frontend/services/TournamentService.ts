import { WebSocketManager } from "../core/WebSocketManager.js";

export class TournamentService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  // Aktif turnuvaya katılma
  joinTournament(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "join",
      data: { tournamentId },
    });
  }

  // Turnuvadan ayrılma
  leaveTournament(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "leave",
      data: { tournamentId },
    });
  }

  // Turnuva detaylarını getirme
  getTournamentDetails(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "get-details",
      data: { tournamentId },
    });
  }

  // Turnuva bracket'ini getirme
  getTournamentBracket(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "get-bracket",
      data: { tournamentId },
    });
  }

  // Turnuva eventlerini dinleme
  onTournamentPlayerJoined(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:playerJoined listener');
    this.wsManager.on("tournament:playerJoined", callback);
  }

  onTournamentPlayerLeft(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:playerLeft listener');
    this.wsManager.on("tournament:playerLeft", callback);
  }

  onTournamentStarted(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:tournamentStarted listener');
    this.wsManager.on("tournament:tournamentStarted", callback);
  }

  onTournamentMatchPairings(callback: (data: any) => void) {
    this.wsManager.on("tournament:matchPairingsRevealed", callback);
  }

  onTournamentMatchStarted(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:matchStarted listener');
    this.wsManager.on("tournament:matchStarted", callback);
  }

  onTournamentMatchCompleted(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:matchCompleted listener');
    this.wsManager.on("tournament:matchCompleted", callback);
  }

  onTournamentRoundCompleted(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:roundCompleted listener');
    this.wsManager.on("tournament:roundCompleted", callback);
  }

  onTournamentNextRound(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:nextRoundStarted listener');
    this.wsManager.on("tournament:nextRoundStarted", callback);
  }

  onTournamentEnded(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:tournamentEnded listener');
    this.wsManager.on("tournament:tournamentEnded", callback);
  }

  onNewTournamentCreated(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:newTournamentCreated listener');
    this.wsManager.on("tournament:newTournamentCreated", callback);
  }

  onTournamentDetails(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:details listener');
    this.wsManager.on("tournament:details", callback);
  }

  onTournamentBracket(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:bracket listener');
    this.wsManager.on("tournament:bracket", callback);
  }

  onPlayerDisconnected(callback: (data: any) => void) {
    console.log('🎯 Setting up tournament:playerDisconnected listener');
    this.wsManager.on("tournament:playerDisconnected", callback);
  }
}
