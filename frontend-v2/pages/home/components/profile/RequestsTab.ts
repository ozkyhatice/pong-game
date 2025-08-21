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

  private getAvatarURL(username: string): string {
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
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
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm font-medium text-gray-700">Requests (${this.requests.length})</span>
        </div>
        ${this.requests.map(request => `
          <div class="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div class="flex items-center">
              <img src="${this.getAvatarURL(request.senderInfo.username)}" alt="Avatar" class="w-8 h-8 rounded-full mr-3">
              <span class="text-sm font-medium">${request.senderInfo.username}</span>
            </div>
            <div class="flex space-x-2">
              <button class="accept-btn px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200" 
                      data-id="${request.senderInfo.id}">
                Accept
              </button>
              <button class="decline-btn px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200" 
                      data-id="${request.senderInfo.id}">
                Decline
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