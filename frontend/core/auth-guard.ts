import { notify } from './notify.js';
import { WebSocketManager } from './WebSocketManager.js';
import { OnlineUsersService } from '../services/OnlineUsersService.js';
import { XSSProtection } from './XSSProtection.js';

export class AuthGuard {
  public static isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    // Basic token validation (check if it looks like a valid token)
    const cleanToken = XSSProtection.cleanInput(token);
    return cleanToken.length > 0 && cleanToken === token;
  }

  public static getRedirectPage(requestedPage: string): string | null {
    const isAuth = this.isAuthenticated();
    
    if (isAuth) {
      if (requestedPage === 'login' || requestedPage === 'register' || requestedPage === 'landing') {
        return 'home';
      }
      return null;
    }
    
    if (!isAuth) {
      if (requestedPage !== 'landing' && requestedPage !== 'login' && requestedPage !== 'register' && requestedPage !== '2fa-code' && requestedPage !== 'game') {
        return 'landing';
      }
      return null;
    }

    return null;
  }

  public static checkAuth(pageName: string, router: any): void {
    const redirectPage = this.getRedirectPage(pageName);
    
    if (redirectPage) {
      if (!this.isAuthenticated() && pageName !== 'landing') {
        notify('Please login to access this page!');
      }
      router.navigate(redirectPage);
    }
    
    if (this.isAuthenticated()) {
      const wsManager = WebSocketManager.getInstance();
      if (!wsManager.isConnected()) {
        const token = localStorage.getItem('authToken');
        if (token) {
          const onlineUsersService = OnlineUsersService.getInstance();
          wsManager.on('connected', () => {
            onlineUsersService.initialize();
          });
          
          wsManager.connect(token);
        }
      }
    }
  }

  public static logout(): void {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('tempUserId');
    sessionStorage.removeItem('pendingOAuthUserId');

    const wsManager = WebSocketManager.getInstance();
    wsManager.disconnect();
    
    const onlineUsersService = OnlineUsersService.getInstance();
    onlineUsersService.destroy();
  }
}