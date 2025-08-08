class Router {
  private container: HTMLElement;
  public currentPage: string = 'landing';

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupBrowserNavigation();

    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuth = urlParams.has('oauth') || urlParams.has('token') || urlParams.has('error');

    let initialPage = 'landing';
    if (hasOAuth) {
      const oauthSuccess = urlParams.get('oauth');
      const userId = urlParams.get('userId');
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      if (error === 'oauth_failed') {
        initialPage = 'login';
      } else if (oauthSuccess === '2fa_required' && userId) {
        initialPage = '2fa-code';
      } else if (token && oauthSuccess === 'success') {
        initialPage = 'home';
      }
    } else if (window.history.state && window.history.state.page) {
      initialPage = window.history.state.page;
    }

    this.loadPage(initialPage);
  }

  navigate(pageName: string) {
    console.log(`Navigating to: ${pageName}`);
    if (pageName !== this.currentPage) {
      window.history.pushState({ page: pageName }, '', window.location.href);
      this.loadPage(pageName);
    }
  }

  private setupBrowserNavigation() {
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.page)
        this.loadPage(event.state.page);
      else
        this.loadPage('landing');
    });

    // Set initial state if not present
    if (!window.history.state || !window.history.state.page)
      window.history.replaceState({ page: 'landing' }, '', window.location.href);
  }

  private async loadPage(pageName: string) {
    try {
      console.log(`Loading page: ${pageName}`);

      // Clean up Babylon.js if leaving landing page
      if (this.currentPage === 'landing' && pageName !== 'landing') {
        this.cleanupBabylonjs();
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      const response = await fetch(`./pages/${pageName}/${pageName}.html`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const html = await response.text();

      // Additional cleanup: Remove Babylon.js canvas if not on landing page
      if (pageName !== 'landing') {
        this.cleanupBabylonjs();
      }

      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      this.container.innerHTML = html;

      const module = await import(`../pages/${pageName}/${pageName}.js`);
      if (module.init)
        module.init();

      this.currentPage = pageName;
    } catch (error) {
      console.error('Page Load Error:', error);
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-screen">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Page</h1>
            <p class="text-gray-600 mb-4">Failed to load: ${pageName}</p>
            <p class="text-sm text-gray-500">${error}</p>
            <button onclick="router.navigate('landing')" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
              Go Landing
            </button>
          </div>
        </div>
      `;
    }
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
