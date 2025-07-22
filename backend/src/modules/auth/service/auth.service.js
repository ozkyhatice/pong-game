import { initDB } from '../../../config/db.js';
import argon2 from 'argon2';

// ✅ Kayıt işlemi
export async function registerUser({ username, email, password }) {
  const db = await initDB();

  // Kullanıcı zaten var mı?
  const existing = await db.get(
    'SELECT * FROM users WHERE email = ? OR username = ?',
    [email, username]
  );

  if (existing) {
    throw new Error('Email or username already taken');
  }

  // Şifreyi hashle
  const hashedPassword = await argon2.hash(password);

  // Yeni kullanıcıyı ekle
  const result = await db.run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword]
  );

  // SQLite'ta eklenen satırın ID’si `lastID` ile alınır
  const newUserId = result.lastID;

  return { id: newUserId, username, email };
}

// ✅ Giriş işlemi
export async function loginUser({ email, password }) {
  const db = await initDB();

  // Kullanıcıyı email ile bul
  const user = await db.get(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    throw new Error('User not found');
  }

  // Şifre doğru mu?
  const passwordMatch = await argon2.verify(user.password, password);
  if (!passwordMatch) {
    throw new Error('Invalid credentials');
  }

  return { id: user.id, username: user.username, email: user.email };
}