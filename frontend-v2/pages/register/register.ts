export function init() {
  console.log('Register page loaded');
  
  const form = document.getElementById('registerForm') as HTMLFormElement;
  
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = (document.getElementById('username') as HTMLInputElement)?.value;
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;
    const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement)?.value;
    
    // Basit validasyon
    if (!username || !email || !password || !confirmPassword) {
      alert('Please fill all fields!');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    // Başarılı kayıt (gerçek uygulamada API çağrısı yapılır)
    alert(`Registration successful! Welcome ${username}!`);
    
    // Login sayfasına yönlendir
    router.navigate('login');
  });
}
