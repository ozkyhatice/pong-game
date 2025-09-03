import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';
import { AuthGuard } from '../../core/auth-guard.js';
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

export async function init() {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log('Home page already initialized, skipping...');
    return;
  }

  const authToken = localStorage.getItem('authToken');
  const profileContainer = document.getElementById('profile-container');
  const gameAreaContainer = document.getElementById('game-area-container');

  if (!profileContainer || !gameAreaContainer) {
    console.error('Required containers not found');
    return;
  }

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
  
  try {
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
    
    // Initialize OnlineUsersService when WebSocket connects
    wsManager.on('connected', () => {
      onlineUsersService.initialize();
    });
    
    wsManager.connect(authToken ?? '');

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

      // oyun mesajlarinda oyun ekranina yonlendir
      currentGameService.onStateUpdate((update) => {
        console.log('Game state updated:', update);
        router.navigate('remote-game');
      });

      currentGameService.onRoomCreated((room) => {
        console.log('Game room created:', room);
        router.navigate('game-lobby');
      });

      currentGameService.onGameResumed((game) => {
        console.log('Game resumed:', game);
        router.navigate('remote-game');
      });

      currentGameService.onGamePaused((game) => {
        console.log('Game paused:', game);
        router.navigate('remote-game');
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
  console.log('🧹 Cleaning up home page components...');
  
  // Clear containers
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
  
  // Reset component instances
  currentProfileComponent = null;
  currentGameAreaComponent = null;
  currentChatService = null;
  currentGameService = null;
  
  isInitialized = false;
}

// Export cleanup function for external use
export { cleanup };
