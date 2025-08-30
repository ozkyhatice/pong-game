interface ViewingUser {
  id: number;
  username: string;
  avatar?: string;
}

export interface RoomInfo {
  roomId: string;
  players: number[];
  createdAt: number;
}

export interface TournamentInfo {
  tournamentId: number;
  status: 'pending' | 'active' | 'completed';
  isParticipant: boolean;
  currentRound?: number;
  joinedAt: number;
}

export class AppState {
  private static instance: AppState;
  private viewingUser: ViewingUser | null = null;
  private currentRoom: RoomInfo | null = null;
  private currentTournament: TournamentInfo | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  setViewingUser(user: ViewingUser): void {
    this.viewingUser = user;
    sessionStorage.setItem('viewingUser', JSON.stringify(user));
  }

  getViewingUser(): ViewingUser | null {
    if (!this.viewingUser) {
      this.loadFromStorage();
    }
    return this.viewingUser;
  }

  clearViewingUser(): void {
    this.viewingUser = null;
    sessionStorage.removeItem('viewingUser');
  }

  setCurrentRoom(roomInfo: RoomInfo): void {
    this.currentRoom = {
      ...roomInfo,
      createdAt: Date.now()
    };
    localStorage.setItem('currentRoom', JSON.stringify(this.currentRoom));
    console.log('Room stored in AppState:', this.currentRoom);
  }

  getCurrentRoom(): RoomInfo | null {
    if (!this.currentRoom) {
      this.loadFromStorage();
    }
    return this.currentRoom;
  }

  clearCurrentRoom(): void {
    this.currentRoom = null;
    localStorage.removeItem('currentRoom');
    console.log('Room cleared from AppState');
  }

  isInRoom(): boolean {
    return this.getCurrentRoom() !== null;
  }

  // Tournament state management
  setCurrentTournament(tournamentInfo: TournamentInfo): void {
    this.currentTournament = {
      ...tournamentInfo,
      joinedAt: Date.now()
    };
    localStorage.setItem('currentTournament', JSON.stringify(this.currentTournament));
    console.log('Tournament stored in AppState:', this.currentTournament);
  }

  getCurrentTournament(): TournamentInfo | null {
    if (!this.currentTournament) {
      this.loadFromStorage();
    }
    return this.currentTournament;
  }

  clearCurrentTournament(): void {
    this.currentTournament = null;
    localStorage.removeItem('currentTournament');
    console.log('Tournament cleared from AppState');
  }

  isInTournament(): boolean {
    const tournament = this.getCurrentTournament();
    return tournament !== null && tournament.isParticipant && tournament.status !== 'completed';
  }

  updateTournamentStatus(status: 'pending' | 'active' | 'completed', round?: number): void {
    if (this.currentTournament) {
      this.currentTournament.status = status;
      if (round !== undefined) {
        this.currentTournament.currentRound = round;
      }
      localStorage.setItem('currentTournament', JSON.stringify(this.currentTournament));
    }
  }

  private loadFromStorage(): void {
    try {
      const storedViewingUser = sessionStorage.getItem('viewingUser');
      if (storedViewingUser) {
        this.viewingUser = JSON.parse(storedViewingUser);
      }

      const storedRoom = localStorage.getItem('currentRoom');
      if (storedRoom) {
        const roomData = JSON.parse(storedRoom);
        // Check if room is not too old (24 hours)
        const now = Date.now();
        const roomAge = now - roomData.createdAt;
        if (roomAge < 24 * 60 * 60 * 1000) { // 24 hours
          this.currentRoom = roomData;
          console.log('Room loaded from storage:', this.currentRoom);
        } else {
          // Remove expired room
          localStorage.removeItem('currentRoom');
          console.log('Expired room removed from storage');
        }
      }

      // Load tournament data
      const storedTournament = localStorage.getItem('currentTournament');
      if (storedTournament) {
        const tournamentData = JSON.parse(storedTournament);
        // Check if tournament is not too old (24 hours)
        const now = Date.now();
        const tournamentAge = now - tournamentData.joinedAt;
        if (tournamentAge < 24 * 60 * 60 * 1000) { // 24 hours
          this.currentTournament = tournamentData;
          console.log('Tournament loaded from storage:', this.currentTournament);
        } else {
          // Remove expired tournament
          localStorage.removeItem('currentTournament');
          console.log('Expired tournament removed from storage');
        }
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
      this.viewingUser = null;
      this.currentRoom = null;
      this.currentTournament = null;
    }
  }
}