import { Component } from '../../../core/Component.js';
import { notify } from '../../../core/notify.js';

export class GameAreaComponent extends Component {
  constructor() {
    super({ className: 'h-full flex flex-col' });
    this.render();
  }

  private render(): void {
    this.setHTML(`
        <!-- Game Content -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="max-w-2xl mx-auto space-y-6">
            <!-- Quick Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button id="start-game-btn" class="bg-green-500 hover:bg-green-600 text-white py-6 px-6 rounded-lg text-lg font-semibold transition flex items-center justify-center space-x-2">
                <span>🎮</span>
                <span>Start Game</span>
              </button>
              <button class="bg-blue-500 text-white py-6 px-6 rounded-lg text-lg font-semibold flex items-center justify-center space-x-2 opacity-50 cursor-not-allowed">
                <span>⚡</span>
                <span>Quick Match</span>
              </button>
            </div>

            <!-- Game Modes -->
            <div class="bg-gray-50 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Game Modes</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button class="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition text-left opacity-50 cursor-not-allowed">
                  <div class="font-medium text-gray-800">Classic Pong</div>
                  <div class="text-sm text-gray-600">Traditional 1v1 match</div>
                </button>
                <button class="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition text-left opacity-50 cursor-not-allowed">
                  <div class="font-medium text-gray-800">Tournament</div>
                  <div class="text-sm text-gray-600">Compete with multiple players</div>
                </button>
                <button class="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition text-left opacity-50 cursor-not-allowed">
                  <div class="font-medium text-gray-800">Ranked Match</div>
                  <div class="text-sm text-gray-600">Climb the leaderboard</div>
                </button>
                <button class="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition text-left opacity-50 cursor-not-allowed">
                  <div class="font-medium text-gray-800">Private Room</div>
                  <div class="text-sm text-gray-600">Play with friends</div>
                </button>
              </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-gray-50 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div class="text-center text-gray-500 py-8">
                <p>No recent games played</p>
                <p class="text-sm">Start playing to see your match history!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    this.setupEvents();
  }

  private setupEvents(): void {
    const startGameBtn = this.element.querySelector('#start-game-btn');
    const logoutBtn = this.element.querySelector('#logout-btn');

    startGameBtn?.addEventListener('click', () => {
      (window as any).router.navigate('game');
    });

    logoutBtn?.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      notify('Logged out successfully!');
      (window as any).router.navigate('landing');
    });
  }
}