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
          <label class="block text-[10px] font-medium text-neon-purple/50 mb-1">> ADD FRIEND</label>
		  <p class="text-[10px] text-neon-green/50 uppercase mb-2">> Enter the exact username to send a FRIEND request</p>
          <div class="space-y-3">
            <input type="text" 
                   placeholder="ENTER USERNAME..." 
                   class="w-full text-neon-purple bg-transparent px-3 py-2 border border-neon-green border-opacity-50 rounded-lg text-sm focus:ring-2 focus:ring-neon-red focus:border-neon-red" 
                   id="friend-search">
            <button id="send-request" 
                    class="w-full px-4 py-2 bg-neon-purple border border-neon-purple text-terminal-border rounded-lg text-sm hover:bg-neon-purple/80 transition-colors">
              SEND REQUEST
            </button>
          </div>
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