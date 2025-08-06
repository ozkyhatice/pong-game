import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { initDB } from '../../../config/db.js';

export async function generate2FASecret(userId) {
  const db = await initDB();
  
  const user = await db.get('SELECT twoFASecret, isTwoFAEnabled FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    throw new Error('User not found.');
  }
  if (user.twoFASecret && user.isTwoFAEnabled) {
    throw new Error('2FA is already enabled for this user.');
  }

  const secret = speakeasy.generateSecret({ name: `PongGame` });
  const qrCode = await qrcode.toDataURL(secret.otpauth_url);

  await db.run('UPDATE users SET twoFASecret = ?, isTwoFAEnabled = ? WHERE id = ?', [secret.base32, true, userId]);


  return { qr: qrCode, secret: secret.base32 };
}

export async function disable2FA(userId) {
  const db = await initDB();
  
  const user = await db.get('SELECT isTwoFAEnabled FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    throw new Error('User not found.');
  }
  
  const result = await db.run('UPDATE users SET isTwoFAEnabled = 0, twoFASecret = NULL WHERE id = ?', [userId]);
  
  return { success: true, message: '2FA has been successfully disabled.' };
}