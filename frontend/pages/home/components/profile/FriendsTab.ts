import { getApiUrl, API_CONFIG } from '../../../../config.js';
import { notify } from '../../../../core/notify.js';
import { AppState } from '../../../../core/AppState.js';
import { GameService } from '../../../../services/GameService.js';
import { UserInfo, UserService } from '../../../../services/UserService.js';

export class FriendsTab {
  private element: HTMLElement;
  private friends: any[] = [];
  private gameService: GameService = new GameService();
  private userService: UserService = new UserService();
  private me: UserInfo | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'h-full';
    this.setupEvents();
    
    this.loadCurrentUser();
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      this.me = await this.userService.getCurrentUser();
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  private render(): void {
    if (this.friends.length === 0) {
      this.element.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <p class="text-sm">No friends yet</p>
        </div>
      `;
      return;
    }

    this.element.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm font-medium text-gray-700">Friends (${this.friends.length})</span>
        </div>
        ${this.friends.map(friend => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <img src="${friend.friendInfo.avatar}" alt="Avatar" class="w-8 h-8 rounded-full mr-3">
              <span class="text-sm font-medium">${friend.friendInfo.username}</span>
            </div>
            <div class="flex space-x-2">
              <button class="view-profile-btn px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200" 
                      data-user-id="${friend.friendInfo.id}" 
                      data-username="${friend.friendInfo.username}">
                Chat
              </button>
              <button class="play-btn px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
                      data-user-id="${friend.friendInfo.id}" 
                      data-username="${friend.friendInfo.username}">
                Play
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

      if (target.closest('.view-profile-btn')) {
        const btn = target.closest('.view-profile-btn');
        const userId = btn?.getAttribute('data-user-id');
        const username = btn?.getAttribute('data-username');
        if (userId && username) {
          this.handleViewProfile(userId, username);
        }
        return;
      }

      if (target.closest('.play-btn')) {
        this.handlePlayButton(target);
        return;
      }
    };
  }

  public async loadFriends(): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.LIST), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.friends = data.friends || [];
        this.render();
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      notify('Failed to load friends', 'red');
    }
  }

  private async handlePlayButton(target: HTMLElement): Promise<void> {
    try {
      const btn = target.closest('.play-btn');
      const friendUserId = btn?.getAttribute('data-user-id');
      const friendUsername = btn?.getAttribute('data-username');

      if (friendUserId && this.me && friendUsername) {
        this.gameService.sendGameInvite(parseInt(friendUserId), this.me.username);
        notify(`Game invitation sent to ${friendUsername}!`);
      } else {
        notify('Unable to send invitation', 'red');
      }
    } catch (error) {
      console.error('Error sending game invitation:', error);
      notify('Failed to send game invitation', 'red');
    }
  }

  private handleViewProfile(userId: string, username: string): void {
    const appState = AppState.getInstance();
    
    appState.setViewingUser({
      id: parseInt(userId),
      username: username,
    });
    
    (window as any).router.navigate('user-profile');
  }

  getElement(): HTMLElement {
    return this.element;
  }
}