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

  private getAvatarURL(): string {
    const name = this.profile.username;
    if (!name) return 'https://api.dicebear.com/9.x/bottts/svg';
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  }

  private render(): void {
    const username = this.profile.username || 'Unknown';
    const wins = this.profile.wins || 0;
    const losses = this.profile.losses || 0;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

    this.element.className = 'p-6 bg-white/10 backdrop-blur-sm text-center relative';
    this.element.innerHTML = `
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

      <!-- Profile Photo -->
      <div class="mb-4">
        <img src="${this.getAvatarURL()}" alt="Avatar" class="w-20 h-20 rounded-full mx-auto border-3 border-white/50 shadow-lg">
      </div>

      <!-- Username -->
      <h2 class="text-white font-bold text-xl mb-4">${username}</h2>

      <!-- Stats -->
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