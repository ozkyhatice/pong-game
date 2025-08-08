// Usage: import { notify } from './core/notify.js';
// notify('msg', 'color?');

const timeoutMS = 2000;

export function notify(message: string, color?: string) {
  let colorValue: string;
  if (color === 'green')
    colorValue = '#16a34a';
  else if (color === 'red')
    colorValue = '#dc2626';
  else
    colorValue = '#222';

  const existing = document.getElementById('notify-toast');
  if (existing)
    existing.remove();

  const toast = document.createElement('div');
  toast.id = 'notify-toast';
  toast.style.position = 'fixed';
  toast.style.left = '50%';
  toast.style.bottom = '3.5rem';
  toast.style.transform = 'translateX(-50%)';

  let displayMsg = message;

  toast.style.background = '#fff';
  toast.style.color = colorValue;
  toast.style.padding = '0.42rem 4.2rem';
  toast.style.borderRadius = '9999px';
  toast.style.boxShadow = '0 4px 24px rgba(0,0,0,0.13)';
  toast.style.fontSize = '1rem';
  toast.style.fontWeight = '500';
  toast.style.letterSpacing = '0.01em';
  toast.style.zIndex = '9999';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '1rem';
  toast.style.pointerEvents = 'auto';
  toast.style.transition = 'opacity 0.3s';
  toast.style.opacity = '1';

  const msg = document.createElement('span');
  msg.textContent = displayMsg;
  toast.appendChild(msg);

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, timeoutMS);
}
