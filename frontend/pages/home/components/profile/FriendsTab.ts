import { getApiUrl, API_CONFIG } from '../../../../config.js';
import { notify } from '../../../../core/notify.js';
import { AppState } from '../../../../core/AppState.js';
import { GameService } from '../../../../services/GameService.js';
import { UserInfo, UserService } from '../../../../services/UserService.js';
import { OnlineUsersService } from '../../../../services/OnlineUsersService.js';

export class FriendsTab {
  private element: HTMLElement;
  private friends: any[] = [];
  private gameService: GameService = new GameService();
  private userService: UserService = new UserService();
  private onlineUsersService: OnlineUsersService = OnlineUsersService.getInstance();
  private me: UserInfo | null = null;
  private unsubscribeStatusChange: (() => void) | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'h-full';
    this.setupEvents();
    this.setupOnlineStatusListener();
    
    this.loadCurrentUser();
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      this.me = await this.userService.getCurrentUser();
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  private setupOnlineStatusListener(): void {
    // Subscribe to online status changes to update friend list in real-time
    this.unsubscribeStatusChange = this.onlineUsersService.onStatusChange(() => {
      if (this.friends.length > 0) {
        this.render();
      }
    });
  }

  private getFriendOnlineStatus(friendId: number): { isOnline: boolean; lastSeen?: Date } {
    const userStatus = this.onlineUsersService.getUserStatus(friendId);
    return {
      isOnline: userStatus ? userStatus.status === 'online' : false,
      lastSeen: userStatus?.lastSeen
    };
  }

  private formatLastSeen(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
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

    // Sort friends by online status (online first)
    const sortedFriends = [...this.friends].sort((a, b) => {
      const aStatus = this.getFriendOnlineStatus(a.friendInfo.id);
      const bStatus = this.getFriendOnlineStatus(b.friendInfo.id);
      
      if (aStatus.isOnline && !bStatus.isOnline) return -1;
      if (!aStatus.isOnline && bStatus.isOnline) return 1;
      return 0;
    });

    const onlineCount = sortedFriends.filter(friend => 
      this.getFriendOnlineStatus(friend.friendInfo.id).isOnline
    ).length;

    this.element.innerHTML = `
      <div class="overflow-hidden">
        <div class="flex justify-between items-center mb-4">
          <span class="text-sm font-medium text-gray-700">
            Friends (${this.friends.length})
          </span>
          <span class="text-xs text-green-600 font-medium">
            ${onlineCount} online
          </span>
        </div>
        <div class="space-y-3 overflow-y-auto max-h-96">
          ${sortedFriends.map(friend => {
            const status = this.getFriendOnlineStatus(friend.friendInfo.id);
            const lastSeenText = !status.isOnline && status.lastSeen ? 
              this.formatLastSeen(status.lastSeen) : '';
            
            return `
              <div class="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${status.isOnline ? 'border-l-3 border-green-400' : ''}">
                <div class="relative mr-3 flex-shrink-0">
                  <img src="${friend.friendInfo.avatar}" alt="Avatar" class="w-12 h-12 rounded-full">
                  ${status.isOnline ? '<div class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>' : ''}
                </div>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm font-medium text-gray-900 truncate" title="${friend.friendInfo.username}">${friend.friendInfo.username}</span>
                    ${status.isOnline ? '<div class="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>' : ''}
                  </div>
                  ${!status.isOnline && lastSeenText ? `<div class="text-xs text-gray-500 mb-2">${lastSeenText}</div>` : ''}
                  
                  <div class="flex space-x-2">
                    <button class="view-profile-btn px-3 py-1.5 text-xs bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors" 
                            data-user-id="${friend.friendInfo.id}" 
                            data-username="${friend.friendInfo.username}">
                      Chat
                    </button>
                    <button class="play-btn px-3 py-1.5 text-xs ${status.isOnline ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded-md transition-colors"
                            data-user-id="${friend.friendInfo.id}" 
                            data-username="${friend.friendInfo.username}"
                            ${!status.isOnline ? 'disabled' : ''}>
                      Play
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
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
        // Check if friend is online before sending invitation
        const friendId = parseInt(friendUserId);
        const status = this.getFriendOnlineStatus(friendId);
        
        if (!status.isOnline) {
          notify(`${friendUsername} is offline and cannot receive game invitations`, 'red');
          return;
        }

        this.gameService.sendGameInvite(friendId, this.me.username);
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

  // Cleanup method to unsubscribe from online status changes
  destroy(): void {
    if (this.unsubscribeStatusChange) {
      this.unsubscribeStatusChange();
      this.unsubscribeStatusChange = null;
    }
  }
}