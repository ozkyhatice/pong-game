import { initDB } from '../../../config/db.js';

export async function getUserById(id) {
  const db = await initDB();
  const user = await db.get('SELECT id, username, email, avatar, wins, losses, isTwoFAEnabled, isGoogleAuth FROM users WHERE id = ?', [id]);
  return user;
}

export async function getUserByUsername(username) {
  const db = await initDB();
  const user = await db.get('SELECT id, username, email, avatar, wins, losses, isTwoFAEnabled FROM users WHERE username = ?', [username]);
  return user;
}

export async function findUserById(id) {
  const db = await initDB();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  return user;
}

export async function updateProfile(userId, { username, email }) {
  const db = await initDB();

  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (email && user.isGoogleAuth) {
    throw new Error('Cannot change email for Google Auth users');
  }

  // Check if username is already taken
  if (username) {
    const existingUser = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
    if (existingUser) {
      throw new Error('Username already taken');
    }
  }

  // Check if email is already taken
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    const existingEmail = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existingEmail) {
      throw new Error('Email already taken');
    }
  }

  // Validate username format
  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }

  // Update user
  const result = await db.run(
    'UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email) WHERE id = ?',
    [username, email, userId]
  );

  if (result.changes === 0) {
    throw new Error('User not found');
  }

  return await getUserById(userId);
}

export async function updateAvatar(userId, avatarPath) {
  const db = await initDB();
  
  // Avatar yolunu veritabanında güncelle
  const result = await db.run(
    'UPDATE users SET avatar = ? WHERE id = ?',
    [avatarPath, userId]
  );

  if (result.changes === 0) {
    throw new Error('User not found');
  }

  // Güncellenmiş kullanıcıyı geri döndür
  return await getUserById(userId);
}

export async function getUserPublicInfo(id) {
  const db = await initDB();
  const user = await db.get('SELECT id, username, avatar, wins, losses FROM users WHERE id = ?', [id]);
  return user;
}

export async function getUsersPublicInfo(ids) {
  if (!ids || ids.length === 0) return [];
  
  const db = await initDB();
  const placeholders = ids.map(() => '?').join(',');
  const users = await db.all(
    `SELECT id, username, avatar, wins, losses FROM users WHERE id IN (${placeholders})`,
    ids
  );
  return users;
}

export async function updateUserStats(userId, isWinner) {
  const db = await initDB();
  
  if (isWinner) {
    // Kazanan kullanıcının wins değerini artır
    await db.run('UPDATE users SET wins = COALESCE(wins, 0) + 1 WHERE id = ?', [userId]);
    console.log(`User ${userId} wins updated (+1)`);
  } else {
    // Kaybeden kullanıcının losses değerini artır
    await db.run('UPDATE users SET losses = COALESCE(losses, 0) + 1 WHERE id = ?', [userId]);
    console.log(`User ${userId} losses updated (+1)`);
  }
}

export async function updateMultipleUserStats(players) {
  const db = await initDB();
  
  try {
    // Transaction ile tüm güncellemeleri yap
    await db.run('BEGIN TRANSACTION');
    
    for (const player of players) {
      const { userId, isWinner } = player;
      
      if (isWinner) {
        await db.run('UPDATE users SET wins = COALESCE(wins, 0) + 1 WHERE id = ?', [userId]);
        console.log(`User ${userId} wins updated (+1)`);
      } else {
        await db.run('UPDATE users SET losses = COALESCE(losses, 0) + 1 WHERE id = ?', [userId]);
        console.log(`User ${userId} losses updated (+1)`);
      }
    }
    
    await db.run('COMMIT');
    console.log('User stats updated successfully');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error updating user stats:', error);
    throw error;
  }
}

