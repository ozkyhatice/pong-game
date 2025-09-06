import { safeDOM } from './XSSProtection.js';

const timeoutMS = 2000;

export function notify(message: string, color?: string) {
  let colorValue: string;
  let borderColor: string;
  let shadowColor: string;
  if (color === 'green') {
    colorValue = '#39FF14';
    borderColor = '#39FF14';
    shadowColor = '0 0 15px rgba(57, 255, 20, 0.5)';
  } else if (color === 'red') {
    colorValue = '#FF073A';
    borderColor = '#FF073A';
    shadowColor = '0 0 15px rgba(255, 7, 58, 0.5)';
  } else {
    colorValue = '#39FF14';
    borderColor = '#39FF14';
    shadowColor = '0 0 15px rgba(57, 255, 20, 0.3)';
  }

  const existing = document.getElementById('notify-toast');
  if (existing)
    existing.remove();

  const toast = document.createElement('div');
  toast.id = 'notify-toast';
  toast.style.position = 'fixed';
  toast.style.left = '50%';
  toast.style.bottom = '3.5rem';
  toast.style.transform = 'translateX(-50%)';

  let displayMsg = message.toUpperCase();

  toast.style.background = 'rgba(0, 0, 0, 0.95)';
  toast.style.color = colorValue;
  toast.style.padding = '0.75rem 2rem';
  toast.style.borderRadius = '4px';
  toast.style.border = `2px solid ${borderColor}`;
  toast.style.boxShadow = shadowColor;
  toast.style.fontSize = '0.875rem';
  toast.style.fontWeight = '700';
  toast.style.letterSpacing = '0.05em';
  toast.style.fontFamily = 'Orbitron, monospace';
  toast.style.zIndex = '9999';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '0.5rem';
  toast.style.pointerEvents = 'auto';
  toast.style.transition = 'all 0.3s ease';
  toast.style.opacity = '1';
  toast.style.textShadow = `0 0 5px ${colorValue}`;

  const msg = document.createElement('b');
  safeDOM.setText(msg, displayMsg);
  safeDOM.appendChild(toast, msg);

  safeDOM.appendChild(document.body, toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, timeoutMS);
}
