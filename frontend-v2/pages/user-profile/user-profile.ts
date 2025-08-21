import { AppState } from '../../core/AppState.js';
import { ChatManager } from './components/ChatManager.js';
import { notify } from '../../core/notify.js';
import { getApiUrl, API_CONFIG } from '../../config.js';
import { GameService } from '../../services/GameService.js';

export function init() {
  const matchesTab = document.getElementById('matches-tab') as HTMLButtonElement;
  const chatTab = document.getElementById('chat-tab') as HTMLButtonElement;
  const matchesContent = document.getElementById('matches-content') as HTMLElement;
  const chatContent = document.getElementById('chat-content') as HTMLElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-message-btn') as HTMLButtonElement;
  const challengeBtn = document.getElementById('challenge-btn') as HTMLButtonElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLElement;

  let currentUserId: number | null = null;
  let friendUserId: number | null = null;
  let chatManager: ChatManager | null = null;

  const appState = AppState.getInstance();
  const gameService = new GameService();

  setupEventListeners();
  initCurrentUser();

  function setupEventListeners(): void {
    matchesTab?.addEventListener('click', () => showTab('matches'));
    chatTab?.addEventListener('click', () => showTab('chat'));
    challengeBtn?.addEventListener('click', () => handleChallenge());
  }

  async function initCurrentUser(): Promise<void> {
    // user bilgisi authtoken ile 
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        notify('No auth token found');
        return;
      }

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        notify('Failed to get current user');
        return;
      }

      const data = await response.json();
      currentUserId = data.user.id;

      const viewingUser = appState.getViewingUser();
      if (viewingUser) {
        friendUserId = viewingUser.id;
        updatePageContent(viewingUser);
        initializeChatManager();
      } else {
        notify('No user selected to view');
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      notify('Failed to load user data');
    }
  }

  function initializeChatManager(): void {
    if (chatInput && sendBtn && chatMessages && currentUserId && friendUserId) {
      chatManager = new ChatManager(
        chatInput,
        sendBtn,
        chatMessages,
        currentUserId,
        friendUserId
      );
    }
  }

  function updatePageContent(user: any): void {
    const usernameEl = document.getElementById('username');
    const avatarEl = document.getElementById('user-avatar');
    const chatTitleEl = document.querySelector('#chat-content h3');

    if (usernameEl) usernameEl.textContent = user.username;
    if (avatarEl) avatarEl.textContent = user.avatar || user.username.substring(0, 2).toUpperCase();
    if (chatTitleEl) chatTitleEl.textContent = `Chat with ${user.username}`;
  }

  function showTab(tabName: 'matches' | 'chat'): void {
    const activeClass = 'flex-1 px-6 py-4 text-center font-medium text-blue-600 border-b-2 border-blue-600 bg-blue-50';
    const inactiveClass = 'flex-1 px-6 py-4 text-center font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors';

    if (tabName === 'matches') {
      matchesTab.className = activeClass;
      chatTab.className = inactiveClass;
      matchesContent.classList.remove('hidden');
      chatContent.classList.add('hidden');
    } else {
      chatTab.className = activeClass;
      matchesTab.className = inactiveClass;
      chatContent.classList.remove('hidden');
      matchesContent.classList.add('hidden');

      if (chatManager) {
        chatManager.loadChatMessages();
      }
    }
  }

  async function handleChallenge() {
    if (!currentUserId || !friendUserId) {
      notify('No user selected for challenge', 'red');
      return;
    }

    try {
      const viewingUser = appState.getViewingUser();
      
      if (!viewingUser) {
        notify('No user selected for challenge', 'red');
        return;
      }

      gameService.sendGameInvite(friendUserId, viewingUser.username);
      notify(`Game invitation sent to ${viewingUser.username}!`);
    } catch (error) {
      console.error('Failed to send game invitation:', error);
      notify('Failed to send game invitation', 'red');
    }
  }

}
