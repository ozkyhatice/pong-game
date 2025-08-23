import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';
import { AuthGuard } from '../../core/auth-guard.js';
import { ProfileComponent, UserProfile } from './components/ProfileComponent.js';
import { GameAreaComponent } from './components/GameAreaComponent.js';
import { WebSocketManager } from '../../core/WebSocketManager.js';

export async function init() {

  const authToken = localStorage.getItem('authToken');
  const profileContainer = document.getElementById('profile-container');
  const gameAreaContainer = document.getElementById('game-area-container');

  if (!profileContainer || !gameAreaContainer) {
    console.error('Required containers not found');
    return;
  }

  // Clear existing components to prevent duplicates
  profileContainer.innerHTML = '';
  gameAreaContainer.innerHTML = '';

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

    //ws baglantisi ----------------------------------------
    console.log(`Connecting to WebSocket...:${authToken}`);
    const wsManager = WebSocketManager.getInstance();
    wsManager.connect(authToken ?? '');
    //-------------------------------------------------------

    console.log('Home page loaded');

  } catch (error) {
    console.error('Error loading user data:', error);
    
    // Token geçersizse temizle ve landing'e yönlendir
    AuthGuard.logout();
    notify('Session expired. Please login again.', 'red');
    (window as any).router.navigate('landing');
  }
}
