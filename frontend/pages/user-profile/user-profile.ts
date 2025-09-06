import { AppState } from '../../core/AppState.js';
import { ChatManager } from './components/ChatManager.js';
import { notify } from '../../core/notify.js';
import { getApiUrl, API_CONFIG } from '../../config.js';
import { GameService } from '../../services/GameService.js';
import { OnlineUsersService } from '../../services/OnlineUsersService.js';
import { WebSocketManager } from '../../core/WebSocketManager.js';
import { UserService } from '../../services/UserService.js';
import { XSSProtection, safeDOM } from '../../core/XSSProtection.js';

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
      notify(`Game invite from ${data.senderUsername || 'Unknown player'}`, 'blue');
    });

    gameService.onInviteAccepted((data: any) => {
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
    unsubscribeStatusChange = onlineUsersService.onStatusChange(() => {
      if (friendUserId) {
        updateFriendOnlineStatus();
      }
    });
  }

  function getFriendOnlineStatus(): { isOnline: boolean } {
    if (!friendUserId) {
      return { isOnline: false };
    }

    const userStatus = onlineUsersService.getUserStatus(friendUserId);

    return {
      isOnline: userStatus ? userStatus.status === 'online' : false
    };
  }

  function updateFriendOnlineStatus(): void {
    const waitingElement = document.querySelector('.waiting-status');
    if (!waitingElement) {
      return;
    }

    const status = getFriendOnlineStatus();

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
        updatePageContent(viewingUser);
        initializeChatManager();
      } else {
        notify('No user selected to view');
      }
    } catch (error) {
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


      setTimeout(() => {
        if (chatManager) {
          chatManager.loadChatMessages();
        }
      }, 100);
    } 
  }

  async function updatePageContent(user: any): Promise<void> {

	const userInfo = await userService.getUserById(user.id);

	if (userInfo) {
	  const headerUsernameEl = document.getElementById('header-username');
	  const headerAvatarImgEl = document.getElementById('header-user-avatar-img') as HTMLImageElement;
	  const sidebarAvatarImgEl = document.getElementById('sidebar-user-avatar-img') as HTMLImageElement;

		const usernameEl = document.getElementById('username');
		if (headerAvatarImgEl) headerAvatarImgEl.src = userInfo.avatar || 'https://placehold.co/400x400?text=Player';
		if (headerUsernameEl) safeDOM.setText(headerUsernameEl, XSSProtection.cleanInput(user.username));
		if (usernameEl) safeDOM.setText(usernameEl, XSSProtection.cleanInput(user.username));
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

    const wsManager = WebSocketManager.getInstance();
    const isWSConnected = wsManager.isConnected();

    const hasUsers = onlineUsersService.getAllUsers().length > 0;

    if ((isWSConnected && hasUsers) || attempt > 5) {
      updateFriendOnlineStatus();
    } else {
      if (!isWSConnected && attempt <= 2) {
        const token = localStorage.getItem('authToken');
        if (token) {
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


	  const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.BY_ID(userId.toString())), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.user) {
        updateStatsDisplay(data.user);
      }
    } catch (error) {}
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

    if (winsCountEl) safeDOM.setText(winsCountEl, wins.toString());
    if (lossesCountEl) safeDOM.setText(lossesCountEl, losses.toString());
    if (winRateEl) safeDOM.setText(winRateEl, `${winRate}%`);
    if (totalGamesEl) safeDOM.setText(totalGamesEl, totalGames.toString());

  const matchHistoryEl = document.getElementById('match-history');
  const matchHistory = gameService.getMatchHistory(userData.id);

  }

  function getTimeAgo(date: Date | number): string {
    if (typeof date === 'number') {
      const timeOptions = ['2 hours ago', '5 hours ago', '1 day ago', '2 days ago', '3 days ago'];
      return timeOptions[date] || `${date + 1} days ago`;
    }

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

      closeSidebarPanel();
    } catch (error) {
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


      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.REMOVE(friendUserId.toString())), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to remove friend: ${response.status} ${response.statusText} - ${errorData}`);
      }

      notify(`Removed ${viewingUser.username} from friends`, 'green');

      setTimeout(() => {
        router.navigate('home');
      }, 1000);

    } catch (error) {
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

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.BLOCK(friendUserId.toString())), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to block user: ${response.status} ${response.statusText} - ${errorData}`);
      }

      notify(`Blocked ${viewingUser.username}`, 'green');

      setTimeout(() => {
        router.navigate('home');
      }, 1000);

    } catch (error) {
      notify('Failed to block user', 'red');
    }
  }

  async function loadMatchHistory(): Promise<void> {
    if (!friendUserId) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
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

    const userService = new UserService();
    const matchElements: string[] = [];

    for (const match of matches.slice(0, 5)) {
      try {
        const isPlayer1 = match.player1Id === friendUserId;
        const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
        const userScore = isPlayer1 ? match.player1Score : match.player2Score;
        const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;

        const opponent = await userService.getUserById(opponentId);
        const opponentUsername = opponent?.username || 'Unknown';

        const isWin = match.winnerId === friendUserId;
        const resultClass = isWin ? 'neon-green' : 'neon-red';
        const resultBorderClass = isWin ? 'border-neon-green' : 'border-neon-red';
        const resultLetter = isWin ? 'W' : 'L';

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
      } catch (error) {}
    }

    matchHistoryContainer.innerHTML = matchElements.join('');
  }

  function cleanup(): void {
    if (unsubscribeStatusChange) {
      unsubscribeStatusChange();
      unsubscribeStatusChange = null;
    }

    if (chatManager) {
      chatManager = null;
    }
  }

  (window as any).userProfileCleanup = cleanup;
}

export function cleanup() {
  if ((window as any).userProfileCleanup) {
    (window as any).userProfileCleanup();
  }
}
