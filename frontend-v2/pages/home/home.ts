export function init() {
  if (localStorage.getItem('user') || localStorage.getItem('authToken')) {
    router.navigate('profile');
  }
}
