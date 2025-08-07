import { getApiUrl, API_CONFIG } from '../../config.js';
import { ProfileComponent, UserProfile } from './components/ProfileComponent.js';


export async function init() {
  console.log('Home page loaded');

  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    alert('Please login first!');
    router.navigate('login');
    return;
  }

  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) {
    console.error('Profile container not found in HTML');
    return;
  }

  try {
    const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
    method: 'GET',
    headers: {'Authorization': `Bearer ${authToken}`}});

    if (!response.ok)
      throw new Error('Failed to fetch user profile');

    const apiResponse = await response.json();
    console.log('API response:', apiResponse);
    
    const userProfile: UserProfile = apiResponse.user || apiResponse;
    console.log('User profile extracted:', userProfile);

    const profileComponent = new ProfileComponent(userProfile);

    profileContainer.appendChild(profileComponent.getElement());

    console.log('ProfileComponent successfully mounted to profile-container');

  } catch (error) {
    console.log('User not found, redirecting to landing page: ', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    profileContainer.innerHTML = `
      <div class="w-80 bg-white rounded-lg p-8 shadow text-center mx-auto">
        <div class="text-blue-600 mb-4">
          <svg class="w-12 h-12 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p class="text-gray-600 mb-4">You are being redirected to the landing page...</p>
        <div class="flex justify-center">
          <div class="w-6 h-1 bg-blue-500 rounded animate-pulse"></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      router.navigate('landing');
    }, 1000);
  }
}
