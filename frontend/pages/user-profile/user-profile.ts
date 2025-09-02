import { AppState } from '../../core/AppState.js';
import { ChatManager } from './components/ChatManager.js';
import { notify } from '../../core/notify.js';
import { getApiUrl, API_CONFIG } from '../../config.js';
import { GameService } from '../../services/GameService.js';

export function init() {
  // Chat elements
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-message-btn') as HTMLButtonElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLElement;
  
  // Sidebar elements
  const userInfoTab = document.getElementById('user-info-tab') as HTMLButtonElement;
  const userSidebar = document.getElementById('user-sidebar') as HTMLElement;
  const closeSidebar = document.getElementById('close-sidebar') as HTMLButtonElement;
  const sidebarOverlay = document.getElementById('sidebar-overlay') as HTMLElement;
  const mainChatArea = document.getElementById('main-chat-area') as HTMLElement;
  const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon') as HTMLElement;
  
  // Other elements
  const challengeBtn = document.getElementById('challenge-btn') as HTMLButtonElement;
  const backBtn = document.getElementById('back-btn') as HTMLButtonElement;

  let currentUserId: number | null = null;
  let currentUsername: string | null = null;
  let friendUserId: number | null = null;
  let chatManager: ChatManager | null = null;
  let isSidebarOpen = false;

  const appState = AppState.getInstance();
  const gameService = new GameService();

  setupEventListeners();
  initCurrentUser();

  function setupEventListeners(): void {
    // Sidebar toggle
    userInfoTab?.addEventListener('click', () => toggleSidebar());
    closeSidebar?.addEventListener('click', () => closeSidebarPanel());
    sidebarOverlay?.addEventListener('click', () => closeSidebarPanel());
    
    // Back button
    backBtn?.addEventListener('click', () => {
      window.history.back();
    });
    
    // Challenge button
    challengeBtn?.addEventListener('click', () => handleChallenge());
    
    // Escape key to close sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        closeSidebarPanel();
      }
    });

    // Game service match history listener
    gameService.onMatchHistory((data) => {
      console.log('Match history received:', data);
      if (data.matches) {
        updateMatchHistoryDisplay(data.matches);
      }
    });
  }

  function toggleSidebar(): void {
    if (isSidebarOpen) {
      closeSidebarPanel();
    } else {
      openSidebarPanel();
    }
  }

  function openSidebarPanel(): void {
    isSidebarOpen = true;
    userSidebar?.classList.remove('translate-x-full');
    sidebarOverlay?.classList.remove('hidden');
    
    // Rotate the toggle icon
    if (sidebarToggleIcon) {
      sidebarToggleIcon.style.transform = 'rotate(180deg)';
    }
  }

  function closeSidebarPanel(): void {
    isSidebarOpen = false;
    userSidebar?.classList.add('translate-x-full');
    sidebarOverlay?.classList.add('hidden');
    
    // Reset the toggle icon
    if (sidebarToggleIcon) {
      sidebarToggleIcon.style.transform = 'rotate(0deg)';
    }
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
      currentUsername = data.user.username;

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
    console.log('Initializing ChatManager with:', {
      currentUserId,
      friendUserId,
      chatInput: !!chatInput,
      sendBtn: !!sendBtn,
      chatMessages: !!chatMessages
    });
    
    if (chatInput && sendBtn && chatMessages && currentUserId && friendUserId) {
      chatManager = new ChatManager(
        chatInput,
        sendBtn,
        chatMessages,
        currentUserId,
        friendUserId
      );
      
      console.log('ChatManager created, loading messages...');
      
      // Load messages immediately after creating the chat manager
      setTimeout(() => {
        if (chatManager) {
          console.log('Calling loadChatMessages...');
          chatManager.loadChatMessages();
        }
      }, 100);
    } else {
      console.error('ChatManager initialization failed - missing elements or user IDs');
    }
  }

  function updatePageContent(user: any): void {
    // Update main header
    const headerUsernameEl = document.getElementById('header-username');
    const headerAvatarEl = document.getElementById('header-user-avatar');
    
    // Update sidebar content
    const usernameEl = document.getElementById('username');
    const avatarEl = document.getElementById('user-avatar');

    if (headerUsernameEl) headerUsernameEl.textContent = user.username;
    if (headerAvatarEl) headerAvatarEl.textContent = user.avatar || user.username.substring(0, 2).toUpperCase();
    if (usernameEl) usernameEl.textContent = user.username;
    if (avatarEl) avatarEl.textContent = user.avatar || user.username.substring(0, 2).toUpperCase();
    
    // Load user stats from API
    loadUserStats(user.id);
    
    // Initialize chat automatically since it's the main view
    if (chatManager) {
      chatManager.loadChatMessages();
    }
  }

  async function loadUserStats(userId: number): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      console.log('Loading stats for user ID:', userId);

      // Use the correct API endpoint from config
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.BY_ID(userId.toString())), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch user stats:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      console.log('User stats API response:', data);
      
      if (data.user) {
        updateStatsDisplay(data.user);
      } else {
        console.error('No user data in response:', data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  function updateStatsDisplay(userData: any): void {
    const wins = userData.wins || 0;
    const losses = userData.losses || 0;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    // Update sidebar stats
    const winsCountEl = document.getElementById('wins-count');
    const lossesCountEl = document.getElementById('losses-count');
    const winRateEl = document.getElementById('win-rate');
    const totalGamesEl = document.getElementById('total-games');

    if (winsCountEl) winsCountEl.textContent = wins.toString();
    if (lossesCountEl) lossesCountEl.textContent = losses.toString();
    if (winRateEl) winRateEl.textContent = `${winRate}%`;
    if (totalGamesEl) totalGamesEl.textContent = totalGames.toString();

    // Load real match history from GameService
    console.log('Requesting match history for user:', userData.id);
    gameService.getMatchHistory(userData.id);

    console.log('Stats updated:', { wins, losses, winRate, totalGames });
  }

  function updateMatchHistoryDisplay(matches: any[]): void {
    const matchHistoryEl = document.getElementById('match-history');
    if (!matchHistoryEl) return;

    if (!matches || matches.length === 0) {
      matchHistoryEl.innerHTML = `
        <div class="text-center text-neon-white/70 py-4">
          <p class="text-sm">No games played yet</p>
        </div>
      `;
      return;
    }

    let matchesHTML = '';
    matches.slice(0, 5).forEach((match, index) => {
      const timeAgo = getTimeAgo(index);
      const isWin = match.result === 'win' || (match.winnerId && match.winnerId === friendUserId);
      const bgColor = isWin ? 'bg-terminal-border border-neon-green border-opacity-50' : 'bg-terminal-border border-neon-red border-opacity-50';
      const iconBg = isWin ? 'bg-neon-green' : 'bg-neon-red';
      const iconText = isWin ? 'W' : 'L';
      const scoreColor = isWin ? 'text-neon-green' : 'text-neon-red';
      const opponentName = match.opponent || match.opponentUsername || 'Unknown Player';
      const score = match.score || `${match.player1Score || 0} - ${match.player2Score || 0}`;
      
      matchesHTML += `
        <div class="flex items-center justify-between p-3 ${bgColor} border rounded-lg">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 ${iconBg} rounded-full flex items-center justify-center text-terminal-border text-xs font-bold">${iconText}</div>
            <div>
              <div class="font-medium text-neon-white text-sm">vs. ${opponentName}</div>
              <div class="text-xs text-neon-white/70">${timeAgo}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold ${scoreColor} text-sm">${score}</div>
          </div>
        </div>
      `;
    });
    
    matchHistoryEl.innerHTML = matchesHTML;
  }

  function getTimeAgo(index: number): string {
    const timeOptions = ['2 hours ago', '5 hours ago', '1 day ago', '2 days ago', '3 days ago'];
    return timeOptions[index] || `${index + 1} days ago`;
  }

  async function handleChallenge() {
    if (!currentUserId || !friendUserId || !currentUsername) {
      notify('User information not available', 'red');
      return;
    }

    try {
      const viewingUser = appState.getViewingUser();
      
      if (!viewingUser) {
        notify('No user selected for challenge', 'red');
        return;
      }

      gameService.sendGameInvite(friendUserId, currentUsername);
      notify(`Game invitation sent to ${viewingUser.username}!`);
      
      // Close sidebar after sending challenge
      closeSidebarPanel();
    } catch (error) {
      console.error('Failed to send game invitation:', error);
      notify('Failed to send game invitation', 'red');
    }
  }

}
