import { AuthGuard } from './auth-guard.js';
import { notify } from './notify.js';
import { WebSocketManager } from './WebSocketManager.js';
import { XSSProtection } from './XSSProtection.js';

class Router {
  private container: HTMLElement;
  public currentPage: string = '';
  private isNavigating: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupBrowserNavigation();
    
    const initialPage = this.getInitialPage();
    this.navigate(initialPage);
  }

  navigate(pageName: string): void {
    // Sanitize page name to prevent XSS
    const cleanPageName = XSSProtection.cleanInput(pageName);
    
    if (cleanPageName === this.currentPage) {
      return;
    }
    
    if (this.isNavigating) {
      return;
    }
    
    const redirectPage = AuthGuard.getRedirectPage(cleanPageName);
    if (redirectPage && redirectPage !== cleanPageName) {
      if (!AuthGuard.isAuthenticated() && cleanPageName !== 'landing' && cleanPageName !== 'game' && cleanPageName !== 'login' && cleanPageName !== 'register') {
        notify('Please login to access this page!');
      }
      return this.navigate(redirectPage);
    }
    
    this.isNavigating = true;
    
    window.history.pushState({ page: cleanPageName }, '', window.location.href);
    this.loadPage(cleanPageName);
  }

  loadPageDirect(pageName: string) {
    
    if (pageName === this.currentPage) return;
    
    if (this.isNavigating) {
      return;
    }
    
    this.isNavigating = true;
    
    window.history.replaceState({ page: pageName }, '', window.location.href);
    this.loadPage(pageName);
  }

  private setupBrowserNavigation() {
    window.addEventListener('popstate', (event) => {
      const page = event.state?.page || 'landing';
      
      const redirectPage = AuthGuard.getRedirectPage(page);
      if (redirectPage) {
        this.loadPageDirect(redirectPage);
      } else {
        this.loadPageDirect(page);
      }
    });

    if (!window.history.state || !window.history.state.page) {
      window.history.replaceState({ page: 'landing' }, '', window.location.href);
    }
  }

  private getInitialPage(): string {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('oauth') || urlParams.has('token') || urlParams.has('error')) {
      const error = urlParams.get('error');
      const oauth = urlParams.get('oauth');
      const token = urlParams.get('token');

      if (error === 'oauth_failed') return 'login';
      if (oauth === '2fa_required') return '2fa-code';
      if (oauth === 'success' && token) {
        localStorage.setItem('authToken', token);
        window.history.replaceState({}, '', window.location.pathname);
        return 'home';
      }
    }

    return window.history.state?.page || 'landing';
  }

  private async loadPage(pageName: string) {
    try {

      if (this.currentPage === 'landing' && pageName !== 'landing') {
        this.cleanupBabylonjs();
      }

      const response = await fetch(`./pages/${pageName}/${pageName}.html`);
      if (!response.ok) throw new Error(`Page not found: ${pageName}`);

      const html = await response.text();

      this.cleanupCurrentPage();
      
      
      this.container.innerHTML = html;


      const module = await import(`../pages/${pageName}/${pageName}.js`);
      if (module.init) module.init();

      this.currentPage = pageName;
      
      this.isNavigating = false;
      
    } catch (error) {
      this.isNavigating = false;
      this.showError(pageName, error);
    }
  }

  private showError(pageName: string, error: any) {
    this.container.innerHTML = `
      <div class="flex bg-radial-bg items-center justify-center h-screen">
        <div class="text-center p-6 bg-console-bg rounded-lg shadow border-2 border-neon-green">
          <h1 class="text-3xl font-bold text-neon-red mb-2">PAGE LOAD ERROR</h1>
          <p class="text-neon-white mb-4">FAILED TO LOAD: ${pageName}</p>
          <button onclick="router.navigate('landing')" class="nav-btn flex-1 bg-console-bg bg-opacity-60 border border-neon-blue border-opacity-40 text-neon-blue text-opacity-80 px-2 sm:px-3 py-2 text-[10px] sm:text-xs tracking-wide cursor-pointer rounded-sm">
            GO TO LANDING
          </button>
        </div>
      </div>
    `;
  }

  private cleanupCurrentPage() {
    if (this.currentPage === 'home') {
      import('../pages/home/home.js').then(module => {
        if ((module as any).cleanup) {
          (module as any).cleanup();
        }
      }).catch(() => {
      });
    }

    if (this.currentPage === 'remote-game') {
      import('../pages/remote-game/remote-game.js').then(module => {
        if ((module as any).cleanup) {
          (module as any).cleanup();
        }
      }).catch(() => {
      });
    }

    if (this.currentPage === 'game-lobby') {
      import('../pages/game-lobby/game-lobby.js').then(module => {
        if ((module as any).cleanup) {
          (module as any).cleanup();
        }
      }).catch(() => {
      });
    }

    if (this.currentPage === 'tournament') {
      import('../pages/tournament/tournament.js').then(module => {
        if ((module as any).cleanup) {
          (module as any).cleanup();
        }
      }).catch(() => {
      });
    }

    const allEventElements = this.container.querySelectorAll('[data-event-listener]');
    allEventElements.forEach(element => {
      element.removeAttribute('data-event-listener');
    });

    const wsManager = WebSocketManager.getInstance();
    wsManager.clearAllListeners();

    try {
      import('../services/GameService.js').then(module => {
        const gameService = new module.GameService();
        if (gameService.cleanup) gameService.cleanup();
      }).catch(() => {});

      import('../services/ChatService.js').then(module => {
        const chatService = new module.ChatService();
        if (chatService.cleanup) chatService.cleanup();
      }).catch(() => {});

      import('../services/TournamentService.js').then(module => {
        const tournamentService = new module.TournamentService();
        if (tournamentService.cleanup) tournamentService.cleanup();
      }).catch(() => {});
    } catch (e) {
    }

    if (this.currentPage === 'landing') {
      this.cleanupBabylonjs();
    }
  }

  private cleanupBabylonjs() {
    if (typeof (window as any).closeBabylonGame === 'function') {
      try {
        (window as any).closeBabylonGame();
      } catch (e) {
      }
    }

    const babylonCanvas = document.getElementById('babylon-canvas');
    if (babylonCanvas && babylonCanvas.parentNode) {
      babylonCanvas.parentNode.removeChild(babylonCanvas);
    }

    document.body.style.background = '';
    document.documentElement.style.background = '';
  }
}

export { Router };
