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

// Global variables to prevent duplicate component creation
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
      // Clear auth token and redirect to landing
      localStorage.removeItem('authToken');
      
      // Disconnect WebSocket
      const wsManager = WebSocketManager.getInstance();
      wsManager.disconnect();
      
      // Navigate to landing page
      router.navigate('landing');
      notify('Logged out successfully', 'green');
    }
  });

  settingsBtn?.addEventListener('click', () => {
    // Navigate to profile settings
    router.navigate('profile-settings');
  });

  profileBtn?.addEventListener('click', async () => {
    try {
      // Get current user data and navigate to their profile
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Set viewing user to self and navigate
        const appState = AppState.getInstance();
        appState.setViewingUser(data.user);
        router.navigate('own-profile');
      } else {
        notify('Failed to load profile', 'red');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      notify('Error loading profile', 'red');
    }
  });
}

export async function init() {
  console.log('🔄 Initializing home page...');
  
  // Prevent multiple simultaneous initializations
  if (isInitialized) {
    console.log('⚠️ Home page already initialized, skipping...');
    return;
  }
  
  // Set flag immediately to prevent concurrent calls
  isInitialized = true;
  
  try {
    // Her init çağrısında önce cleanup yap
    cleanup();

    const authToken = localStorage.getItem('authToken');
    const profileContainer = document.getElementById('profile-container');
    const gameAreaContainer = document.getElementById('game-area-container');

    if (!profileContainer || !gameAreaContainer) {
      console.error('Required containers not found');
      isInitialized = false; // Reset on error
      return;
    }

    // Setup header buttons
    setupHeaderButtons();

    // Clean up existing components only if they exist
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

    // Force clear containers
    while (profileContainer.firstChild) {
      profileContainer.removeChild(profileContainer.firstChild);
    }
    while (gameAreaContainer.firstChild) {
      gameAreaContainer.removeChild(gameAreaContainer.firstChild);
    }

    // Game Area component'ini olustur
    
    // User profile verisini al
    const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
      method: 'GET',
      headers: {'Authorization': `Bearer ${authToken}`}
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    
    const apiResponse = await response.json();
    const user: UserProfile = apiResponse.user || apiResponse;
    
    // Create components and store them globally
    currentProfileComponent = new ProfileComponent(user);
    currentGameAreaComponent = new GameAreaComponent();
    profileContainer.appendChild(currentProfileComponent.getElement());
    gameAreaContainer.appendChild(currentGameAreaComponent.getElement());

    // WebSocket connection
    console.log(`Connecting to WebSocket...:${authToken}`);
    const wsManager = WebSocketManager.getInstance();
    const onlineUsersService = OnlineUsersService.getInstance();
    
    // Check if already connected to prevent duplicate connections
    if (!wsManager.isConnected()) {
      console.log('🔌 HOME: WebSocket not connected, establishing connection...');
      
      // Initialize OnlineUsersService when WebSocket connects
      wsManager.on('connected', () => {
        console.log('🟢 HOME: WebSocket connected, initializing services...');
        onlineUsersService.initialize();
      });
      
      wsManager.connect(authToken ?? '');
    } else {
      console.log('🟢 HOME: WebSocket already connected, initializing services...');
      onlineUsersService.initialize();
    }

    // Create and store chat service globally
    if (!currentChatService) {
      currentChatService = new ChatService();
      
      // yeni mesaji notify ile bildir
      currentChatService.onNewMessage((message) => {
        console.log('New chat message:', message);
        const userService = new UserService();
        userService.getUserById(message.from).then(user => {
          notify(`New message from ${user?.username || message.sender}: ${message.content}`);
        });
      });
    }

    // Create and store game service globally
    if (!currentGameService) {
      currentGameService = new GameService();

      // Handle matchmaking events
      currentGameService.onMatchmakingJoined((data) => {
        console.log('🎮 HOME: Joined matchmaking queue:', data);
        notify('Joined matchmaking queue...', 'green');
      });

      currentGameService.onMatchFound((data) => {
        console.log('🎮 HOME: Match found:', data);
        notify('Match found! Preparing game...', 'green');
        // Store room info in AppState
        if (data.roomId) {
          const appState = AppState.getInstance();
          appState.setCurrentRoom({
            roomId: data.roomId,
            players: data.players || [],
            createdAt: Date.now(),
            isMatchmaking: true
          });
        }
        // Navigation is handled by WebSocketManager
      });

      currentGameService.onRoomCreated((data) => {
        console.log('🎮 HOME: Room created:', data);
        notify('Game room created!', 'green');
        // Store room info in AppState
        if (data.roomId) {
          const appState = AppState.getInstance();
          appState.setCurrentRoom({
            roomId: data.roomId,
            players: data.players || [],
            createdAt: Date.now()
          });
        }
        // Navigation is handled by WebSocketManager
      });

      currentGameService.onGameStarted((data) => {
        console.log('🎮 HOME: Game started:', data);
        router.navigate('remote-game');
      });

      currentGameService.onStateUpdate((data) => {
        console.log('🎮 HOME: Game state update received:', data);
        // Navigation is handled by WebSocketManager
      });

      currentGameService.onGameResumed((data) => {
        console.log('🎮 HOME: Game resumed:', data);
        router.navigate('remote-game');
      });

      currentGameService.onGamePaused((data) => {
        console.log('🎮 HOME: Game paused:', data);
        router.navigate('remote-game');
      });

      currentGameService.onGameOver((data) => {
        console.log('🎮 HOME: Game over:', data);
        
        // Check if it's a tournament match
        if (data && data.isTournamentMatch && data.tournamentId) {
          console.log('🏆 HOME: Tournament match ended, storing result');
          // Store minimal tournament match result
          localStorage.setItem('lastTournamentMatchResult', JSON.stringify({
            winner: data.winner,
            finalScore: data.finalScore,
            message: data.message,
            round: data.round,
            timestamp: Date.now()
          }));
          // Navigation will be handled by WebSocketManager
        } else {
          // Store game result for regular games
          if (data) {
            localStorage.setItem('gameResult', JSON.stringify(data));
          }
          // Navigation will be handled by WebSocketManager
        }
      });

      currentGameService.onGameInvite((data) => {
        console.log('🎮 HOME: Game invite received:', data);
        notify(`Game invite from ${data.senderUsername || 'Unknown player'}`, 'blue');
      });

      currentGameService.onInviteAccepted((data) => {
        console.log('🎮 HOME: Game invite accepted:', data);
        notify('Game invite accepted! Starting game...', 'green');
      });

      currentGameService.onPlayerLeft((data) => {
        console.log('🎮 HOME: Player left game:', data);
        notify('Player left the game', 'red');
        const appState = AppState.getInstance();
        appState.clearCurrentRoom();
      });

      currentGameService.onGameError((data) => {
        console.log('🎮 HOME: Game error:', data);
        notify(data.message || 'Game error occurred', 'red');
      });
    }

    isInitialized = true;
    console.log('Home page loaded successfully');
    
  } catch (error) {
    console.log('Error loading user data:', error);
    
    // Reset initialization flag on error
    isInitialized = false;
    
    // Token geçersizse temizle ve landing'e yönlendir
    AuthGuard.logout();
    notify('Session expired. Please login again.', 'red');
    (window as any).router.navigate('landing');
  }
}

