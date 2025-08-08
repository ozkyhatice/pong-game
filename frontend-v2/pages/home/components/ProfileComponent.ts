import { Component } from '../../../core/Component.js';
import { getApiUrl, API_CONFIG } from '../../../config.js';
import { Router } from '../../../core/router.js';
import { notify } from '../../../core/notify.js';

declare global {
  var router: Router;
}

export interface UserProfile {
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
  private friendsLoaded: boolean = false;

  constructor(profile: UserProfile) {
    super({ className: 'w-80 h-full flex flex-col mx-auto' });
    this.profile = profile;
    this.render();
  }

  updateProfile(profile: UserProfile): void {
    this.profile = profile;
    this.render();
  }

  private controlAuthEvents(): void {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      notify('Please login first!');
      router.navigate('login');
      return;
    }
  }

  private getAvatarURL(): string {
    if (this.profile.avatar?.startsWith('http')) {
      console.log('Using external avatar URL:', this.profile.avatar);
      return this.profile.avatar;
    } else if (this.profile.avatar?.startsWith('/')) {
      console.log('Using local avatar path:', this.profile.avatar);
      console.log('API Base URL:', getApiUrl(API_CONFIG.BASE_URL));
      console.log('Full avatar URL:', `${getApiUrl(API_CONFIG.BASE_URL)}${this.profile.avatar}`);
      return `${API_CONFIG.BASE_URL}${this.profile.avatar}`;
    } else if (this.profile.username) {
      return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(this.profile.username)}`;
    }
    return `https://api.dicebear.com/9.x/bottts/svg`;
  }

  private render(): void {
    const user = this.profile;
    const username = user.username || user.name || user.email || 'Unknown';
    const wins = user.wins || 0;
    const losses = user.losses || 0;
    const level = user.level || 1;
    const avatar = user.avatar;

    const winRate = wins + losses > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : 0;

    if (this.activeTab === 'friends' && !this.friendsLoaded) {
      this.friendsLoaded = true;
      this.getFriendList().then(() => {
        console.log('Friend list updated:', this.friendList);
        this.render();
        return;
      });
    }
    this.setHTML(`
      <div class="relative bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-shrink-0">
        <!-- Profile Header -->
        <div class="relative bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
          <!-- Action Buttons -->
          <div class="absolute top-3 right-3 flex flex-col space-y-1">
            <button id="profile-settings"
                    class="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd"
                      d="M11.828 2.25c-.916 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 0 1-.517.608 7.45 7.45 0 0 0-.478.198.798.798 0 0 1-.796-.064l-.453-.324a1.875 1.875 0 0 0-2.416.2l-.243.243a1.875 1.875 0 0 0-.2 2.416l.324.453a.798.798 0 0 1 .064.796 7.448 7.448 0 0 0-.198.478.798.798 0 0 1-.608.517l-.55.092a1.875 1.875 0 0 0-1.566 1.849v.344c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 0 1-.064.796l-.324.453a1.875 1.875 0 0 0 .2 2.416l.243.243c.648.648 1.67.733 2.416.2l.453-.324a.798.798 0 0 1 .796-.064c.157.071.316.137.478.198.267.1.47.327.517.608l.092.55c.15.903.932 1.566 1.849 1.566h.344c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 0 1 .517-.608 7.52 7.52 0 0 0 .478-.198.798.798 0 0 1 .796.064l.453.324a1.875 1.875 0 0 0 2.416-.2l.243-.243c.648-.648.733-1.67.2-2.416l-.324-.453a.798.798 0 0 1-.064-.796c.071-.157.137-.316.198-.478.1-.267.327-.47.608-.517l.55-.091a1.875 1.875 0 0 0 1.566-1.85v-.344c0-.916-.663-1.699-1.567-1.85l-.549-.091a.798.798 0 0 1-.608-.517 7.507 7.507 0 0 0-.198-.478.798.798 0 0 1 .064-.796l.324-.453a1.875 1.875 0 0 0-.2-2.416l-.243-.243a1.875 1.875 0 0 0-2.416-.2l-.453.324a.798.798 0 0 1-.796.064 7.462 7.462 0 0 0-.478-.198.798.798 0 0 1-.517-.608l-.091-.55a1.875 1.875 0 0 0-1.85-1.566h-.344ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
                      clip-rule="evenodd"/>
              </svg>
            </button>
            <button id="profile-logout"
                    class="p-1.5 rounded-full bg-white flex items-center justify-center shadow hover:bg-red-50 transition-colors">
              <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd"
                      d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z"
                      clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <!-- Profile Info -->
          <div class="flex items-center">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 text-xl font-bold shadow-lg mr-4">
              ${avatar || username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="text-xl font-bold">${username}</div>
              <div class="text-sm text-blue-100">Level ${level}</div>
            </div>
          </div>
        </div>
        <!-- Stats -->
        <div class="p-4 space-y-3">
          <div class="grid grid-cols-3 gap-3">
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <div class="text-xl font-bold text-green-600">${wins}</div>
              <div class="text-xs text-green-500">Wins</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="text-xl font-bold text-blue-600">${winRate}%</div>
              <div class="text-xs text-blue-500">Win Rate</div>
            </div>
            <div class="text-center p-3 bg-red-50 rounded-lg">
              <div class="text-xl font-bold text-red-600">${losses}</div>
              <div class="text-xs text-red-500">Losses</div>
            </div>
          </div>
        </div>

        <!-- Edit Profile Button !! KALDIRMAYIN TEST YAPIYORUM !! -->
        <div class="mt-4 flex justify-center">
          <button id="edit-profile-btn" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
            Edit Profile Test Page ( silmeyin )
          </button>
        </div>


        <!-- Menu -->
        <div class="mt-4 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-1 flex flex-col">
          <!-- Social Tabs -->
          <div class="flex border-b border-gray-100 flex-shrink-0">
            <!-- Friends Tab -->
            <button class="social-tab flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${this.activeTab === 'friends' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}" data-tab="friends">
              <span class="flex flex-col items-center">
                <svg class="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clip-rule="evenodd" />
                  <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
                </svg>
                Friends
              </span>
            </button>
            <!-- Requests Tab -->
            <button class="social-tab flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${this.activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}" data-tab="requests">
              <span class="flex flex-col items-center">
                <svg class="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                  ${this.activeTab === 'requests' ? `
                  <path d="M19.5 22.5a3 3 0 0 0 3-3v-8.174l-6.879 4.022 3.485 1.876a.75.75 0 1 1-.712 1.321l-5.683-3.06a1.5 1.5 0 0 0-1.422 0l-5.683 3.06a.75.75 0 0 1-.712-1.32l3.485-1.877L1.5 11.326V19.5a3 3 0 0 0 3 3h15Z" />
                  <path d="M1.5 9.589v-.745a3 3 0 0 1 1.578-2.642l7.5-4.038a3 3 0 0 1 2.844 0l7.5 4.038A3 3 0 0 1 22.5 8.844v.745l-8.426 4.926-.652-.351a3 3 0 0 0-2.844 0l-.652.351L1.5 9.589Z" />
                  ` : `
                  <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                  <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                  `}
                </svg>
                Requests
              </span>
            </button>
            <!-- Add Tab -->
            <button class="social-tab flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${this.activeTab === 'add' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}" data-tab="add">
              <span class="flex flex-col items-center">
                <svg class="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM2.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM18.75 7.5a.75.75 0 0 0-1.5 0v2.25H15a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H21a.75.75 0 0 0 0-1.5h-2.25V7.5Z" />
                </svg>
                Add Friend
              </span>
            </button>
          </div>
          <!-- Tab Content -->
          <div class="p-4 flex-1 overflow-y-auto">
            ${this.renderTabContent()}
          </div>
        </div>
      </div>
    `);

    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        router.navigate('avatar-test');
      });
    }
    this.setupEvents();
    this.setupSettingsEvent();
    this.setupLogoutEvent();
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
                  <button id="accept-friend-request-${request.senderInfo.id}" class="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors">
                    Accept
                  </button>
                  <button id="decline-friend-request-${request.senderInfo.id}" class="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
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
                  id="friend-search">
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

  private async setupEvents(): Promise<void> {
    this.controlAuthEvents();
    const tabButtons = this.element.querySelectorAll('.social-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as 'friends' | 'requests' | 'add';
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          if (tab === 'requests') {
            this.getRequestsList().then(() => {
              console.log('Requests list updated:', this.requestsList);
              this.render();
              this.acceptFriendRequestEvents();
              this.declineFriendRequestEvents();
            });
          } else if (tab === 'friends') {
            this.getFriendList().then(() => {
              console.log('Friend list updated:', this.friendList);
              this.render();
            });
          } else if (tab === 'add') {
            this.render();
            this.setupAddFriendEvent();
          }
        }
      });
    });
  }

  private setupAddFriendEvent(): void {
    this.controlAuthEvents();
    const authToken = localStorage.getItem('authToken');
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
            const apiResponse = await response.json();
            const user = apiResponse.user || apiResponse;
            console.log(`Found user:`, user);
            const addResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.ADD(user.id)), {
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
            notify(`${errorData.message}`, 'red');
          }
          searchInput.value = '';
        } catch (error) {
          console.error(error);
          searchInput.value = '';
          notify('An error occurred while sending the friend request. Please try again.');
        }
      }
    });
  }

  private async getFriendList(): Promise<void> {
    this.controlAuthEvents();

    try {
      const authToken = localStorage.getItem('authToken');
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
      notify('An error occurred while fetching the friend list. Please try again.');
    }
  }

  private async getRequestsList(): Promise<void> {
    this.controlAuthEvents();

    try {
      const authToken = localStorage.getItem('authToken');
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
      notify('An error occurred while fetching friend requests. Please try again.');
    }
  }

  private acceptFriendRequestEvents(): void {
    this.controlAuthEvents();
    const authToken = localStorage.getItem('authToken');
    this.requestsList.forEach(request => {
      const acceptButton = this.element.querySelector(`#accept-friend-request-${request.senderInfo.id}`) as HTMLButtonElement;
      if (acceptButton) {
        acceptButton.addEventListener('click', async () => {
          try {
            const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.ACCEPT(request.senderInfo.id)), {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${authToken}`,
              }
            });

            if (response.ok) {
              console.log(`Friend request from ${request.senderInfo.username} accepted`);
              await this.getRequestsList();
              this.render();
              this.acceptFriendRequestEvents();
              this.declineFriendRequestEvents();
            } else {
              const errorData = await response.json();
              console.error(`Error accepting request: ${errorData.message}`);
            }
          } catch (error) {
            console.error(error);
            notify('An error occurred while accepting the friend request. Please try again.');
          }
        });
      }
    });
  }

  private declineFriendRequestEvents(): void {
    this.controlAuthEvents();
    const authToken = localStorage.getItem('authToken');
    this.requestsList.forEach(request => {
      const declineButton = this.element.querySelector(`#decline-friend-request-${request.senderInfo.id}`) as HTMLButtonElement;
      if (declineButton) {
        declineButton.addEventListener('click', async () => {
          try {
            const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.REJECT(request.senderInfo.id)), {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${authToken}`,
              }
            });

            if (response.ok) {
              console.log(`Friend request from ${request.senderInfo.username} declined`);
              await this.getRequestsList();
              this.render();
              this.acceptFriendRequestEvents();
              this.declineFriendRequestEvents();
            } else {
              const errorData = await response.json();
              console.error(`Error declining request: ${errorData.message}`);
            }
          } catch (error) {
            console.error(error);
            notify('An error occurred while declining the friend request. Please try again.');
          }
        });
      }
    });
  }

  private setupSettingsEvent(): void {
    const settingsBtn = this.element.querySelector('#profile-settings') as HTMLButtonElement;
    settingsBtn?.addEventListener('click', () => {
      console.log('Settings button clicked');
      router.navigate('settings');
    });
  }

  private setupLogoutEvent(): void {
    const logoutBtn = this.element.querySelector('#profile-logout') as HTMLButtonElement;
    logoutBtn?.addEventListener('click', () => {
      console.log('Logout button clicked');
      localStorage.removeItem('authToken');
      notify('You have been logged out');
      router.navigate('login');
    });
  }

  public getProfile(): UserProfile {
    return this.profile;
  }
}
