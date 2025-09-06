import { ProfileHeader, UserProfile } from './profile/ProfileHeader.js';
import { SocialTabs } from './profile/SocialTabs.js';
import { safeDOM } from '../../../core/XSSProtection.js';

export class ProfileComponent {
  private element: HTMLElement;
  private profileHeader: ProfileHeader;
  private socialTabs: SocialTabs;

  constructor(profile: UserProfile) {
  this.element = document.createElement('div');
  this.element.className = 'w-full h-auto md:h-full bg-console-bg border-2 border-neon-green rounded shadow-terminal overflow-hidden flex flex-col text-neon-green';

    this.profileHeader = new ProfileHeader(profile);
    this.socialTabs = new SocialTabs();

    this.render();
  }

  private render(): void {
    safeDOM.appendChild(this.element, this.profileHeader.getElement());
    safeDOM.appendChild(this.element, this.socialTabs.getElement());
  }

  getElement(): HTMLElement {
    return this.element;
  }
}

export { UserProfile };
