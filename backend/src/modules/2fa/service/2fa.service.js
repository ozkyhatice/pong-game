import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { initDB } from '../../../config/db.js';

// SQL injection risklerini azaltmak için parametreleştirilmiş sorguları kullanıyoruz
// ve kullanıcı girdilerini doğrulamak için yardımcı fonksiyon ekliyoruz
function validateInput(input) {
  if (input === undefined || input === null) {
    throw new Error('Invalid input: Input cannot be null or undefined');
  }
  
  if (typeof input === 'string') {
    // Basit bir SQL injection koruması - yalnızca değeri kontrol eder
    if (input.includes("'") || input.includes('"') || input.includes(';') || input.includes('--')) {
      throw new Error('Invalid input: Potential SQL injection detected');
    }
  }
  
  return input;
}

export async function generate2FASecret(userId) {
  // Kullanıcı ID'sini doğrula
  userId = validateInput(userId);
  
  const db = await initDB();
  
  // Parametreli sorgu kullanılıyor - güvenli
  const user = await db.get('SELECT username, twoFASecret, isTwoFAEnabled FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    throw new Error('User not found.');
  }
  if (user.twoFASecret && user.isTwoFAEnabled) {
    throw new Error('2FA is already enabled for this user.');
  }

  // XSS önlemek için kullanıcı adını encode edelim
  const sanitizedUsername = encodeURIComponent(user.username);
  
  const secret = speakeasy.generateSecret({ 
    name: sanitizedUsername,
    issuer: 'PongGame' 
  });
  
  // QR kod güvenli şekilde oluşturuluyor
  const qrCode = await qrcode.toDataURL(secret.otpauth_url);

  // Secret'ı kaydet ama henüz 2FA'yı aktif etme
  // Parametreli sorgu kullanılıyor - güvenli
  await db.run('UPDATE users SET twoFASecret = ? WHERE id = ?', [secret.base32, userId]);

  return { qr: qrCode, secret: secret.base32 };
}

export async function disable2FA(userId) {
  // Kullanıcı ID'sini doğrula
  userId = validateInput(userId);
  
  const db = await initDB();
  
  // Parametreli sorgu kullanılıyor - güvenli
  const user = await db.get('SELECT isTwoFAEnabled FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    throw new Error('User not found.');
  }
  
  // Parametreli sorgu kullanılıyor - güvenli
  const result = await db.run('UPDATE users SET isTwoFAEnabled = 0, twoFASecret = NULL WHERE id = ?', [userId]);
  
  return { success: true, message: '2FA has been successfully disabled.' };
}

export async function verify2FACode(userId, token) {
  // Kullanıcı ID'sini ve token'ı doğrula
  userId = validateInput(userId);
  token = validateInput(token);
  
  // Token'ın yalnızca rakamlardan oluştuğundan emin olalım (TOTP kodları genellikle 6 haneli rakamlardır)
  if (!/^\d+$/.test(token)) {
    throw new Error('Invalid 2FA token format.');
  }
  
  const db = await initDB();
  
  // Parametreli sorgu kullanılıyor - güvenli
  const user = await db.get('SELECT twoFASecret FROM users WHERE id = ?', [userId]);
  if (!user || !user.twoFASecret) {
    throw new Error('2FA is not enabled for this user.');
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!verified) {
    throw new Error('Invalid 2FA token.');
  }

  // Verify başarılıysa 2FA'yı aktif et
  // Parametreli sorgu kullanılıyor - güvenli
  await db.run('UPDATE users SET isTwoFAEnabled = 1 WHERE id = ?', [userId]);

  return true;
}