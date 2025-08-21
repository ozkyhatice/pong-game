import { ProfileHeader, UserProfile } from './profile/ProfileHeader.js';
import { SocialTabs } from './profile/SocialTabs.js';

export class ProfileComponent {
  private element: HTMLElement;
  private profileHeader: ProfileHeader;
  private socialTabs: SocialTabs;

  constructor(profile: UserProfile) {
    this.element = document.createElement('div');
    this.element.className = 'h-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-xl shadow-xl overflow-hidden flex flex-col';
    
    this.profileHeader = new ProfileHeader(profile);
    this.socialTabs = new SocialTabs();
    
    this.render();
  }

  private render(): void {
    this.element.appendChild(this.profileHeader.getElement());
    this.element.appendChild(this.socialTabs.getElement());
  }

  getElement(): HTMLElement {
    return this.element;
  }
}

export { UserProfile };