import { getApiUrl, API_CONFIG } from '../../config.js';

export async function init() {
  console.log('Register page loaded');
  
  const form = document.getElementById('registerForm') as HTMLFormElement;
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = (document.getElementById('username') as HTMLInputElement)?.value;
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;
    
    if (!username || !email || !password) {
      alert('Please fill all fields!');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Registration successful! Welcome ${username}!`);
        router.navigate('login');
      } else {
        throw new Error(data.message || 'Registration failed');
		console.error('Registration error:', data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      alert(`Error: ${errorMessage}`);
    }
  });

}
