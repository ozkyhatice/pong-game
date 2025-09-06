import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';
import { AuthGuard } from '../../core/auth-guard.js';
import { AppState } from '../../core/AppState.js';
import { ProfileComponent, UserProfile } from './components/ProfileComponent.js';
import { GameAreaComponent } from './components/GameAreaComponent.js';
import { WebSocketManager } from '../../core/WebSocketManager.js';
import { OnlineUsersService } from '../../services/OnlineUsersService.js';
import { ChatService } from '../../services/ChatService.js';
import { UserService } from '../../services/UserService.js';
import { GameService } from '../../services/GameService.js';
import { XSSProtection } from '../../core/XSSProtection.js';


let currentProfileComponent: ProfileComponent | null = null;
let currentGameAreaComponent: GameAreaComponent | null = null;
let currentChatService: ChatService | null = null;
let currentGameService: GameService | null = null;
let isInitialized = false;

function setupHeaderButtons() {
  const logoutBtn = document.getElementById('logout-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const profileBtn = document.getElementById('profile-btn');

  logoutBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('authToken');
      
      const wsManager = WebSocketManager.getInstance();
      wsManager.disconnect();
      
      router.navigate('landing');
      notify('Logged out successfully', 'green');
    }
  });

  settingsBtn?.addEventListener('click', () => {
    router.navigate('profile-settings');
  });

  profileBtn?.addEventListener('click', async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const rawData = await response.json();
        const data = XSSProtection.sanitizeJSON(rawData);
        const appState = AppState.getInstance();
        appState.setViewingUser(data.user);
        router.navigate('own-profile');
      } else {
        notify('Failed to load profile', 'red');
      }
    } catch (error) {
      notify('Error loading profile', 'red');
    }
  });
}

export async function init() {

  
  if (isInitialized) {
    return;
  }
  
  isInitialized = true;
  
  try {
    cleanup();

    const authToken = localStorage.getItem('authToken');
    const profileContainer = document.getElementById('profile-container');
    const gameAreaContainer = document.getElementById('game-area-container');

    if (!profileContainer || !gameAreaContainer) {
      isInitialized = false;
      return;
    }

    setupHeaderButtons();

    if (currentProfileComponent) {
      const existingProfileElement = currentProfileComponent.getElement();
      if (existingProfileElement && existingProfileElement.parentNode) {
        existingProfileElement.parentNode.removeChild(existingProfileElement);
      }
      currentProfileComponent = null;
    }

    if (currentGameAreaComponent) {
      const existingGameAreaElement = currentGameAreaComponent.getElement();
      if (existingGameAreaElement && existingGameAreaElement.parentNode) {
        existingGameAreaElement.parentNode.removeChild(existingGameAreaElement);
      }
      currentGameAreaComponent = null;
    }

    while (profileContainer.firstChild) {
      profileContainer.removeChild(profileContainer.firstChild);
    }
    while (gameAreaContainer.firstChild) {
      gameAreaContainer.removeChild(gameAreaContainer.firstChild);
    }

    const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
      method: 'GET',
      headers: {'Authorization': `Bearer ${authToken}`}
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    
    const apiResponse = await response.json();
    const user: UserProfile = apiResponse.user || apiResponse;
    
    currentProfileComponent = new ProfileComponent(user);
    currentGameAreaComponent = new GameAreaComponent();
    profileContainer.appendChild(currentProfileComponent.getElement());
    gameAreaContainer.appendChild(currentGameAreaComponent.getElement());

    const wsManager = WebSocketManager.getInstance();
    const onlineUsersService = OnlineUsersService.getInstance();
    
    if (!wsManager.isConnected()) {
      
      wsManager.on('connected', () => {
        onlineUsersService.initialize();
      });
      
      wsManager.connect(authToken ?? '');
    } else {
      onlineUsersService.initialize();
    }

    if (!currentChatService) {
      currentChatService = new ChatService();
      
      currentChatService.onNewMessage((message) => {
        const userService = new UserService();
        userService.getUserById(message.from).then(user => {
          notify(`New message from ${user?.username || message.sender}: ${message.content}`);
        });
      });
    }

    if (!currentGameService) {
      currentGameService = new GameService();

      currentGameService.onMatchmakingJoined((data) => {
        notify('Joined matchmaking queue...', 'green');
      });

      currentGameService.onMatchFound((data) => {
        notify('Match found! Preparing game...', 'green');
        if (data.roomId) {
          const appState = AppState.getInstance();
          appState.setCurrentRoom({
            roomId: data.roomId,
            players: data.players || [],
            createdAt: Date.now(),
            isMatchmaking: true
          });
        }
      });

      currentGameService.onRoomCreated((data) => {
        notify('Game room created!', 'green');
        if (data.roomId) {
          const appState = AppState.getInstance();
          appState.setCurrentRoom({
            roomId: data.roomId,
            players: data.players || [],
            createdAt: Date.now()
          });
        }
      });

      currentGameService.onGameStarted((data) => {
        router.navigate('remote-game');
      });

      currentGameService.onStateUpdate((data) => {
        router.navigate('remote-game');
      });

      currentGameService.onGameResumed((data) => {
        router.navigate('remote-game');
      });

      currentGameService.onGamePaused((data) => {
        router.navigate('remote-game');
      });

      currentGameService.onGameOver((data) => {
        
        if (data && data.isTournamentMatch && data.tournamentId) {
          localStorage.setItem('lastTournamentMatchResult', JSON.stringify({
            winner: data.winner,
            finalScore: data.finalScore,
            message: data.message,
            round: data.round,
            timestamp: Date.now()
          }));
        } else {
          if (data) {
            localStorage.setItem('gameResult', JSON.stringify(data));
          }
        }
      });

      currentGameService.onGameInvite((data) => {
        notify(`Game invite from ${data.senderUsername || 'Unknown player'}`, 'blue');
      });

      currentGameService.onInviteAccepted((data) => {
        notify('Game invite accepted! Starting game...', 'green');
      });

      currentGameService.onPlayerLeft((data) => {
        notify('Player left the game', 'red');
        const appState = AppState.getInstance();
        appState.clearCurrentRoom();
      });

      currentGameService.onGameError((data) => {
        notify(data.message || 'Game error occurred', 'red');
      });
    }

    isInitialized = true;
    
  } catch (error) {
    
    isInitialized = false;
    
    AuthGuard.logout();
    notify('Session expired. Please login again.', 'red');
    (window as any).router.navigate('landing');
  }
}

