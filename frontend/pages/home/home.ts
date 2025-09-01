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

export async function init() {

  const authToken = localStorage.getItem('authToken');
  const profileContainer = document.getElementById('profile-container');
  const gameAreaContainer = document.getElementById('game-area-container');

  if (!profileContainer || !gameAreaContainer) {
    console.error('Required containers not found');
    return;
  }

  // Force clear existing components to prevent duplicates
  if (profileContainer.firstChild) {
    while (profileContainer.firstChild) {
      profileContainer.removeChild(profileContainer.firstChild);
    }
  }
  if (gameAreaContainer.firstChild) {
    while (gameAreaContainer.firstChild) {
      gameAreaContainer.removeChild(gameAreaContainer.firstChild);
    }
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
    
    // componentleri olustur
    const profileComponent = new ProfileComponent(user);
    const gameAreaComponent = new GameAreaComponent();
    profileContainer.appendChild(profileComponent.getElement());
    gameAreaContainer.appendChild(gameAreaComponent.getElement());

    // WebSocket connection
    console.log(`Connecting to WebSocket...:${authToken}`);
    const wsManager = WebSocketManager.getInstance();
    const onlineUsersService = OnlineUsersService.getInstance();
    
    // Initialize OnlineUsersService when WebSocket connects
    wsManager.on('connected', () => {
      onlineUsersService.initialize();
    });
    
    wsManager.connect(authToken ?? '');

    const chatService = new ChatService();
    
    // yeni mesaji notify ile bildir
    chatService.onNewMessage((message) => {
      console.log('New chat message:', message);
      const userService = new UserService();
      userService.getUserById(message.from).then(user => {
        notify(`New message from ${user?.username || message.sender}: ${message.content}`);
      });
    });

    const gameService = new GameService();

    // oyun mesajlarinda oyun ekranina yonlendir
    gameService.onStateUpdate((update) => {
      console.log('Game state updated:', update);
      router.navigate('remote-game');
    });

    gameService.onRoomCreated((room) => {
      console.log('Game room created:', room);
      router.navigate('game-lobby');
    });

    gameService.onGameResumed((game) => {
      console.log('Game resumed:', game);
      router.navigate('remote-game');
    });

    gameService.onGamePaused((game) => {
      console.log('Game paused:', game);
      router.navigate('remote-game');
    });

    console.log('Home page loaded');
    
  } catch (error) {
    console.log('Error loading user data:', error);
    
    // Token geçersizse temizle ve landing'e yönlendir
    AuthGuard.logout();
    notify('Session expired. Please login again.', 'red');
    (window as any).router.navigate('landing');
  }
}
