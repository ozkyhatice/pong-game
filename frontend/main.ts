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

  if (error === 'oauth_failed') {
    alert('Google login failed. Please try again.');
  } else if (oauthSuccess === '2fa_required' && userId) {
    sessionStorage.setItem('pendingOAuthUserId', userId);
  } else if (token && oauthSuccess === 'success') {
    localStorage.setItem('authToken', token);
  }

  if (token || error || userId) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  if (app) {
    window.router = new Router(app);
    handleOAuthCallback();
    
  }
});
