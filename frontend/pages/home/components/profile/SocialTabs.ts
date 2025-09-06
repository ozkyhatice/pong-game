import { FriendsTab } from './FriendsTab.js';
import { RequestsTab } from './RequestsTab.js';
import { AddFriendTab } from './AddFriendTab.js';
import { safeDOM } from '../../../../core/XSSProtection.js';

export class SocialTabs {
  private element: HTMLElement;
  private activeTab: 'friends' | 'requests' | 'add' = 'friends';
  private friendsTab: FriendsTab;
  private requestsTab: RequestsTab;
  private addFriendTab: AddFriendTab;
  private contentContainer!: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'flex-1 bg-terminal-border flex flex-col';

    this.friendsTab = new FriendsTab();
    this.requestsTab = new RequestsTab();
    this.addFriendTab = new AddFriendTab();

    this.render();
    this.setupEvents();

    this.friendsTab.loadFriends();
  }

  private render(): void {
    safeDOM.setHTML(this.element, `
      <!-- Tab Headers -->
      <div class="flex bg-console-bg">
        <button class="tab-btn flex-1 px-2 py-2 md:px-3 md:py-3 text-center text-xs font-medium transition-all duration-300 ${
          this.activeTab === 'friends' 
            ? 'text-neon-green border-b-2 border-neon-green bg-header-gradient shadow-[4px_0_12px_rgba(0,255,102,0.4)] relative z-10' 
            : 'text-neon-green hover:bg-black/20'
        }" data-tab="friends">
          <div class="flex flex-col items-center">
            <div class="mb-1">
              <svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clip-rule="evenodd"/>
                <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z"/>
              </svg>
            </div>
            <span class="text-xs">FRIENDS</span>
          </div>
        </button>

        <button class="tab-btn flex-1 px-2 py-2 md:px-3 md:py-3 text-center text-xs font-medium transition-all duration-300 ${
          this.activeTab === 'requests' 
            ? 'text-neon-green border-b-2 border-neon-green bg-header-gradient shadow-[-4px_0_12px_rgba(0,255,102,0.4),4px_0_12px_rgba(0,255,102,0.4)] relative z-10' 
            : 'text-neon-green hover:bg-black/20'
        }" data-tab="requests">
          <div class="flex flex-col items-center">
            <div class="mb-1">
              <svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
              ${this.activeTab === 'requests' ? `
                <path d="M19.5 22.5a3 3 0 0 0 3-3v-8.174l-6.879 4.022 3.485 1.876a.75.75 0 1 1-.712 1.321l-5.683-3.06a1.5 1.5 0 0 0-1.422 0l-5.683 3.06a.75.75 0 0 1-.712-1.32l3.485-1.877L1.5 11.326V19.5a3 3 0 0 0 3 3h15Z" />
                <path d="M1.5 9.589v-.745a3 3 0 0 1 1.578-2.642l7.5-4.038a3 3 0 0 1 2.844 0l7.5 4.038A3 3 0 0 1 22.5 8.844v.745l-8.426 4.926-.652-.351a3 3 0 0 0-2.844 0l-.652.351L1.5 9.589Z" />
                ` : `
                <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                `}
              </svg>
            </div>
            <span class="text-xs">REQUESTS</span>
          </div>
        </button>

        <button class="tab-btn flex-1 px-2 py-2 md:px-3 md:py-3 text-center text-xs font-medium transition-all duration-300 ${
          this.activeTab === 'add' 
            ? 'text-neon-green border-b-2 border-neon-green bg-header-gradient shadow-[-4px_0_12px_rgba(0,255,102,0.4)] relative z-10' 
            : 'text-neon-green hover:bg-black/20'
        }" data-tab="add">
          <div class="flex flex-col items-center">
            <div class="mb-1">
              <svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM2.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM18.75 7.5a.75.75 0 0 0-1.5 0v2.25H15a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H21a.75.75 0 0 0 0-1.5h-2.25V7.5Z"/>
              </svg>
            </div>
            <span class="text-xs">ADD</span>
          </div>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 p-2 md:p-3 overflow-y-auto" id="tab-content">
        <!-- Content will be inserted here -->
      </div>
    `);

    this.contentContainer = this.element.querySelector('#tab-content') as HTMLElement;
    this.showTabContent();
  }

  private setupEvents(): void {
    this.element.onclick = (e) => {
      const target = e.target as HTMLElement;

      if (target.closest('.tab-btn')) {
        const tab = target.closest('.tab-btn')?.getAttribute('data-tab') as 'friends' | 'requests' | 'add';
        if (tab && tab !== this.activeTab) {
          this.switchTab(tab);
        }
        return;
      }
    };
  }

  private switchTab(tab: 'friends' | 'requests' | 'add'): void {
    this.activeTab = tab;
    this.render();

    if (tab === 'friends') {
      this.friendsTab.loadFriends();
    } else if (tab === 'requests') {
      this.requestsTab.loadRequests();
    }
  }

  private showTabContent(): void {
    // Clear content safely
    if (this.contentContainer) {
      this.contentContainer.innerHTML = '';

      switch (this.activeTab) {
        case 'friends':
          safeDOM.appendChild(this.contentContainer, this.friendsTab.getElement());
          break;
        case 'requests':
          safeDOM.appendChild(this.contentContainer, this.requestsTab.getElement());
          break;
        case 'add':
          safeDOM.appendChild(this.contentContainer, this.addFriendTab.getElement());
          break;
      }
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
