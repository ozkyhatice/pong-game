import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';

export async function init() {

  const form = document.getElementById('loginForm') as HTMLFormElement;
  const googleLoginBtn = document.getElementById('googleLoginBtn') as HTMLButtonElement;

  googleLoginBtn?.addEventListener('click', () => {
    const googleAuthUrl = getApiUrl(API_CONFIG.ENDPOINTS.AUTH.GOOGLE);
    window.location.href = googleAuthUrl;
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;

    if (!email || !password) {
      notify('Please fill all fields!');
      return;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.message === '2FA_REQUIRED') {
        sessionStorage.setItem('tempUserId', data.userId.toString());
        router.navigate('2fa-code');
        return;
      }

      if (response.ok && data.token) {
        localStorage.setItem('authToken', data.token);
        notify(`Login successful! Welcome ${data.user.username}!`, 'green');
        router.navigate('home');
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      notify(`${errorMessage}`, 'red');
    }
  });
}
