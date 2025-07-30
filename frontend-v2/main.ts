import { Router } from './core/router.js';

// Global router değişkeni
declare global {
  var router: Router;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  
  const app = document.getElementById('app');
  console.log('App element:', app);
  
  if (app) {
    console.log('Creating router...');
    window.router = new Router(app);
    console.log('Router created:', window.router);
  } else {
    console.error('App element not found!');
  }
});
