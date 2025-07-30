class Router {
  private container: HTMLElement;
  private currentPage: string = 'home';

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupBrowserNavigation();
    this.loadPage('home'); // Başlangıçta home sayfası
  }

  navigate(pageName: string) {
    if (pageName !== this.currentPage) {
      // Browser history'ye ekle
      window.history.pushState({ page: pageName }, '', window.location.href);
      this.loadPage(pageName);
    }
  }

  private setupBrowserNavigation() {
    // Browser'ın ileri/geri butonları için event listener
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.page) {
        this.loadPage(event.state.page);
      } else {
        // İlk yükleme durumu için home'a git
        this.loadPage('home');
      }
    });

    // İlk sayfa için state ekle
    window.history.replaceState({ page: 'home' }, '', window.location.href);
  }

  private async loadPage(pageName: string) {
    try {
      console.log(`Loading page: ${pageName}`);
      
      // Sayfa değişikliğini güncelle
      this.currentPage = pageName;
      
      // Loading mesajı göster
      this.container.innerHTML = '<div class="flex items-center justify-center h-screen"><div class="text-xl">Loading...</div></div>';
      
      // HTML dosyasını yükle
      const response = await fetch(`./pages/${pageName}/${pageName}.html`);
      console.log(`Fetch response for ${pageName}:`, response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log(`HTML loaded for ${pageName}, length:`, html.length);
      
      // Container'a yerleştir
      this.container.innerHTML = html;
      
      // TS dosyasını yükle ve çalıştır
      const module = await import(`../pages/${pageName}/${pageName}.js`);
      console.log(`Module loaded for ${pageName}:`, module);
      
      if (module.init) {
        module.init();
      }
    } catch (error) {
      console.error('Sayfa yüklenemedi:', error);
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-screen">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Page</h1>
            <p class="text-gray-600 mb-4">Failed to load: ${pageName}</p>
            <p class="text-sm text-gray-500">${error}</p>
            <button onclick="router.navigate('home')" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
              Go Home
            </button>
          </div>
        </div>
      `;
    }
  }
}

export { Router };
