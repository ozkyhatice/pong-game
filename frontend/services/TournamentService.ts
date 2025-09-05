import { WebSocketManager } from "../core/WebSocketManager.js";

export class TournamentService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  joinTournament(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "join",
      data: { tournamentId },
    });
  }

  leaveTournament(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "leave",
      data: { tournamentId },
    });
  }

  getTournamentDetails(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "get-details",
      data: { tournamentId },
    });
  }

  getTournamentBracket(tournamentId?: number) {
    this.wsManager.send({
      type: "tournament",
      event: "get-bracket",
      data: { tournamentId },
    });
  }

  onTournamentPlayerJoined(callback: (data: any) => void) {
    this.wsManager.on("tournament:playerJoined", callback);
  }

  onTournamentPlayerLeft(callback: (data: any) => void) {
    this.wsManager.on("tournament:playerLeft", callback);
  }

  onTournamentStarted(callback: (data: any) => void) {
    this.wsManager.on("tournament:tournamentStarted", callback);
  }

  onTournamentMatchPairings(callback: (data: any) => void) {
    this.wsManager.on("tournament:matchPairingsRevealed", callback);
  }

  onTournamentMatchStarted(callback: (data: any) => void) {
    this.wsManager.on("tournament:matchStarted", callback);
  }

  onTournamentMatchCompleted(callback: (data: any) => void) {
    this.wsManager.on("tournament:matchCompleted", callback);
  }

  onTournamentRoundCompleted(callback: (data: any) => void) {
    this.wsManager.on("tournament:roundCompleted", callback);
  }

  onTournamentNextRound(callback: (data: any) => void) {
    this.wsManager.on("tournament:nextRoundStarted", callback);
  }

  onTournamentEnded(callback: (data: any) => void) {
    this.wsManager.on("tournament:tournamentEnded", callback);
  }

  onNewTournamentCreated(callback: (data: any) => void) {
    this.wsManager.on("tournament:newTournamentCreated", callback);
  }

  onTournamentDetails(callback: (data: any) => void) {
    this.wsManager.on("tournament:details", callback);
  }

  onTournamentBracket(callback: (data: any) => void) {
    this.wsManager.on("tournament:bracket", callback);
  }

  cleanup(): void {
    const tournamentEvents = [
      'tournament:playerJoined', 'tournament:playerLeft', 'tournament:tournamentStarted',
      'tournament:matchPairingsRevealed', 'tournament:matchStarted', 'tournament:matchCompleted',
      'tournament:roundCompleted', 'tournament:nextRoundStarted', 'tournament:tournamentEnded',
      'tournament:newTournamentCreated', 'tournament:details', 'tournament:bracket',
      'tournament',
    ];
    
    tournamentEvents.forEach(event => {
      this.wsManager.off(event);
    });
  }

  onPlayerDisconnected(callback: (data: any) => void) {
    this.wsManager.on("tournament:playerDisconnected", callback);
  }
}
