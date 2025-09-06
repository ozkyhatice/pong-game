import { Router } from './core/router.js';
import { XSSProtection, safeDOM } from './core/XSSProtection.js';

declare global {
  var router: Router;
}

function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const oauthSuccess = urlParams.get('oauth');
  const userId = urlParams.get('userId');
  const error = urlParams.get('error');

  // Sanitize URL parameters to prevent XSS
  const sanitizedToken = token ? XSSProtection.cleanInput(token) : null;
  const sanitizedOAuthSuccess = oauthSuccess ? XSSProtection.cleanInput(oauthSuccess) : null;
  const sanitizedUserId = userId ? XSSProtection.cleanInput(userId) : null;
  const sanitizedError = error ? XSSProtection.cleanInput(error) : null;

  if (sanitizedError === 'oauth_failed') {
    alert('Google login failed. Please try again.');
  } else if (sanitizedOAuthSuccess === '2fa_required' && sanitizedUserId) {
    sessionStorage.setItem('pendingOAuthUserId', sanitizedUserId);
  } else if (sanitizedToken && sanitizedOAuthSuccess === 'success') {
    localStorage.setItem('authToken', sanitizedToken);
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