function cleanup() {
  console.log('🧹 Starting comprehensive home page cleanup...');
  
  try {
    // Clean up components first
    if (currentProfileComponent) {
      console.log('🧹 Cleaning up ProfileComponent...');
      // If ProfileComponent has a cleanup method, call it
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
      console.log('🧹 Cleaning up GameAreaComponent...');
      // If GameAreaComponent has a cleanup method, call it
      if ((currentGameAreaComponent as any).cleanup && typeof (currentGameAreaComponent as any).cleanup === 'function') {
        (currentGameAreaComponent as any).cleanup();
      }
      
      const existingGameAreaElement = currentGameAreaComponent.getElement();
      if (existingGameAreaElement && existingGameAreaElement.parentNode) {
        existingGameAreaElement.parentNode.removeChild(existingGameAreaElement);
      }
      currentGameAreaComponent = null;
    }

    // Clean up services
    if (currentChatService) {
      console.log('🧹 Cleaning up ChatService...');
      if ((currentChatService as any).cleanup && typeof (currentChatService as any).cleanup === 'function') {
        (currentChatService as any).cleanup();
      }
      currentChatService = null;
    }

    if (currentGameService) {
      console.log('🧹 Cleaning up GameService...');
      // GameService'te cleanup() metodu var, onu çağır
      currentGameService.cleanup();
      currentGameService = null;
    }

    // Force clear containers
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

    // Remove any existing event listeners from header buttons
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

    // Reset initialization flag
    isInitialized = false;
    
    console.log('✅ Home page cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during home page cleanup:', error);
    // Force reset even if cleanup failed
    currentProfileComponent = null;
    currentGameAreaComponent = null;
    currentChatService = null;
    currentGameService = null;
    isInitialized = false;
  }
}

// Export cleanup function for external use
export { cleanup };

// Cleanup when window unloads
window.addEventListener('beforeunload', cleanup);

// Store cleanup function globally for easy access
(window as any).homePageCleanup = cleanup;
