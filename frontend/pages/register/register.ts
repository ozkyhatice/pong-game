import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';
import { XSSProtection } from '../../core/XSSProtection.js';

export async function init() {

  const form = document.getElementById('registerForm') as HTMLFormElement;
  const googleRegisterBtn = document.getElementById('googleRegisterBtn') as HTMLButtonElement;

  const usernameInput = document.getElementById('username') as HTMLInputElement;
  usernameInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const cleaned = target.value.replace(/[^a-zA-Z0-9_]/g, '');
    if (target.value !== cleaned) {
      target.value = cleaned;
    }
  });

  googleRegisterBtn?.addEventListener('click', () => {
    const googleAuthUrl = getApiUrl(API_CONFIG.ENDPOINTS.AUTH.GOOGLE);
    window.location.href = googleAuthUrl;
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = (document.getElementById('username') as HTMLInputElement)?.value;
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;

    if (!username || !email || !password) {
      notify('Please fill all fields!');
      return;
    }

    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      notify('Username must be at least 3 characters and contain only letters, numbers, and underscores!');
      return;
    }

    if (cleanUsername !== username) {
      notify('Username can only contain letters, numbers, and underscores. Special characters and spaces are not allowed!');
      return;
    }

    if (password.length < 6) {
      notify('Password must be at least 6 characters long!');
      return;
    }

    try {
      // Additional sanitization before sending
      const sanitizedData = {
        username: XSSProtection.cleanInput(cleanUsername, 50),
        email: XSSProtection.cleanInput(email, 100),
        password: XSSProtection.cleanInput(password, 200)
      };

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });

      const rawData = await response.json();
      const data = XSSProtection.sanitizeJSON(rawData);

      if (response.ok) {
        notify(`Registration successful! Welcome ${sanitizedData.username}!`, 'green');
        router.navigate('login');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      notify(`${errorMessage}`, 'red');
    }
  });
}
