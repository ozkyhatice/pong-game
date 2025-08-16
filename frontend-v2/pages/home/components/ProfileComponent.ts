import { Component } from '../../../core/Component.js';
import { getApiUrl, API_CONFIG } from '../../../config.js';
import { notify } from '../../../core/notify.js';
import { AuthGuard } from '../../../core/auth-guard.js';

export interface UserProfile {
  id?: string;
  username?: string;
  email?: string;
  wins?: number;
  losses?: number;
  avatar?: string;
}

export class ProfileComponent extends Component {
  private profile: UserProfile;
  private activeTab: 'friends' | 'requests' | 'add' = 'friends';
  private friends: any[] = [];
  private requests: any[] = [];

  constructor(profile: UserProfile) {
    super({ className: 'h-full flex flex-col' });
    this.profile = profile;
    this.render();
    this.setupEvents(); // Sadece bir kez çağır
    this.loadFriends();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  private getAvatarURL(username?: string): string {
    const name = username || this.profile.username;
    if (!name) return 'https://api.dicebear.com/9.x/bottts/svg';
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  }

  private render(): void {
    const username = this.escapeHtml(this.profile.username || 'Unknown');
    const wins = this.profile.wins || 0;
    const losses = this.profile.losses || 0;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

    this.setHTML(`
      <div class="h-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-xl shadow-xl overflow-hidden flex flex-col">
        <!-- Profile Header -->
        <div class="p-6 bg-white/10 backdrop-blur-sm text-center relative">
          <!-- Action Buttons -->
          <div class="absolute top-4 right-4 flex flex-col space-y-2">
            <button id="settings-btn" class="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Edit Profile">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M11.828 2.25c-.916 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 0 1-.517.608 7.45 7.45 0 0 0-.478.198.798.798 0 0 1-.796-.064l-.453-.324a1.875 1.875 0 0 0-2.416.2l-.243.243a1.875 1.875 0 0 0-.2 2.416l.324.453a.798.798 0 0 1 .064.796 7.448 7.448 0 0 0-.198.478.798.798 0 0 1-.608.517l-.55.092a1.875 1.875 0 0 0-1.566 1.849v.344c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 0 1-.064.796l-.324.453a1.875 1.875 0 0 0 .2 2.416l.243.243c.648.648 1.67.733 2.416.2l.453-.324a.798.798 0 0 1 .796-.064c.157.071.316.137.478.198.267.1.47.327.517.608l.092.55c.15.903.932 1.566 1.849 1.566h.344c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 0 1 .517-.608 7.52 7.52 0 0 0 .478-.198.798.798 0 0 1 .796.064l.453.324a1.875 1.875 0 0 0 2.416-.2l.243-.243c.648-.648.733-1.67.2-2.416l-.324-.453a.798.798 0 0 1-.064-.796c.071-.157.137-.316.198-.478.1-.267.327-.47.608-.517l.55-.091a1.875 1.875 0 0 0 1.566-1.85v-.344c0-.916-.663-1.699-1.567-1.85l-.549-.091a.798.798 0 0 1-.608-.517 7.507 7.507 0 0 0-.198-.478.798.798 0 0 1 .064-.796l.324-.453a1.875 1.875 0 0 0-.2-2.416l-.243-.243a1.875 1.875 0 0 0-2.416-.2l-.453.324a.798.798 0 0 1-.796.064 7.462 7.462 0 0 0-.478-.198.798.798 0 0 1-.517-.608l-.091-.55a1.875 1.875 0 0 0-1.85-1.566h-.344ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button id="logout-btn" class="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors" title="Logout">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <!-- Profile Photo Center -->
          <div class="mb-4">
            <img src="${this.getAvatarURL()}" alt="Avatar" class="w-20 h-20 rounded-full mx-auto border-3 border-white/50 shadow-lg">
          </div>

          <!-- Username -->
          <h2 class="text-white font-bold text-xl mb-4">${username}</h2>

          <!-- Stats Grid -->
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-white font-bold text-2xl">${wins}</div>
              <div class="text-white/80 text-sm">Wins</div>
            </div>
            <div class="text-center">
              <div class="text-white font-bold text-2xl">${losses}</div>
              <div class="text-white/80 text-sm">Losses</div>
            </div>
            <div class="text-center">
              <div class="text-white font-bold text-2xl">${winRate}%</div>
              <div class="text-white/80 text-sm">Win Rate</div>
            </div>
          </div>
        </div>

        <!-- Social Section -->
        <div class="flex-1 bg-white rounded-t-xl flex flex-col min-h-0">
          <!-- Tabs -->
          <div class="flex border-b">
            ${this.renderTabs()}
          </div>
          <!-- Content -->
          <div class="flex-1 p-3 overflow-y-auto">
            ${this.renderTabContent()}
          </div>
        </div>
      </div>
    `);
  }

  private renderTabs(): string {
    const tabs = [
      { 
        id: 'friends', 
        name: 'Friends', 
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clip-rule="evenodd"/>
          <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z"/>
        </svg>`
      },
      { 
        id: 'requests', 
        name: 'Requests', 
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z"/>
          <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z"/>
        </svg>`
      },
      { 
        id: 'add', 
        name: 'Add', 
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM2.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM18.75 7.5a.75.75 0 0 0-1.5 0v2.25H15a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H21a.75.75 0 0 0 0-1.5h-2.25V7.5Z"/>
        </svg>`
      }
    ];

    return tabs.map(tab => `
      <button class="social-tab flex-1 px-3 py-3 text-center text-xs font-medium transition-colors ${
        this.activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
      }" data-tab="${tab.id}">
        <div class="flex flex-col items-center">
          <div class="mb-1">${tab.icon}</div>
          <span>${tab.name}</span>
        </div>
      </button>
    `).join('');
  }

  private renderTabContent(): string {
    switch (this.activeTab) {
      case 'friends':
        return this.friends.length === 0 
          ? '<div class="text-center text-gray-500 py-8"><p class="text-sm">No friends yet</p></div>'
          : this.friends.map(friend => `
              <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2">
                <div class="flex items-center">
                  <img src="${this.getAvatarURL(friend.friendInfo.username)}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
                  <span class="text-sm font-medium">${this.escapeHtml(friend.friendInfo.username)}</span>
                </div>
                <div class="flex space-x-1">
                  <button class="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200">Chat</button>
                  <button class="px-2 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200">Play</button>
                </div>
              </div>
            `).join('');

      case 'requests':
        return this.requests.length === 0
          ? '<div class="text-center text-gray-500 py-8"><p class="text-sm">No requests</p></div>'
          : this.requests.map(request => `
              <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2">
                <div class="flex items-center">
                  <img src="${this.getAvatarURL(request.senderInfo.username)}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
                  <span class="text-sm font-medium">${this.escapeHtml(request.senderInfo.username)}</span>
                </div>
                <div class="flex space-x-1">
                  <button class="accept-friend px-2 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200" data-id="${request.senderInfo.id}">✓</button>
                  <button class="decline-friend px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200" data-id="${request.senderInfo.id}">✗</button>
                </div>
              </div>
            `).join('');

      case 'add':
        return `
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Add Friend</label>
              <div class="space-y-2">
                <input type="text" placeholder="Username..." class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" id="friend-search">
                <button id="send-request" class="w-full px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">Send Request</button>
              </div>
              <p class="text-xs text-gray-500 mt-2">Enter the exact username to send a friend request</p>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  private setupEvents(): void {
    // Event delegation kullanarak tek listener
    this.element.onclick = (e) => {
      const target = e.target as HTMLElement;

      // Tab switching
      if (target.closest('.social-tab')) {
        const tab = target.closest('.social-tab')?.getAttribute('data-tab') as 'friends' | 'requests' | 'add';
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.render();
          if (tab === 'requests') this.loadRequests();
        }
        return;
      }

      // Settings button
      if (target.closest('#settings-btn')) {
        (window as any).router.navigate('avatar-test');
        return;
      }

      // Logout button
      if (target.closest('#logout-btn')) {
        AuthGuard.logout();
        notify('Logged out successfully!');
        (window as any).router.navigate('landing');
        return;
      }

      // Add friend
      if (target.closest('#send-request')) {
        this.handleAddFriend();
        return;
      }

      // Accept/decline friend requests
      if (target.closest('.accept-friend')) {
        const id = target.closest('.accept-friend')?.getAttribute('data-id');
        if (id) this.handleAcceptFriend(id);
        return;
      }

      if (target.closest('.decline-friend')) {
        const id = target.closest('.decline-friend')?.getAttribute('data-id');
        if (id) this.handleDeclineFriend(id);
        return;
      }
    };
  }

  private async loadFriends(): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.LIST), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.friends = data.friends || [];
        if (this.activeTab === 'friends') {
          this.render();
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  private async loadRequests(): Promise<void> {
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
    }
  }

  private async handleAddFriend(): Promise<void> {
    const input = this.element.querySelector('#friend-search') as HTMLInputElement;
    const button = this.element.querySelector('#send-request') as HTMLButtonElement;
    const username = input?.value.trim();
    
    if (!username) {
      notify('Please enter a username');
      return;
    }

    // Disable button to prevent multiple clicks
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Find user
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
        notify(`Friend request sent to ${this.escapeHtml(username)}!`);
        input.value = '';
      } else {
        // Try to show error message from response
        let errorMsg = 'Failed to send friend request';
        try {
          const errorData = await addResponse.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {}
        notify(errorMsg, 'red');
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      notify('Error sending friend request', 'red');
    } finally {
      // Re-enable button
      if (button) {
        button.disabled = false;
        button.textContent = 'Send Request';
      }
    }
  }

  private async handleAcceptFriend(userId: string): Promise<void> {
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
        this.loadFriends();
      } else {
        notify('Failed to accept friend request', 'red');
      }
    } catch (error) {
      console.error('Error accepting friend:', error);
    }
  }

  private async handleDeclineFriend(userId: string): Promise<void> {
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
        notify('Failed to decline friend request', 'red');
      }
    } catch (error) {
      console.error('Error declining friend:', error);
    }
  }
}