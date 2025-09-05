import { notify } from '../../../../core/notify.js';
import { AuthGuard } from '../../../../core/auth-guard.js';

export interface UserProfile {
  id?: string;
  username?: string;
  email?: string;
  wins?: number;
  losses?: number;
  avatar?: string;
}

export class ProfileHeader {
  private profile: UserProfile;
  private element: HTMLElement;

  constructor(profile: UserProfile) {
    this.profile = profile;
    this.element = document.createElement('div');
    this.render();
    this.setupEvents();
  }

  private render(): void {
    const username = this.profile.username || 'Unknown';
    const avatar = this.profile.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
    const wins = this.profile.wins || 0;
    const losses = this.profile.losses || 0;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

    this.element.className = 'bg-terminal-bg rounded flex-shrink-0';
    this.element.innerHTML = `
      <!-- Terminal Header -->
      <div class="bg-header-gradient rounded-t px-3 py-2 border-b border-neon-green flex items-center justify-center">
        <div class="text-neon-green text-xs font-bold tracking-wide" style="text-shadow: 0 0 5px #39FF14;">
          PLAYER.exe
        </div>
      </div>

      <!-- System Status -->
      <div class="bg-console-bg px-3 py-1 md:py-2 border-b border-neon-green border-opacity-30 text-[10px] leading-relaxed">
        <div class="flex items-center gap-1 mb-1">
          <div class="w-1 h-1 bg-neon-green rounded-full animate-pulse"></div>
          <span>PLAYER STATUS: ONLINE</span>
        </div>
        <div class="text-neon-blue">
          > START YOUR GAME...</span>
        </div>
      </div>

      <!-- Profile Data -->
      <div class="bg-console-bg p-2 md:p-3 border-b border-neon-green border-opacity-30">
        <!-- Profile Photo and Info -->
        <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <img src="${avatar}" alt="Avatar" class="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-neon-blue shadow-[0_0_8px_#62a6fa]">
          <div>
            <div class="text-neon-white text-sm md:text-md font-bold">${username}</div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-3 gap-1 text-[10px]">
          <div class="text-center p-1 md:p-2 bg-black bg-opacity-60 border border-neon-green border-opacity-50 rounded-sm">
            <div class="text-neon-green text-xs font-bold">${wins}</div>
            <div class="text-neon-white text-[9px] opacity-70">WINS</div>
          </div>
          <div class="text-center p-1 md:p-2 bg-black bg-opacity-60 border border-neon-red border-opacity-50 rounded-sm">
            <div class="text-neon-red text-xs font-bold">${losses}</div>
            <div class="text-neon-white text-[9px] opacity-70">LOSS</div>
          </div>
          <div class="text-center p-1 md:p-2 bg-black bg-opacity-60 border border-neon-blue border-opacity-50 rounded-sm">
            <div class="text-neon-blue text-xs font-bold">${winRate}%</div>
            <div class="text-neon-white text-[9px] opacity-70">RATE</div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEvents(): void {
    this.element.onclick = (e) => {
      const target = e.target as HTMLElement;

      if (target.closest('#settings-btn')) {
        (window as any).router.navigate('profile-settings');
      }

      if (target.closest('#logout-btn')) {
        AuthGuard.logout();
        notify('Logged out successfully!');
        (window as any).router.navigate('landing');
      }
    };
  }

  getElement(): HTMLElement {
    return this.element;
  }
}