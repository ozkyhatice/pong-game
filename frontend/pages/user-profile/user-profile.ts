import { AppState } from '../../core/AppState.js';
import { ChatManager } from './components/ChatManager.js';
import { notify } from '../../core/notify.js';
import { getApiUrl, API_CONFIG } from '../../config.js';
import { GameService } from '../../services/GameService.js';
import { OnlineUsersService } from '../../services/OnlineUsersService.js';
import { WebSocketManager } from '../../core/WebSocketManager.js';
import { UserService } from '../../services/UserService.js';

interface Match {
  id: number;
  player1Id: number;
  player2Id: number;
  player1Score: number;
  player2Score: number;
  winnerId: number | null;
  startedAt: string;
  endedAt: string | null;
  tournamentId: number | null;
  round: number | null;
}

export function init() {
  const userService = new UserService();
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-message-btn') as HTMLButtonElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLElement;

  const userInfoTab = document.getElementById('user-info-tab') as HTMLButtonElement;
  const userSidebar = document.getElementById('user-sidebar') as HTMLElement;
  const closeSidebar = document.getElementById('close-sidebar') as HTMLButtonElement;
  const sidebarOverlay = document.getElementById('sidebar-overlay') as HTMLElement;
  const mainChatArea = document.getElementById('main-chat-area') as HTMLElement;
  const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon') as HTMLElement;

  const challengeBtn = document.getElementById('challenge-btn') as HTMLButtonElement;
  const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
  const removeFriendBtn = document.getElementById('remove-friend-btn') as HTMLButtonElement;
  const blockFriendBtn = document.getElementById('block-friend-btn') as HTMLButtonElement;

  let currentUserId: number | null = null;
  let currentUsername: string | null = null;
  let friendUserId: number | null = null;
  let chatManager: ChatManager | null = null;
  let isSidebarOpen = false;

  const appState = AppState.getInstance();
  const gameService = new GameService();
  const onlineUsersService = OnlineUsersService.getInstance();
  let unsubscribeStatusChange: (() => void) | null = null;

  onlineUsersService.initialize();

  setupEventListeners();
  initCurrentUser();
  setupGameInviteListeners();

  function setupGameInviteListeners(): void {
    gameService.onGameInvite((data: any) => {
      console.log('🎮 USER-PROFILE: Game invite received:', data);
      notify(`Game invite from ${data.senderUsername || 'Unknown player'}`, 'blue');
    });

    gameService.onInviteAccepted((data: any) => {
      console.log('🎮 USER-PROFILE: Game invite Recent Maed:', data);
      notify('Game invite accepted! Starting game...', 'green');

      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [currentUserId, friendUserId],
          createdAt: Date.now()
        });

        (window as any).router.navigate('game-lobby');
      }
    });

    gameService.onRoomCreated((data: any) => {
      console.log('🎮 USER-PROFILE: Room created for game invite:', data);
      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [],
          createdAt: Date.now()
        });

        (window as any).router.navigate('game-lobby');
      }
    });

    gameService.onGameError((data: any) => {
      console.log('🎮 USER-PROFILE: Game error:', data);
      notify(data.message || 'Game error occurred', 'red');
    });
  }

  function setupEventListeners(): void {
    userInfoTab?.addEventListener('click', () => toggleSidebar());
    closeSidebar?.addEventListener('click', () => closeSidebarPanel());
    sidebarOverlay?.addEventListener('click', () => closeSidebarPanel());

	backBtn?.addEventListener('click', () => {
      window.history.back();
    });

    challengeBtn?.addEventListener('click', () => handleChallenge());
    removeFriendBtn?.addEventListener('click', () => handleRemoveFriend());
    blockFriendBtn?.addEventListener('click', () => handleBlockFriend());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        closeSidebarPanel();
      }
    });
  }

  function setupOnlineStatusListener(): void {
    console.log('Setting up online status listener for friendUserId:', friendUserId);
    unsubscribeStatusChange = onlineUsersService.onStatusChange(() => {
      console.log('Online status changed, updating friend status');
      if (friendUserId) {
        updateFriendOnlineStatus();
      }
    });
  }

  function getFriendOnlineStatus(): { isOnline: boolean } {
    if (!friendUserId) {
      console.log('No friendUserId set');
      return { isOnline: false };
    }

    const userStatus = onlineUsersService.getUserStatus(friendUserId);
    console.log('Friend status for ID', friendUserId, ':', userStatus);

    return {
      isOnline: userStatus ? userStatus.status === 'online' : false
    };
  }

  function updateFriendOnlineStatus(): void {
    const waitingElement = document.querySelector('.waiting-status');
    if (!waitingElement) {
      console.log('Waiting status element not found');
      return;
    }

    const status = getFriendOnlineStatus();
    console.log('Updating friend status:', status);

    if (status.isOnline) {
      waitingElement.innerHTML = `
        <span class="text-[10px] font-bold text-neon-green">> YOUR FRIEND IS ONLINE</span>
      `;
    } else {
      waitingElement.innerHTML = `
        <span class="text-[10px] font-bold text-neon-red">> YOUR FRIEND IS OFFLINE</span>
      `;
    }
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

    if (sidebarToggleIcon) {
      sidebarToggleIcon.style.transform = 'rotate(180deg)';
    }

    loadMatchHistory();
  }

  function closeSidebarPanel(): void {
    isSidebarOpen = false;
    userSidebar?.classList.add('translate-x-full');
    sidebarOverlay?.classList.add('hidden');

    if (sidebarToggleIcon) {
      sidebarToggleIcon.style.transform = 'rotate(0deg)';
    }
  }

  async function initCurrentUser(): Promise<void> {
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
        console.log('Set friendUserId to:', friendUserId, 'for user:', viewingUser);
        updatePageContent(viewingUser);
        initializeChatManager();
      } else {
        console.error('No user selected to view');
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

  async function updatePageContent(user: any): Promise<void> {

	const userInfo = await userService.getUserById(user.id);

	if (userInfo) {
	  const headerUsernameEl = document.getElementById('header-username');
	  const headerAvatarImgEl = document.getElementById('header-user-avatar-img') as HTMLImageElement;
	  const sidebarAvatarImgEl = document.getElementById('sidebar-user-avatar-img') as HTMLImageElement;

	  console.log('Updating sidebar content for user:', user);
		const usernameEl = document.getElementById('username');
		if (headerAvatarImgEl) headerAvatarImgEl.src = userInfo.avatar || 'https://placehold.co/400x400?text=Player';
		if (headerUsernameEl) headerUsernameEl.textContent = user.username;
		if (usernameEl) usernameEl.textContent = user.username;
		if (sidebarAvatarImgEl) sidebarAvatarImgEl.src = userInfo.avatar || 'https://placehold.co/400x400?text=Player';
	}
    loadUserStats(user.id);

    if (unsubscribeStatusChange) {
      unsubscribeStatusChange();
    }
    setupOnlineStatusListener();

    updateFriendOnlineStatusWithRetry();

    if (chatManager) {
      chatManager.loadChatMessages();
    }
  }
function updateFriendOnlineStatusWithRetry(attempt: number = 1): void {
    console.log(`Attempting to update friend status, attempt ${attempt}`);

    const wsManager = WebSocketManager.getInstance();
    const isWSConnected = wsManager.isConnected();
    console.log('WebSocket connected:', isWSConnected);

    const hasUsers = onlineUsersService.getAllUsers().length > 0;
    console.log('OnlineUsersService has users:', hasUsers);

    if ((isWSConnected && hasUsers) || attempt > 5) {
      updateFriendOnlineStatus();
    } else {
      if (!isWSConnected && attempt <= 2) {
        const token = localStorage.getItem('authToken');
        if (token) {
          console.log('Attempting WebSocket reconnection...');
          wsManager.connect(token);
        }
      }

      setTimeout(() => {
        updateFriendOnlineStatusWithRetry(attempt + 1);
      }, 1000 * attempt);
    }
}

async function loadUserStats(userId: number): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      console.log('Loading stats for user ID:', userId);

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

function updateStatsDisplay(userData: any) {
    const wins = userData.wins || 0;
    const losses = userData.losses || 0;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    const winsCountEl = document.getElementById('wins-count');
    const lossesCountEl = document.getElementById('losses-count');
    const winRateEl = document.getElementById('win-rate');
    const totalGamesEl = document.getElementById('total-games');

    if (winsCountEl) winsCountEl.textContent = wins.toString();
    if (lossesCountEl) lossesCountEl.textContent = losses.toString();
    if (winRateEl) winRateEl.textContent = `${winRate}%`;
    if (totalGamesEl) totalGamesEl.textContent = totalGames.toString();

  const matchHistoryEl = document.getElementById('match-history');
  const matchHistory = gameService.getMatchHistory(userData.id);
  console.log('Match history:', matchHistory);
  console.log('user data:', userData);

	console.log('Stats updated:', { wins, losses, winRate, totalGames });
  }

  function getTimeAgo(date: Date | number): string {
    if (typeof date === 'number') {
      // Old behavior for compatibility
      const timeOptions = ['2 hours ago', '5 hours ago', '1 day ago', '2 days ago', '3 days ago'];
      return timeOptions[date] || `${date + 1} days ago`;
    }

    // New behavior for Date objects with date and time display
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
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

async function handleRemoveFriend() {
    if (!friendUserId) {
      notify('NO FRIEND SELECTED', 'red');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        notify('NO AUTHENTICATION TOKEN FOUND', 'red');
        return;
      }

      const viewingUser = appState.getViewingUser();
      if (!viewingUser) {
        notify('NO USER SELECTED', 'red');
        return;
      }

      console.log('Calling remove friend API with friendUserId:', friendUserId);

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.REMOVE(friendUserId.toString())), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Remove friend error response:', errorData);
        throw new Error(`Failed to remove friend: ${response.status} ${response.statusText} - ${errorData}`);
      }

      notify(`Removed ${viewingUser.username} from friends`, 'green');

      setTimeout(() => {
        router.navigate('home');
      }, 1000);

    } catch (error) {
      console.error('Error removing friend:', error);
      notify('Failed to remove friend', 'red');
    }
}

