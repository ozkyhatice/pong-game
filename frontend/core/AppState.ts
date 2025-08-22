interface ViewingUser {
  id: number;
  username: string;
  avatar?: string;
}

interface RoomInfo {
  roomId: string;
  players: number[];
  createdAt: number;
}

export class AppState {
  private static instance: AppState;
  private viewingUser: ViewingUser | null = null;
  private currentRoom: RoomInfo | null = null;

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
    } catch (error) {
      console.error('Failed to load from storage:', error);
      this.viewingUser = null;
      this.currentRoom = null;
    }
  }
}