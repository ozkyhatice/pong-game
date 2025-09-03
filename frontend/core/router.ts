import { AuthGuard } from './auth-guard.js';
import { notify } from './notify.js';
import { WebSocketManager } from './WebSocketManager.js';

class Router {
  private container: HTMLElement;
  public currentPage: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupBrowserNavigation();
    
    const initialPage = this.getInitialPage();
    this.navigate(initialPage);
  }

  navigate(pageName: string): void {
    console.log(`Navigating to: ${pageName}`);
    
    // Sayfa değişikliği gerekli mi?
    if (pageName === this.currentPage) return;
    
    // Auth kontrolü ve yönlendirme
    const redirectPage = AuthGuard.getRedirectPage(pageName);
    if (redirectPage && redirectPage !== pageName) {
      // Sadece gerçekten login gereken sayfalar için hata mesajı göster
      if (!AuthGuard.isAuthenticated() && pageName !== 'landing' && pageName !== 'game' && pageName !== 'login' && pageName !== 'register') {
        notify('Please login to access this page!');
      }
      return this.navigate(redirectPage);
    }
    
    // History state güncelle (URL değişmeden)
    window.history.pushState({ page: pageName }, '', window.location.href);
    this.loadPage(pageName);
  }

  // AuthGuard için direct page load (auth kontrolü olmadan)
  loadPageDirect(pageName: string) {
    console.log(`Direct loading page: ${pageName}`);
    
    if (pageName === this.currentPage) return;
    
    window.history.replaceState({ page: pageName }, '', window.location.href);
    this.loadPage(pageName);
  }

  private setupBrowserNavigation() {
    window.addEventListener('popstate', (event) => {
      const page = event.state?.page || 'landing';
      
      // Auth kontrolü ile yönlendirme
      const redirectPage = AuthGuard.getRedirectPage(page);
      if (redirectPage) {
        this.loadPageDirect(redirectPage);
      } else {
        this.loadPageDirect(page);
      }
    });

    // Initial state set
    if (!window.history.state || !window.history.state.page) {
      window.history.replaceState({ page: 'landing' }, '', window.location.href);
    }
  }

  private getInitialPage(): string {
    // OAuth params kontrolü
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('oauth') || urlParams.has('token') || urlParams.has('error')) {
      const error = urlParams.get('error');
      const oauth = urlParams.get('oauth');
      const token = urlParams.get('token');

      if (error === 'oauth_failed') return 'login';
      if (oauth === '2fa_required') return '2fa-code';
      if (oauth === 'success' && token) {
        // OAuth success durumunda token'ı localStorage'a kaydet
        localStorage.setItem('authToken', token);
        // URL'den parametreleri temizle
        window.history.replaceState({}, '', window.location.pathname);
        return 'home';
      }
    }

    // History state'den sayfa al veya default landing
    return window.history.state?.page || 'landing';
  }

  private async loadPage(pageName: string) {
    try {
      console.log(`Loading page: ${pageName}`);

      // Babylon.js cleanup
      if (this.currentPage === 'landing' && pageName !== 'landing') {
        this.cleanupBabylonjs();
      }

      // Sayfa dosyasını yükle
      const response = await fetch(`./pages/${pageName}/${pageName}.html`);
      if (!response.ok) throw new Error(`Page not found: ${pageName}`);

      const html = await response.text();

      // Clean up existing event listeners and components
      this.cleanupCurrentPage();
      
      // Container'ı temizle ve yeni içeriği ekle
      this.container.innerHTML = html;

      // Sayfa scriptini yükle ve çalıştır
      const module = await import(`../pages/${pageName}/${pageName}.js`);
      if (module.init) module.init();

      this.currentPage = pageName;
      
    } catch (error) {
      console.error('Page Load Error:', error);
      this.showError(pageName, error);
    }
  }

  private showError(pageName: string, error: any) {
    this.container.innerHTML = `
      <div class="flex bg-radial-bgitems-center justify-center h-screen">
        <div class="text-center p-6 bg-white rounded-lg shadow">
          <h1 class="text-xl font-bold text-neon-red mb-2">PAGE LOAD ERROR</h1>
          <p class="text-neon-blue mb-4">FAILED TO LOAD: ${pageName}</p>
          <button onclick="router.navigate('landing')" class="bg-neon-purple text-terminal-border px-4 py-2 rounded hover:bg-terminal-border hover:text-neon-purple">
            GO TO LANDING
          </button>
        </div>
      </div>
    `;
  }

  private cleanupCurrentPage() {
    // Page-specific cleanup
    if (this.currentPage === 'home') {
      // Call home page cleanup if available
      import('../pages/home/home.js').then(module => {
        if (module.cleanup) {
          module.cleanup();
        }
      }).catch(() => {
        // Cleanup method might not exist, that's ok
      });
    }

    // General cleanup for any page
    const allEventElements = this.container.querySelectorAll('[data-event-listener]');
    allEventElements.forEach(element => {
      // Remove custom event listeners if marked
      element.removeAttribute('data-event-listener');
    });

    // AGGRESSIVE: Clear ALL WebSocket listeners when changing any page
    // This prevents duplicate event listeners from accumulating
    const wsManager = WebSocketManager.getInstance();
    wsManager.clearAllListeners();

    // Babylon.js specific cleanup
    if (this.currentPage === 'landing') {
      this.cleanupBabylonjs();
    }

    // Clear any running intervals or timeouts
    // Components should handle their own cleanup, but this is a safety net
  }

  private cleanupBabylonjs() {
    // Call the global cleanup function if it exists
    if (typeof (window as any).closeBabylonGame === 'function') {
      try {
        (window as any).closeBabylonGame();
      } catch (e) {
        console.warn('Error calling closeBabylonGame:', e);
      }
    }

    // Remove canvas element
    const babylonCanvas = document.getElementById('babylon-canvas');
    if (babylonCanvas && babylonCanvas.parentNode) {
      babylonCanvas.parentNode.removeChild(babylonCanvas);
    }

    // Reset body background
    document.body.style.background = '';
    document.documentElement.style.background = '';
  }
}

export { Router };
