import { Component } from '../../../core/Component.js';
import { notify } from '../../../core/notify.js';
import { AppState } from '../../../core/AppState.js';
import { GameService } from '../../../services/GameService.js';
import { UserService } from '../../../services/UserService.js';

export class GameAreaComponent extends Component {
  private gameService = new GameService();
  private userService = new UserService();

  constructor() {
    super();
    this.render();
    this.setupEvents();
    this.loadInvites();
    this.listenForInvites();
  }

  private render(): void {
    this.setHTML(`
      <!-- Game Content -->
      <div class="flex-1 p-6 overflow-y-auto">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">🎮 Choose Game Mode</h2>

          <!-- Matchmaking Section -->
          <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 class="text-lg font-semibold text-blue-800 mb-3">🎯 Random Match</h3>
            <p class="text-blue-600 text-sm mb-4">System will find you a random opponent</p>
            <div class="flex space-x-3">
              <button id="join-matchmaking-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Find Random Game
              </button>
              <button id="leave-matchmaking-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors hidden">
                Leave Queue
              </button>
            </div>
            <div id="queue-status" class="mt-2 text-sm text-blue-600 hidden">
              In queue... Looking for opponent...
            </div>
          </div>

          <hr>
          <b>oyun istekleri soldaki menude ve chatde calisiyor!!</b>
          <i> Deploy TEST </i>
          <hr><br>

          <!-- Friend Invite Section -->
          <div class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 class="text-lg font-semibold text-green-800 mb-3">👥 Invite Friend</h3>
            <p class="text-green-600 text-sm mb-4">Invite your friend to play</p>
            <div class="flex space-x-3">
              <input 
                type="text" 
                id="friend-username-input" 
                placeholder="Friend Username" 
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
              <button id="send-invite-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Send Invite
              </button>
            </div>
          </div>

          <!-- Game Invites -->
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">🎯 Game Invites</h3>
            <div id="invites-container" class="space-y-2">
              <div id="no-invites" class="text-gray-500 text-sm text-center py-2">No game invites</div>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  private setupEvents(): void {
    const joinBtn = this.element.querySelector('#join-matchmaking-btn');
    const leaveBtn = this.element.querySelector('#leave-matchmaking-btn');
    const sendBtn = this.element.querySelector('#send-invite-btn');
    const usernameInput = this.element.querySelector('#friend-username-input');
    
    joinBtn?.addEventListener('click', this.handleJoinMatchmaking.bind(this));
    leaveBtn?.addEventListener('click', this.handleLeaveMatchmaking.bind(this));
    sendBtn?.addEventListener('click', this.handleSendInvite.bind(this));
  }

  private handleJoinMatchmaking(): void {
    // Random matchmaking join islemi
  }

  private handleLeaveMatchmaking(): void {
    // Matchmaking queue'dan cikma islemi
  }

  private async handleSendInvite(): Promise<void> {
    const input = this.element.querySelector('#friend-username-input') as HTMLInputElement;
    const username = input?.value.trim();
    
    if (!username) {
      notify('Please enter a username');
      return;
    }

    try {
      const targetUser = await this.userService.getUserByUsername(username);
      if (!targetUser) {
        notify('User not found');
        return;
      }

      const currentUser = await this.userService.getCurrentUser();
      if (!currentUser) {
        notify('Please login');
        return;
      }

      this.gameService.sendGameInvite(targetUser.id, currentUser.username);
      notify(`Game invite sent to ${username}`);
      input.value = '';
    } catch (error) {
      notify('Failed to send invite');
    }
  }

  private loadInvites(): void {
    const invites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    this.displayInvites(invites);
  }

  private listenForInvites(): void {
    this.gameService.onGameInvite((data) => {
      this.addInvite(data);
      notify(`Game invite from ${data.senderUsername}`);
    });

    this.gameService.onInviteAccepted((data) => {
      console.log('Invite accepted data:', data);
      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [],
          createdAt: Date.now()
        });
        notify('Room created! Joining lobby...');
        (window as any).router.navigate('game-lobby');
      }
    });

    this.gameService.onRoomCreated((data) => {
      console.log('Room created data:', data);
      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [],
          createdAt: Date.now()
        });
        notify('Room ready! Joining lobby...');
        (window as any).router.navigate('game-lobby');
      }
    });
  }

  private addInvite(invite: any): void {
    const invites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    
    // Remove old invite from same sender
    const filteredInvites = invites.filter((inv: any) => inv.senderId !== invite.senderId);
    
    // Add new invite with timestamp
    const inviteWithTimestamp = {
      ...invite,
      timestamp: Date.now()
    };
    filteredInvites.push(inviteWithTimestamp);
    
    localStorage.setItem('gameInvites', JSON.stringify(filteredInvites));
    this.displayInvites(filteredInvites);
  }

  private displayInvites(invites: any[]): void {
    const container = this.element.querySelector('#invites-container');
    const noInvites = this.element.querySelector('#no-invites');
    
    if (!container) return;

    // Mevcut davetleri temizle (no-invites hariç)
    container.querySelectorAll('.invite-item').forEach(item => item.remove());

    if (invites.length === 0) {
      if (noInvites) noInvites.classList.remove('hidden');
      return;
    }

    if (noInvites) noInvites.classList.add('hidden');

    invites.forEach(invite => {
      const inviteEl = document.createElement('div');
      inviteEl.className = 'invite-item flex items-center justify-between p-2 bg-white rounded border border-gray-200';
      inviteEl.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
            ${invite.senderUsername?.[0]?.toUpperCase() || 'U'}
          </div>
          <span class="font-medium text-gray-800">${invite.senderUsername || 'Unknown'}</span>
        </div>
        <div class="flex space-x-2">
          <button class="accept-btn px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs">Accept</button>
          <button class="reject-btn px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs">Reject</button>
        </div>
      `;

      // Event listeners
      inviteEl.querySelector('.accept-btn')?.addEventListener('click', () => this.acceptInvite(invite));
      inviteEl.querySelector('.reject-btn')?.addEventListener('click', () => this.rejectInvite(invite));

      container.appendChild(inviteEl);
    });
  }

  private acceptInvite(invite: any): void {
    this.gameService.acceptGameInvite(invite.senderId);
    this.removeInvite(invite.senderId);
    notify('Game invite accepted! Waiting for room...');
    
    // Room bilgisi invite-accepted event'inde gelecek, orada yönlendirme yapacağız
  }

  private rejectInvite(invite: any): void {
    this.removeInvite(invite.senderId);
    notify('Game invite rejected');
  }

  private removeInvite(senderId: number): void {
    const invites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    const filtered = invites.filter((inv: any) => inv.senderId !== senderId);
    localStorage.setItem('gameInvites', JSON.stringify(filtered));
    this.displayInvites(filtered);
  }

}