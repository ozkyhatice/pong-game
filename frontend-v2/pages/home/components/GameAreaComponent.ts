import { Component } from '../../../core/Component.js';
import { notify } from '../../../core/notify.js';

export class GameAreaComponent extends Component {
  constructor() {
    super();
    this.render();
    this.setupEvents();
  }

  private render(): void {
    this.setHTML(`
      <div id="invite-notifications" class="mb-4"></div>

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

          <!-- invites -->
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div id="invites-item" class="space-y-2">

              <!-- Mocked invite item -->
              <div class="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-sm">A</div>
                  <span class="font-medium text-gray-800">alice</span>
                </div>
                <div class="flex space-x-2">
                  <button class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs">Join</button>
                  <button class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs">Reject</button>
                </div>
              </div>

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

  private handleSendInvite(): void {
    // Arkadas davet gonderme islemi
  }

}