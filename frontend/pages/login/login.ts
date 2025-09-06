import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';
import { XSSProtection } from '../../core/XSSProtection.js';

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

    // Sanitize input before sending
    const cleanEmail = XSSProtection.cleanInput(email, 100);
    const cleanPassword = XSSProtection.cleanInput(password, 200);

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      const rawData = await response.json();
      const data = XSSProtection.sanitizeJSON(rawData);

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
