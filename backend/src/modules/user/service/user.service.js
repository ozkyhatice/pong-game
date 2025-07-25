import { initDB } from '../../../config/db.js';

export async function findUserByEmail(email) {
  const db = await initDB();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  return user;
}
