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
	  headers: {
		'Authorization': `Bearer ${authToken}`
	  }
	});

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const userProfile: UserProfile = await response.json();
	console.log('User profile fetched:', userProfile);

    const profileComponent = new ProfileComponent(userProfile);

    profileContainer.appendChild(profileComponent.getElement());

    console.log('ProfileComponent successfully mounted to profile-container');

  } catch (error) {
    console.error('Error mounting ProfileComponent:', error);
    profileContainer.innerHTML = `
      <div class="w-80 bg-white rounded-lg p-8 shadow text-center mx-auto">
        <div class="text-red-600 mb-4">
          <svg class="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Error Loading Profile</h2>
        <p class="text-gray-600 mb-4">Failed to load your profile. Please try refreshing the page.</p>
        <button 
          onclick="window.location.reload()" 
          class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors">
          Refresh Page
        </button>
      </div>
    `;
  }
}


