import { initDB } from '../../../config/db.js';

export async function findUserByEmail(email) {
  const db = await initDB();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  return user;
}

export async function createUser({ username, email, password }) {
  const db = await initDB();
  if (!username || !email || !password) {
	throw new Error('Username, email, and password are required to create a user');
  }
  // Insert the new user into the database
  const existingMail = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (existingMail) {
	throw new Error('User with this email already exists');
  }

  const existingUsername = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (existingUsername) {
	throw new Error('Username already taken');
  }

  const result = await db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password]);
  return result.lastID; // Return the ID of the newly created user
}