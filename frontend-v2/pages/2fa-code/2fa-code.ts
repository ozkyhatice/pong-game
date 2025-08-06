import { getApiUrl, API_CONFIG } from '../../config.js';

export async function init() {
  console.log('2FA code page loaded');
  
  // Check if we have a userId from login
  const tempUserId = localStorage.getItem('tempUserId');
  if (!tempUserId) {
    alert('No 2FA session found. Please login again.');
    router.navigate('login');
    return;
  }

  const form = document.getElementById('2fa-form') as HTMLFormElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const codeInput = document.getElementById('2fa-code') as HTMLInputElement;
    const code = codeInput?.value;

    if (!code || code.length !== 6) {
      alert('Please enter a valid 6-digit 2FA code!');
      return;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA.VERIFY_LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: parseInt(tempUserId), 
          token: code 
        }),
      });

      const data = await response.json();
      console.log('2FA verification response:', data);

      if (response.ok && data.success && data.token) {
        // Clear temporary userId
        localStorage.removeItem('tempUserId');
        
        // Store auth token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        alert(`2FA verification successful! Welcome ${data.user.username}!`);
        router.navigate('home');
      } else {
        throw new Error(data.error || 'Invalid 2FA code');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '2FA verification failed';
      alert(`Error: ${errorMessage}`);
      
      // Clear the code input for retry
      if (codeInput) {
        codeInput.value = '';
      }
    }
  });
}