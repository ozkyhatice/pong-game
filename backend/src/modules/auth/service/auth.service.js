import { initDB } from '../../../config/db.js';
import argon2 from 'argon2';
import { 
  isValidEmail, 
  isValidUsername, 
  containsSqlInjection,
  validatePassword 
} from '../../../utils/validation.js';
import { metrics } from '../../../plugins/metrics.js';

export async function registerUser({ username, email, password }) {
  const db = await initDB();
  
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  if (!isValidUsername(username)) {
    throw new Error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.message);
  }

  if (containsSqlInjection(username) || containsSqlInjection(email)) {
    throw new Error('Invalid characters detected in input');
  }

  
  const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
  
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Username must be at least 3 characters and contain only letters, numbers, and underscores');
  }

  const existingUser = await db.get(
    'SELECT * FROM users WHERE email = ? OR username = ?',
    [email, cleanUsername]
  );

  if (existingUser) {
    throw new Error('Email or username already taken');
  }

  
  const hashedPassword = await argon2.hash(password);

  const avatar = `https://api.dicebear.com/9.x/bottts/svg?seed=${cleanUsername}`;

  const result = await db.run(
    'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
    [cleanUsername, email, hashedPassword, avatar]
  );

  return { 
    id: result.lastID, 
    username: cleanUsername, 
    email,
    avatar
  };
}

export async function loginUser({ email, password }) {
  const db = await initDB();

  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  if (containsSqlInjection(email)) {
    throw new Error('Invalid characters detected in input');
  }

  const user = await db.get(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    throw new Error('User not found');
  }

  
  if (!user.password) {
    throw new Error('This account uses Google OAuth. Please login with Google.');
  }

  const isPasswordValid = await argon2.verify(user.password, password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  return { 
    id: user.id, 
    username: user.username, 
    email: user.email,
    avatar: user.avatar,
    isTwoFAEnabled: Boolean(user.isTwoFAEnabled),
    twoFASecret: user.twoFASecret
  };
}

export async function handleGoogleUser({ email, name, picture }) {
  const db = await initDB();

  let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    const uniqueUsername = generateUniqueUsername(name);
    
    const result = await db.run(
      'INSERT INTO users (username, email, avatar, password, isGoogleAuth) VALUES (?, ?, ?, ?, ?)',
      [uniqueUsername, email, picture, null, true]
    );
    
    metrics.userRegistrations.inc();
    
    user = { 
      id: result.lastID, 
      username: uniqueUsername, 
      email, 
      avatar: picture 
    };
  } else {
    
    const hasUploadedAvatar = user.avatar && (user.avatar.includes('/api/uploads/avatars/'));
    if (!hasUploadedAvatar) {
      await db.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [picture, user.id]
      );
      user.avatar = picture;
    }
  }

  return { 
    id: user.id, 
    username: user.username, 
    email: user.email, 
    avatar: user.avatar,
    isTwoFAEnabled: Boolean(user.isTwoFAEnabled),
    twoFASecret: user.twoFASecret
  };
}


function generateUniqueUsername(name) {
  const timestamp = Date.now();
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');

  const baseName = cleanName || 'user';
  
  const shortName = baseName.substring(0, 10);
  const shortTimestamp = timestamp.toString().slice(-6);
  
  return `${shortName}_${shortTimestamp}`;
}
