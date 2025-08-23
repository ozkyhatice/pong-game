import { notify } from './notify.js';
import { WebSocketManager } from './WebSocketManager.js';

export class AuthGuard {
  public static isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  public static getRedirectPage(requestedPage: string): string | null {
    const isAuth = this.isAuthenticated();
    
    // Auth token varsa
    if (isAuth) {
      if (requestedPage === 'login' || requestedPage === 'register' || requestedPage === 'landing') {
        return 'home'; // Authenticated user'ları home'a yönlendir
      }
      return null; // Diğer sayfalar için yönlendirme yok
    }
    
    // Auth token yoksa
    if (!isAuth) {
      if (requestedPage !== 'landing' && requestedPage !== 'login' && requestedPage !== 'register' && requestedPage !== '2fa-code') {
        return 'landing'; // Unauthenticated user'ları landing'e yönlendir
      }
      return null; // Public sayfalar için yönlendirme yok
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
  }

  public static logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('tempUserId');
    sessionStorage.removeItem('pendingOAuthUserId');

    const wsManager = WebSocketManager.getInstance();
    wsManager.disconnect();

  }
}