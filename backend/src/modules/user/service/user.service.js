import { initDB } from '../../../config/db.js';

export async function getUserById(id) {
  const db = await initDB();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (user) {
    delete user.password; // şifreyi frontend'e gonderme
  }
  return user;
}
