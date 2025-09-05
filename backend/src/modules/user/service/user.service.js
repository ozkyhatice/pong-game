import { initDB } from '../../../config/db.js';
import { prepareSqlParams, isValidUserId, sanitizeUserProfile } from '../utils/security.utils.js';

export async function getUserById(id) {
  
  if (!isValidUserId(id)) {
    return null;
  }
  
  const db = await initDB();
  
  const params = prepareSqlParams([id]);
  const user = await db.get('SELECT id, username, email, avatar, wins, losses, isTwoFAEnabled, isGoogleAuth FROM users WHERE id = ?', params);
  
  if (user) {
    return sanitizeUserProfile(user);
  }
  
  return user;
}

export async function getUserByUsername(username) {
  if (!username || typeof username !== 'string') {
    return null;
  }
  
  const db = await initDB();
  
  const params = prepareSqlParams([username]);
  const user = await db.get('SELECT id, username, email, avatar, wins, losses, isTwoFAEnabled FROM users WHERE username = ?', params);
  
  if (user) {
    return sanitizeUserProfile(user);
  }
  
  return user;
}

export async function findUserById(id) {
  
  if (!isValidUserId(id)) {
    return null;
  }
  
  const db = await initDB();
  
  const params = prepareSqlParams([id]);
  const user = await db.get('SELECT * FROM users WHERE id = ?', params);
  return user;
}

export async function updateProfile(userId, { username, email }) {
  
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  const db = await initDB();

  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (email && user.isGoogleAuth) {
    throw new Error('Cannot change email for Google Auth users');
  }

  
  if (username) {
    
    const usernameParams = prepareSqlParams([username, userId]);
    const existingUser = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', usernameParams);
    if (existingUser) {
      throw new Error('Username already taken');
    }
  }

  
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    
    const emailParams = prepareSqlParams([email, userId]);
    const existingEmail = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', emailParams);
    if (existingEmail) {
      throw new Error('Email already taken');
    }
  }

    
  if (username) {
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
    
    if (username.length > 10) {
      throw new Error('Username cannot be longer than 10 characters');
    }
    
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
  }

  
  
  const updateParams = prepareSqlParams([username, email, userId]);
  const result = await db.run(
    'UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email) WHERE id = ?',
    updateParams
  );

  if (result.changes === 0) {
    throw new Error('User not found');
  }

  return await getUserById(userId);
}

export async function updateAvatar(userId, avatarPath) {
  
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  
  const sanitizedAvatarPath = avatarPath.replace(/[<>"']/g, '');
  
  const db = await initDB();
  
  
  
  const params = prepareSqlParams([sanitizedAvatarPath, userId]);
  const result = await db.run(
    'UPDATE users SET avatar = ? WHERE id = ?',
    params
  );

  if (result.changes === 0) {
    throw new Error('User not found');
  }

  
  return await getUserById(userId);
}

export async function getUserPublicInfo(id) {
  
  if (!isValidUserId(id)) {
    return null;
  }
  
  const db = await initDB();
  
  const params = prepareSqlParams([id]);
  const user = await db.get('SELECT id, username, avatar, wins, losses FROM users WHERE id = ?', params);
  
  if (user) {
    return sanitizeUserProfile(user);
  }
  
  return user;
}

export async function getUsersPublicInfo(ids) {
  if (!ids || ids.length === 0) return [];
  
  
  const validIds = ids.filter(id => isValidUserId(id));
  if (validIds.length !== ids.length) {
  }
  
  if (validIds.length === 0) return [];
  
  const db = await initDB();
  const placeholders = validIds.map(() => '?').join(',');
  
  const params = prepareSqlParams(validIds);
  const users = await db.all(
    `SELECT id, username, avatar, wins, losses FROM users WHERE id IN (${placeholders})`,
    params
  );
  
  
  return users.map(user => sanitizeUserProfile(user));
}

export async function updateUserStats(userId, isWinner) {
  
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  const db = await initDB();
  
  const params = prepareSqlParams([userId]);
  
  if (isWinner) {
    
    await db.run('UPDATE users SET wins = COALESCE(wins, 0) + 1 WHERE id = ?', params);
  } else {
    
    await db.run('UPDATE users SET losses = COALESCE(losses, 0) + 1 WHERE id = ?', params);
  }
}

export async function updateMultipleUserStats(players) {
  const db = await initDB();
  
  try {
    
    await db.run('BEGIN TRANSACTION');
    
    for (const player of players) {
      const { userId, isWinner } = player;
      
      
      if (!isValidUserId(userId)) {
        continue; 
      }
      
      
      const params = prepareSqlParams([userId]);
      
      if (isWinner) {
        await db.run('UPDATE users SET wins = COALESCE(wins, 0) + 1 WHERE id = ?', params);
      } else {
        await db.run('UPDATE users SET losses = COALESCE(losses, 0) + 1 WHERE id = ?', params);
      }
    }
    
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

