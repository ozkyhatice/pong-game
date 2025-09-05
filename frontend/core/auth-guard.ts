import { notify } from './notify.js';
import { WebSocketManager } from './WebSocketManager.js';
import { OnlineUsersService } from '../services/OnlineUsersService.js';

export class AuthGuard {
  public static isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
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