async function handleBlockFriend() {
    if (!friendUserId) {
      notify('NO FRIEND SELECTED', 'red');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        notify('NO AUTHENTICATION TOKEN FOUND', 'red');
        return;
      }

      const viewingUser = appState.getViewingUser();
      if (!viewingUser) {
        notify('NO USER SELECTED', 'red');
        return;
      }

      console.log('Calling block friend API with friendUserId:', friendUserId);

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.BLOCK(friendUserId.toString())), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Block friend error response:', errorData);
        throw new Error(`Failed to block user: ${response.status} ${response.statusText} - ${errorData}`);
      }

      notify(`Blocked ${viewingUser.username}`, 'green');

      setTimeout(() => {
        router.navigate('home');
      }, 1000);

    } catch (error) {
      console.error('Error blocking user:', error);
      notify('Failed to block user', 'red');
    }
  }

  async function loadMatchHistory(): Promise<void> {
    if (!friendUserId) {
      console.log('No friend user ID available for match history');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.GAME.MATCH_HISTORY(friendUserId.toString())), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load match history: ${response.status}`);
      }

      const data = await response.json();
      displayMatchHistory(data.matches || []);
    } catch (error) {
      console.error('Error loading match history:', error);
      // Show a message if loading fails
      const matchHistoryContainer = document.getElementById('match-history');
      if (matchHistoryContainer) {
        matchHistoryContainer.innerHTML = `
          <div class="text-center text-neon-white/70 py-4">
            <p class="text-sm">Unable to load match history</p>
          </div>
        `;
      }
    }
  }

  async function displayMatchHistory(matches: Match[]): Promise<void> {
    const matchHistoryContainer = document.getElementById('match-history');
    if (!matchHistoryContainer) return;

    if (matches.length === 0) {
      matchHistoryContainer.innerHTML = `
        <div class="text-center text-neon-white/70 py-4">
          <p class="text-sm">No matches found</p>
        </div>
      `;
      return;
    }

    // Get usernames for player IDs
    const userService = new UserService();
    const matchElements: string[] = [];

    for (const match of matches.slice(0, 5)) { // Show only last 5 matches
      try {
        const isPlayer1 = match.player1Id === friendUserId;
        const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
        const userScore = isPlayer1 ? match.player1Score : match.player2Score;
        const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;

        // Get opponent's username
        const opponent = await userService.getUserById(opponentId);
        const opponentUsername = opponent?.username || 'Unknown';

        const isWin = match.winnerId === friendUserId;
        const resultClass = isWin ? 'neon-green' : 'neon-red';
        const resultBorderClass = isWin ? 'border-neon-green' : 'border-neon-red';
        const resultLetter = isWin ? 'W' : 'L';

        // Format date
        const matchDate = new Date(match.endedAt || match.startedAt);
        const timeAgo = getTimeAgo(matchDate);

        matchElements.push(`
          <div class="flex items-center justify-between p-3 bg-terminal-border border border-${resultClass} border-opacity-50 rounded-lg">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-${resultClass} rounded-full flex items-center justify-center text-terminal-border text-xs font-bold">${resultLetter}</div>
              <div>
                <div class="font-medium text-neon-white text-sm">vs. ${opponentUsername}</div>
                <div class="text-xs text-neon-white/70">${timeAgo}</div>
                ${match.tournamentId ? '<div class="text-xs text-neon-purple">Tournament</div>' : ''}
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-${resultClass} text-sm whitespace-nowrap">${userScore} - ${opponentScore}</div>
            </div>
          </div>
        `);
      } catch (error) {
        console.error('Error processing match:', error);
      }
    }

    matchHistoryContainer.innerHTML = matchElements.join('');
  }

  function cleanup(): void {
    if (unsubscribeStatusChange) {
      unsubscribeStatusChange();
      unsubscribeStatusChange = null;
    }

    // ChatManager cleanup is handled automatically
    if (chatManager) {
      chatManager = null;
    }

    console.log('🧹 USER-PROFILE: Cleanup completed');
  }

  (window as any).userProfileCleanup = cleanup;
}

export function cleanup() {
  console.log('🧹 USER-PROFILE: Cleaning up user-profile page...');
  if ((window as any).userProfileCleanup) {
    (window as any).userProfileCleanup();
  }
}