function cleanup() {
  
  try {
    if (currentProfileComponent) {
      if ((currentProfileComponent as any).cleanup && typeof (currentProfileComponent as any).cleanup === 'function') {
        (currentProfileComponent as any).cleanup();
      }
      
      const existingProfileElement = currentProfileComponent.getElement();
      if (existingProfileElement && existingProfileElement.parentNode) {
        existingProfileElement.parentNode.removeChild(existingProfileElement);
      }
      currentProfileComponent = null;
    }

    if (currentGameAreaComponent) {
      if ((currentGameAreaComponent as any).cleanup && typeof (currentGameAreaComponent as any).cleanup === 'function') {
        (currentGameAreaComponent as any).cleanup();
      }
      
      const existingGameAreaElement = currentGameAreaComponent.getElement();
      if (existingGameAreaElement && existingGameAreaElement.parentNode) {
        existingGameAreaElement.parentNode.removeChild(existingGameAreaElement);
      }
      currentGameAreaComponent = null;
    }

    if (currentChatService) {
      if ((currentChatService as any).cleanup && typeof (currentChatService as any).cleanup === 'function') {
        (currentChatService as any).cleanup();
      }
      currentChatService = null;
    }

    if (currentGameService) {
      currentGameService.cleanup();
      currentGameService = null;
    }

    const profileContainer = document.getElementById('profile-container');
    const gameAreaContainer = document.getElementById('game-area-container');
    
    if (profileContainer) {
      while (profileContainer.firstChild) {
        profileContainer.removeChild(profileContainer.firstChild);
      }
    }
    
    if (gameAreaContainer) {
      while (gameAreaContainer.firstChild) {
        gameAreaContainer.removeChild(gameAreaContainer.firstChild);
      }
    }

    const logoutBtn = document.getElementById('logout-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const profileBtn = document.getElementById('profile-btn');

    if (logoutBtn) {
      const newLogoutBtn = logoutBtn.cloneNode(true);
      logoutBtn.parentNode?.replaceChild(newLogoutBtn, logoutBtn);
    }
    if (settingsBtn) {
      const newSettingsBtn = settingsBtn.cloneNode(true);
      settingsBtn.parentNode?.replaceChild(newSettingsBtn, settingsBtn);
    }
    if (profileBtn) {
      const newProfileBtn = profileBtn.cloneNode(true);
      profileBtn.parentNode?.replaceChild(newProfileBtn, profileBtn);
    }

    isInitialized = false;
    
    
  } catch (error) {
    currentProfileComponent = null;
    currentGameAreaComponent = null;
    currentChatService = null;
    currentGameService = null;
    isInitialized = false;
  }
}

export { cleanup };

window.addEventListener('beforeunload', cleanup);

(window as any).homePageCleanup = cleanup;
