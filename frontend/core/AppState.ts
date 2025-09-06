import { XSSProtection } from './XSSProtection';

interface ViewingUser {
  id: number;
  username: string;
  avatar?: string;
}

export interface RoomInfo {
  roomId: string;
  players: number[];
  createdAt: number;
  isMatchmaking?: boolean;
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
    // Sanitize user data before storing
    const sanitizedUser = {
      id: user.id,
      username: XSSProtection.cleanInput(user.username),
      avatar: user.avatar ? XSSProtection.cleanInput(user.avatar) : undefined
    };
    this.viewingUser = sanitizedUser;
    sessionStorage.setItem('viewingUser', JSON.stringify(sanitizedUser));
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
  }

  isInRoom(): boolean {
    return this.getCurrentRoom() !== null;
  }

  setCurrentTournament(tournamentInfo: TournamentInfo): void {
    this.currentTournament = {
      ...tournamentInfo,
      joinedAt: Date.now()
    };
    localStorage.setItem('currentTournament', JSON.stringify(this.currentTournament));
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
        const userData = JSON.parse(storedViewingUser);
        // Sanitize data loaded from storage
        this.viewingUser = XSSProtection.sanitizeJSON(userData);
      }

      const storedRoom = localStorage.getItem('currentRoom');
      if (storedRoom) {
        const roomData = JSON.parse(storedRoom);
        const now = Date.now();
        const roomAge = now - roomData.createdAt;
        if (roomAge < 24 * 60 * 60 * 1000) {
          this.currentRoom = XSSProtection.sanitizeJSON(roomData);
        } else {
          localStorage.removeItem('currentRoom');
        }
      }

      const storedTournament = localStorage.getItem('currentTournament');
      if (storedTournament) {
        const tournamentData = JSON.parse(storedTournament);
        const now = Date.now();
        const tournamentAge = now - tournamentData.joinedAt;
        if (tournamentAge < 24 * 60 * 60 * 1000) {
          this.currentTournament = XSSProtection.sanitizeJSON(tournamentData);
        } else {
          localStorage.removeItem('currentTournament');
        }
      }
    } catch (error) {
      this.viewingUser = null;
      this.currentRoom = null;
      this.currentTournament = null;
    }
  }
}