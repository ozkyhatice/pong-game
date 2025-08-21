import { getApiUrl, API_CONFIG } from '../../../../config.js';
import { notify } from '../../../../core/notify.js';

export class AddFriendTab {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'h-full';
    this.render();
    this.setupEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Add Friend</label>
          <div class="space-y-3">
            <input type="text" 
                   placeholder="Enter username..." 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   id="friend-search">
            <button id="send-request" 
                    class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
              Send Request
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">Enter the exact username to send a friend request</p>
        </div>
      </div>
    `;
  }

  private setupEvents(): void {
    this.element.onclick = (e) => {
      const target = e.target as HTMLElement;

      if (target.closest('#send-request')) {
        this.handleSendRequest();
        return;
      }
    };

    // Enter key support
    const input = this.element.querySelector('#friend-search') as HTMLInputElement;
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSendRequest();
      }
    });
  }

  private async handleSendRequest(): Promise<void> {
    const input = this.element.querySelector('#friend-search') as HTMLInputElement;
    const button = this.element.querySelector('#send-request') as HTMLButtonElement;
    const username = input?.value.trim();
    
    if (!username) {
      notify('Please enter a username');
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending...';

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Find user by username
      const userResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.BY_USERNAME(username)), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        notify('User not found', 'red');
        return;
      }

      const userData = await userResponse.json();
      const user = userData.user || userData;

      // Send friend request
      const addResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.ADD(user.id)), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (addResponse.ok) {
        notify(`Friend request sent to ${username}!`);
        input.value = '';
      } else {
        const errorData = await addResponse.json().catch(() => ({}));
        const errorMsg = errorData.error || 'Failed to send friend request';
        notify(errorMsg, 'red');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      notify('Error sending friend request', 'red');
    } finally {
      button.disabled = false;
      button.textContent = 'Send Request';
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}