import { AuthGuard } from './auth-guard.js';

class Router {
  private container: HTMLElement;
  public currentPage: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupBrowserNavigation();
    
    const initialPage = this.getInitialPage();
    this.navigate(initialPage);
  }

  navigate(pageName: string) {
    console.log(`Navigating to: ${pageName}`);
    
    // Auth kontrolü ve yönlendirme
    AuthGuard.checkAuth(pageName, this);
    
    // Sayfa değişikliği gerekli mi?
    if (pageName === this.currentPage) return;
    
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
      if (oauth === 'success' && token) return 'home';
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
      <div class="flex items-center justify-center h-screen">
        <div class="text-center p-6 bg-white rounded-lg shadow">
          <h1 class="text-xl font-bold text-red-600 mb-2">Page Load Error</h1>
          <p class="text-gray-600 mb-4">Failed to load: ${pageName}</p>
          <button onclick="router.navigate('landing')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Go to Landing
          </button>
        </div>
      </div>
    `;
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
