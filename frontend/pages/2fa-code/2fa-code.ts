import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';

export async function init() {

  const tempUserId = sessionStorage.getItem('tempUserId');
  const pendingOAuthUserId = sessionStorage.getItem('pendingOAuthUserId');
  const userId = tempUserId || pendingOAuthUserId;
  if (!userId) {
    notify('No 2FA session found. Please login again.');
    router.navigate('login');
    return;
  }

  const form = document.getElementById('2fa-form') as HTMLFormElement;
  const backBtn = document.getElementById('back-btn') as HTMLButtonElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const codeInput = document.getElementById('2fa-code') as HTMLInputElement;
    const code = codeInput?.value;

    if (!code || code.length !== 6) {
      notify('Please enter a valid 6-digit 2FA code!');
      return;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA.VERIFY_LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          token: code
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        sessionStorage.removeItem('tempUserId');
        sessionStorage.removeItem('pendingOAuthUserId');

        localStorage.setItem('authToken', data.token);

        notify(`2FA verification successful! Welcome ${data.user.username}!`, 'green');
        router.navigate('home');
      } else {
        throw new Error(data.error || 'Invalid 2FA code');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '2FA verification failed';
      notify(`${errorMessage}`, 'red');

      if (codeInput) {
        codeInput.value = '';
      }
    }
  });

  backBtn?.addEventListener('click', () => {
    router.navigate('login');
	  sessionStorage.removeItem('tempUserId');
    sessionStorage.removeItem('pendingOAuthUserId');
  });

}
