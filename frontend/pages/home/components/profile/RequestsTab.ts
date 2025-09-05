import { getApiUrl, API_CONFIG } from '../../../../config.js';
import { notify } from '../../../../core/notify.js';

export class RequestsTab {
  private element: HTMLElement;
  private requests: any[] = [];

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'h-full';
    this.setupEvents();
  }

  private render(): void {
    if (this.requests.length === 0) {
      this.element.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <p class="text-sm">No friend requests</p>
        </div>
      `;
      return;
    }

    this.element.innerHTML = `
      <div class="space-y-2">
        <div class="mb-3">
          <h1 class="text-[10px] font-medium text-neon-yellow/50 mb-1">> REQUESTS [${this.requests.length}]</h1>
		  <h1 class="text-[10px] font-medium text-neon-green/50">> ACCEPT OR DECLINE, IT'S YOUR CHOICE...</h1>
        </div>
        ${this.requests.map(request => `
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-radial-bg rounded-lg border border-neon-yellow gap-2">
            <div class="flex items-center min-w-0">
              <img src="${request.senderInfo.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(request.senderInfo.username)}`}" alt="Avatar" class="w-6 h-6 rounded-full mr-2">
              <span class="text-xs text-neon-white font-medium truncate">${request.senderInfo.username}</span>
            </div>
            <div class="flex gap-1.5 w-full sm:w-auto">
              <button class="accept-btn flex-1 sm:flex-initial px-2 py-1 text-[10px] font-medium bg-neon-green text-terminal-border rounded hover:bg-neon-green/80 transition-colors border border-neon-green whitespace-nowrap" 
                      data-id="${request.senderInfo.id}">
                ACCEPT
              </button>
              <button class="decline-btn flex-1 sm:flex-initial px-2 py-1 text-[10px] font-medium bg-neon-red text-terminal-border rounded hover:bg-neon-red/80 transition-colors border border-neon-red whitespace-nowrap" 
                      data-id="${request.senderInfo.id}">
                DECLINE
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private setupEvents(): void {
    this.element.onclick = (e) => {
      const target = e.target as HTMLElement;

      if (target.closest('.accept-btn')) {
        const btn = target.closest('.accept-btn');
        const id = btn?.getAttribute('data-id');
        if (id) this.handleAccept(id);
        return;
      }

      if (target.closest('.decline-btn')) {
        const btn = target.closest('.decline-btn');
        const id = btn?.getAttribute('data-id');
        if (id) this.handleDecline(id);
        return;
      }
    };
  }

  public async loadRequests(): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.REQUESTS.INCOMING), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.requests = data.requests || [];
        this.render();
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      notify('Failed to load requests', 'red');
    }
  }

  private async handleAccept(userId: string): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.ACCEPT(userId)), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        notify('Friend request accepted!');
        this.loadRequests();
      } else {
        notify('Failed to accept request', 'red');
      }
    } catch (error) {
      console.error('Error accepting friend:', error);
      notify('Error accepting request', 'red');
    }
  }

  private async handleDecline(userId: string): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.REJECT(userId)), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        notify('Friend request declined');
        this.loadRequests();
      } else {
        notify('Failed to decline request', 'red');
      }
    } catch (error) {
      console.error('Error declining friend:', error);
      notify('Error declining request', 'red');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}