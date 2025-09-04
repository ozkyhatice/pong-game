import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { initDB } from '../../../config/db.js';

// Basic input validation to prevent SQL injection and other attacks
function validateInput(input) {
  if (input === undefined || input === null) {
    throw new Error('Invalid input: Input cannot be null or undefined');
  }
  
  if (typeof input === 'string') {
    if (input.includes("'") || input.includes('"') || input.includes(';') || input.includes('--')) {
      throw new Error('Invalid input: Potential SQL injection detected');
    }
  }
  
  return input;
}

// Generates a new 2FA secret and corresponding QR code for the user
export async function generate2FASecret(userId) {
  userId = validateInput(userId);
  
  const db = await initDB();
  
  const user = await db.get('SELECT username, twoFASecret, isTwoFAEnabled FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    throw new Error('User not found.');
  }
  if (user.twoFASecret && user.isTwoFAEnabled) {
    throw new Error('2FA is already enabled for this user.');
  }

  // Sanitize username to prevent XSS in QR code generation
  const sanitizedUsername = encodeURIComponent(user.username);
  
  const secret = speakeasy.generateSecret({ 
    name: sanitizedUsername,
    issuer: 'PongGame' 
  });
  
  const qrCode = await qrcode.toDataURL(secret.otpauth_url);

  // Store secret but don't enable 2FA until verification
  await db.run('UPDATE users SET twoFASecret = ? WHERE id = ?', [secret.base32, userId]);

  return { qr: qrCode, secret: secret.base32 };
}


// Disables 2FA for the user by clearing the secret and updating the flag
export async function disable2FA(userId) {
  userId = validateInput(userId);
  
  const db = await initDB();
  
  const user = await db.get('SELECT isTwoFAEnabled FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    throw new Error('User not found.');
  }
  
  const result = await db.run('UPDATE users SET isTwoFAEnabled = 0, twoFASecret = NULL WHERE id = ?', [userId]);
  
  return { success: true, message: '2FA has been successfully disabled.' };
}


// Verifies the provided 2FA token against the stored secret for the user
export async function verify2FACode(userId, token) {
  userId = validateInput(userId);
  token = validateInput(token);
  
  // Ensure token is numeric (TOTP tokens are always numeric)
  if (!/^\d+$/.test(token)) {
    throw new Error('Invalid 2FA token format.');
  }
  
  const db = await initDB();
  
  const user = await db.get('SELECT twoFASecret FROM users WHERE id = ?', [userId]);
  if (!user || !user.twoFASecret) {
    throw new Error('2FA is not enabled for this user.');
  }

  // Verify token using speakeasy TOTP verification
  // Window of 1 allows for 30 seconds before/after current time
  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!verified) {
    throw new Error('Invalid 2FA token.');
  }

  // If verification succeeds, enable 2FA for the user
  await db.run('UPDATE users SET isTwoFAEnabled = 1 WHERE id = ?', [userId]);

  return true;
}