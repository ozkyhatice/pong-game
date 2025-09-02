import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { initDB } from '../../../config/db.js';

/**
 * Validates user input to prevent injection attacks
 * Checks for null/undefined values and dangerous SQL characters
 * 
 * @param {any} input - The input to validate
 * @returns {any} - The validated input if no issues found
 * @throws {Error} - If input is invalid or contains potentially malicious content
 */
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

/**
 * Generates a new 2FA secret for a user and creates QR code
 * This is the first step in enabling 2FA for a user account
 * 
 * @param {number|string} userId - The ID of the user
 * @returns {Object} - Object containing QR code data URL and secret key
 * @throws {Error} - If user not found or 2FA already enabled
 */
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

  // Sanitize username to prevent XSS in QR code
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

/**
 * Disables 2FA for a user account
 * Removes the 2FA secret and disables the 2FA flag
 * 
 * @param {number|string} userId - The ID of the user
 * @returns {Object} - Success message
 * @throws {Error} - If user not found
 */
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

/**
 * Verifies a 2FA token against the user's stored secret
 * Uses the TOTP algorithm with a small window to account for time drift
 * 
 * @param {number|string} userId - The ID of the user
 * @param {string} token - The 2FA token to verify
 * @returns {boolean} - True if verification successful
 * @throws {Error} - If token invalid, user not found, or 2FA not enabled
 */
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