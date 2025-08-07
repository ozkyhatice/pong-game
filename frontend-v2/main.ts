import { Router } from './core/router.js';

declare global {
  var router: Router;
}

function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const oauthSuccess = urlParams.get('oauth');
  const userId = urlParams.get('userId');
  const error = urlParams.get('error');

  // Handle OAuth-specific actions (alerts, storage)
  if (error === 'oauth_failed') {
    alert('Google login failed. Please try again.');
  } else if (oauthSuccess === '2fa_required' && userId) {
    sessionStorage.setItem('pendingOAuthUserId', userId);
  } else if (token && oauthSuccess === 'success') {
    localStorage.setItem('authToken', token);
  }

  // Clean up URL parameters
  if (token || error || userId) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  
  const app = document.getElementById('app');

  if (app) {
    window.router = new Router(app);
    handleOAuthCallback();
    
  } else {
    console.error('App element not found!');
  }
});
