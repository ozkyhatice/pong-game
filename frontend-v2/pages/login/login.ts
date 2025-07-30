export function init() {
  console.log('Login page loaded');
  
  const form = document.getElementById('loginForm') as HTMLFormElement;
  
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = (document.getElementById('username') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;
    
    if (username && password) {
      // Basit login kontrolü (gerçek uygulamada API çağrısı yapılır)
      if (username === 'admin' && password === 'admin') {
        alert('Login successful!');
        router.navigate('home');
      } else {
        alert('Invalid credentials!');
      }
    } else {
      alert('Please fill all fields!');
    }
  });
}
