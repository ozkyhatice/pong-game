import { Component } from '../../../core/Component.js';
import { getApiUrl, API_CONFIG } from '../../../config.js';

export interface UserProfile {
  user?: {
    id: string;
    username: string;
    email: string;
    wins: number;
    losses: number;
    level: number;
    name?: string;
    avatar?: string;
  };
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  level?: number;
  wins?: number;
  losses?: number;
  avatar?: string;
}


export class ProfileComponent extends Component {

  private profile: UserProfile;
  private activeTab: 'friends' | 'requests' | 'add' = 'friends';
  private friendList: any[] = [];
  private requestsList: any[] = [];
  private authToken: string | null = localStorage.getItem('authToken');

  constructor(profile: UserProfile) {
    super({ className: 'w-80 h-full flex flex-col mx-auto' }); //center this
    this.profile = profile;
    this.getFriendList();
    this.getRequestsList();
    this.render();
    this.setupEvents();
  }

updateProfile(profile: UserProfile): void {
    this.profile = profile;
    this.render();
  }

private controlAuthEvents(): void {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    alert('Please login first!');
    router.navigate('/login');
    return;
  }
}

private render(): void {
    const user = this.profile.user || this.profile;
    const username = (user as any).username || (user as any).name || (user as any).email || 'Unknown';
    const wins = (user as any).wins || 0;
    const losses = (user as any).losses || 0;
    const level = (user as any).level || 1;
    const avatar = (user as any).avatar || this.profile.avatar;

    const winRate = wins + losses > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : 0;

    this.setHTML(`
      <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-shrink-0">
        <!-- Profile Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white text-center">
          <div class="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center text-blue-600 text-xl font-bold shadow-lg">
            ${avatar || username.charAt(0).toUpperCase()}
          </div>
          <h2 class="text-lg font-semibold">${username}</h2>
          <p class="text-blue-100 text-sm">Level ${level}</p>
        </div>

        <!-- Stats -->
        <div class="p-4 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <div class="text-xl font-bold text-green-600">${wins}</div>
              <div class="text-xs text-green-500">Wins</div>
            </div>
            <div class="text-center p-3 bg-red-50 rounded-lg">
              <div class="text-xl font-bold text-red-600">${losses}</div>
              <div class="text-xs text-red-500">Losses</div>
            </div>
          </div>

          <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span class="text-sm text-gray-600">Win Rate</span>
            <span class="font-semibold text-gray-800">${winRate}%</span>
          </div>

      </div>

      <!-- Menu -->
      <div class="mt-4 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-1 flex flex-col">
        <!-- Social Tabs -->
        <div class="flex border-b border-gray-100 flex-shrink-0">
          <button class="social-tab flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${this.activeTab === 'friends' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}" data-tab="friends">
            <svg class="w-4 h-4 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
            Friends
          </button>
          <button class="social-tab flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${this.activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}" data-tab="requests">
            <svg class="w-4 h-4 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            Requests
          </button>
          <button class="social-tab flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${this.activeTab === 'add' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}" data-tab="add">
            <svg class="w-4 h-4 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
            </svg>
            Add Friend
          </button>
        </div>

        <!-- Tab Content -->
        <div class="p-4 flex-1 overflow-y-auto">
          ${this.renderTabContent()}
        </div>
      </div>
    `);
  }


  private renderTabContent(): string {
    switch (this.activeTab) {
      case 'friends':
        if (!Array.isArray(this.friendList) || this.friendList.length === 0) {
          return `
            <div class="text-center text-gray-500">
              <p class="text-sm">No friends yet.</p>
            </div>
          `;
        }
        return `
          <div class="space-y-3">
            ${this.friendList.map(friend => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    ${friend.friendInfo.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">${friend.friendInfo.username}</div>
                    <div class="text-xs text-green-500 flex items-center">
                      <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      Online
                    </div>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button class="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors">
                    Invite
                  </button>
                  <button class="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">
                    Chat
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      case 'requests':
        if (!Array.isArray(this.requestsList) || this.requestsList.length === 0) {
          return `
            <div class="text-center text-gray-500">
              <p class="text-sm">No friend requests at the moment.</p>
            </div>
          `;
        }
        return `
          <div class="space-y-3">
            ${this.requestsList.map(request => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    ${request.senderInfo.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">${request.senderInfo.username}</div>
                    <div class="text-xs text-gray-500">Friend Request</div>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button class="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors">
                    Accept
                  </button>
                  <button class="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      case 'add':
        return `
          <div class="space-y-4">

            <!-- Search Section -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Add Friend</label>
              <div class="flex gap-1 w-full">
                <input
                  type="text"
                  placeholder="Enter username..."
                  class=" px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  id="friend-search"
                >
                <button id="send-friend-request" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors">
                  Send Request
                </button>
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
	this.controlAuthEvents();
    const tabButtons = this.element.querySelectorAll('.social-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as 'friends' | 'requests' | 'add';
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.render();
          
          if(tab === 'add')
            this.setupAddFriendEvent();
          else if (tab === 'requests')
            this.getRequestsList();
          else if (tab === 'friends')
            this.getFriendList();
          this.setupEvents();
        }
      });
    });
}

private setupAddFriendEvent(): void {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        alert('Please login first!');
        return;
    }
    const searchInput = this.element.querySelector('#friend-search') as HTMLInputElement;
    const sendRequestBtn = this.element.querySelector('#send-friend-request') as HTMLButtonElement;
    sendRequestBtn?.addEventListener('click', async () => {
        const username = searchInput.value.trim();
        if (username) {
            try {
                const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.BY_USERNAME(username)), {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    }
                });

                if (response.ok) {
                    const user = await response.json();
                    console.log(`Found user: ${user.username}`);
                    const addResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.ADD(user.user.id)), {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                        }
                    });

                    if (addResponse.ok)
                        console.log(`Friend request sent to ${user.username}`);
                    else
                        console.error(`Failed to send friend request to ${user.username}`);
                }
                else {
                    const errorData = await response.json();
                    console.error(`Error fetching user: ${errorData.message}`);
                    alert(`Error: ${errorData.message}`);
                }
                searchInput.value = '';
            } catch (error) {
                console.error(error);
                searchInput.value = '';
                alert('An error occurred while sending the friend request. Please try again.');
            }
        }
    });
}
private async getFriendList(): Promise<void> {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        alert('Please login first!');
        return;
    }

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.LIST), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${authToken}`,
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Friends API response:', data.friends);
            this.friendList = Array.isArray(data.friends) ? data.friends : [];
        } else {
            const errorData = await response.json();
            console.log(`Error fetching friends: ${errorData.message}`);
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred while fetching the friend list. Please try again.');
    }
}

private async getRequestsList(): Promise<void> {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        alert('Please login first!');
        return;
    }

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.REQUESTS.INCOMING), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${authToken}`,
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Requests API response:', data.requests);
            this.requestsList = Array.isArray(data.requests) ? data.requests : [];
        } else {
            const errorData = await response.json();
            console.log(`Error fetching requests: ${errorData.message}`);
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred while fetching friend requests. Please try again.');
    }
}

private acceptFriendRequestEvents(): void {
	this.controlAuthEvents();
	this.requestsList.forEach(request => {
		const acceptButton = this.element.querySelector(`#accept-friend-request-${request.senderInfo.id}`) as HTMLButtonElement;
		if (acceptButton) {
			acceptButton.addEventListener('click', async () => {
				try {
					const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.ACCEPT(request.senderInfo.id)), {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${this.authToken}`,
						}
					});

					if (response.ok) {
						console.log(`Friend request from ${request.senderInfo.username} accepted`);
						this.getRequestsList();
					} else {
						const errorData = await response.json();
						console.error(`Error accepting request: ${errorData.message}`);
					}
				} catch (error) {
					console.error(error);
					alert('An error occurred while accepting the friend request. Please try again.');
				}
			});
		}
	});
}

private declineFriendRequestEvents(): void {
	this.controlAuthEvents();
	this.requestsList.forEach(request => {
		const declineButton = this.element.querySelector(`#decline-friend-request-${request.senderInfo.id}`) as HTMLButtonElement;
		if (declineButton) {
			declineButton.addEventListener('click', async () => {
				try {
					const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.REJECT(request.senderInfo.id)), {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${this.authToken}`,
						}
					});

					if (response.ok) {
						console.log(`Friend request from ${request.senderInfo.username} declined`);
						this.getRequestsList();
					} else {
						const errorData = await response.json();
						console.error(`Error declining request: ${errorData.message}`);
					}
				} catch (error) {
					console.error(error);
					alert('An error occurred while declining the friend request. Please try again.');
				}
			});
		}
	});
  }

  public getProfile(): UserProfile {
	return this.profile;
}

}
