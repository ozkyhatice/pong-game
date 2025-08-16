import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';
import { AuthGuard } from '../../core/auth-guard.js';
import { ProfileComponent, UserProfile } from './components/ProfileComponent.js';
import { GameAreaComponent } from './components/GameAreaComponent.js';

export async function init() {
  console.log('Home page loaded');

  const authToken = localStorage.getItem('authToken');
  const profileContainer = document.getElementById('profile-container');
  const gameAreaContainer = document.getElementById('game-area-container');
  const loadingState = document.getElementById('loading-state');

  if (!profileContainer || !gameAreaContainer) {
    console.error('Required containers not found');
    return;
  }

  // Game Area component'ini hemen yükle
  const gameAreaComponent = new GameAreaComponent();
  gameAreaContainer.appendChild(gameAreaComponent.getElement());

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

    // Loading state'i gizle
    if (loadingState) loadingState.style.display = 'none';

    // Profile component'ini oluştur ve ekle
    const profileComponent = new ProfileComponent(user);
    profileContainer.appendChild(profileComponent.getElement());

  } catch (error) {
    console.error('Error loading user data:', error);
    
    // Token geçersizse temizle ve landing'e yönlendir
    AuthGuard.logout();
    notify('Session expired. Please login again.', 'red');
    (window as any).router.navigate('landing');
  }
}
