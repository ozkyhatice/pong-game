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
      notify('Failed to load user info', 'red');
    }
  }

  private setupOnlineStatusListener(): void {
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

  private render(): void {
    if (this.friends.length === 0) {
      this.element.innerHTML = `
        <div class="text-center text-neon-blue/50 py-8">
          <p class="text-sm">NO FRIENDS...</p>
        </div>
      `;
      return;
    }

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
      <div class="overflow-hidden h-full">
        <div class="mb-4">
          <div class="flex justify-between items-center mb-1">
            <span class="text-[10px] font-medium text-neon-blue/50">> FRIENDS [${this.friends.length}]</span>
            <span class="text-[10px] text-neon-green font-medium">[${onlineCount}] ONLINE</span>
          </div>
          <div class="text-[10px] text-neon-green/50 font-medium">> CHALLENGE YOUR FRIENDS OR CHAT WITH THEM</div>
        </div>
        <div class="space-y-3 overflow-y-auto h-full max-h-full">
          ${sortedFriends.map(friend => {
            const status = this.getFriendOnlineStatus(friend.friendInfo.id);
            
            return `
              <div class="flex items-start p-3 bg-radial-bg border border-neon-blue rounded-lg transition-colors ${status.isOnline ? 'border-l-3 border-neon-green/50' : ''}">
                <div class="relative mr-3 flex-shrink-0">
                  <img src="${friend.friendInfo.avatar}" alt="Avatar" class="w-12 h-12 rounded-full">
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm text-neon-white font-medium truncate" title="${friend.friendInfo.username}">${friend.friendInfo.username}</span>
                    ${status.isOnline ? '<div class="w-2 h-2 bg-neon-green rounded-full flex-shrink-0"></div>' : ''}
                  </div>
                  <div class="flex space-x-2">
                    <button class="view-profile-btn px-2 py-0.5 text-[10px] border border-neon-blue bg-neon-blue text-terminal-border rounded hover:bg-neon-blue/50 transition-colors" 
                            data-user-id="${friend.friendInfo.id}" 
                            data-username="${friend.friendInfo.username}">
                      CHAT
                    </button>
                    <button class="play-btn px-2 py-0.5 text-[10px] ${status.isOnline ? 'bg-neon-red border border-neon-red text-terminal-border hover:bg-neon-red/80' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded transition-colors"
                            data-user-id="${friend.friendInfo.id}" 
                            data-username="${friend.friendInfo.username}"
                            ${!status.isOnline ? 'disabled' : ''}>
                      PLAY
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
      notify('Failed to load friends', 'red');
    }
  }

  private async handlePlayButton(target: HTMLElement): Promise<void> {
    try {
      const btn = target.closest('.play-btn');
      const friendUserId = btn?.getAttribute('data-user-id');
      const friendUsername = btn?.getAttribute('data-username');

      if (friendUserId && this.me && friendUsername) {
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

  destroy(): void {
    if (this.unsubscribeStatusChange) {
      this.unsubscribeStatusChange();
      this.unsubscribeStatusChange = null;
    }
  }
}