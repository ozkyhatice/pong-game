interface ViewingUser {
  id: number;
  username: string;
  avatar?: string;
}

export class AppState {
  private static instance: AppState;
  private viewingUser: ViewingUser | null = null;

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

  private loadFromStorage(): void {
    try {
      const stored = sessionStorage.getItem('viewingUser');
      if (stored) {
        this.viewingUser = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load viewing user from storage:', error);
      this.viewingUser = null;
    }
  }
}