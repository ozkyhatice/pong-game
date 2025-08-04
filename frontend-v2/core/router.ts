class Router {
  private container: HTMLElement;
  private currentPage: string = 'landing';

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupBrowserNavigation();
    // Try to get page from history state or URL
    let initialPage = 'landing';
    if (window.history.state && window.history.state.page)
      initialPage = window.history.state.page;
    else {
      // Try to get from URL hash (e.g., #home)
      const hash = window.location.hash.replace('#', '');
      if (hash) initialPage = hash;
    }
    this.loadPage(initialPage);
  }

  navigate(pageName: string) {
    if (pageName !== this.currentPage) {
      // Update URL hash for direct linking
      window.history.pushState({ page: pageName }, '', `#${pageName}`);
      this.loadPage(pageName);
    }
  }

  private setupBrowserNavigation() {
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.page)
        this.loadPage(event.state.page);
      else {
        // Try to get from URL hash
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          this.loadPage(hash);
        } else {
          this.loadPage('landing');
        }
      }
    });

    // Set initial state if not present
    if (!window.history.state || !window.history.state.page) {
      let initialPage = 'landing';
      const hash = window.location.hash.replace('#', '');
      if (hash)
        initialPage = hash;
      window.history.replaceState({ page: initialPage }, '', `#${initialPage}`);
    }
  }

  private async loadPage(pageName: string) {
    try {
      console.log(`Loading page: ${pageName}`);

      this.container.style.transition = 'opacity 0.2s';
      this.container.style.opacity = '0';

      await new Promise((resolve) => setTimeout(resolve, 200));

      const response = await fetch(`./pages/${pageName}/${pageName}.html`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();

      this.container.innerHTML = html;
      this.container.style.opacity = '1';

      const module = await import(`../pages/${pageName}/${pageName}.js`);
      if (module.init)
        module.init();

      this.currentPage = pageName;
    } catch (error) {
      console.error(' PLoadage Error:', error);
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
}

export { Router };
