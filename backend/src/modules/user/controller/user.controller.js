import { 
  getUserByUsername as getUserByUsernameService,
  getUserById as getUserByIdService,
  updateProfile,
  updateAvatar
} from '../service/user.service.js';
import { escapeFields, sanitizeInput } from '../../../utils/security.js';
import { 
  isValidEmail, 
  isValidUsername, 
  containsSqlInjection,
  sanitizeGeneralInput 
} from '../../../utils/validation.js';
import fs from 'fs';
import path from 'path';
import { initDB } from '../../../config/db.js';
import { 
  sanitizeUserInput, 
  validateUserInput, 
  isValidUserId, 
  prepareSqlParams,
  sanitizeUserProfile 
} from '../utils/security.utils.js';

export async function getMyProfile(request, reply) {
  const userId = request.user.id;
  
  // Validate userId to prevent injection
  if (!isValidUserId(userId)) {
    console.error(`🛡️ SECURITY: Invalid user ID format -> ${userId}`);
    return reply.code(400).send({ error: 'Invalid user ID format' });
  }

  try {
    const user = await getUserByIdService(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    // Sanitize user data before sending to client
    const sanitizedUser = sanitizeUserProfile(user);
    reply.send({ user: sanitizedUser });
  } catch (error) {
    console.error('Error getting user profile:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}

export async function getUserByUsername(request, reply) {
  const { username } = request.params;
  
  // Username validation
  if (!isValidUsername(username)) {
    return reply.code(400).send({ 
      error: 'Invalid username format' 
    });
  }

  // SQL injection kontrolü
  if (containsSqlInjection(username)) {
    console.error(`🛡️ SECURITY: SQL injection attempt detected in username -> ${username}`);
    return reply.code(400).send({ 
      error: 'Invalid characters detected in username' 
    });
  }
  
  // XSS koruması için username'i sanitize et
  const sanitizedUsername = sanitizeGeneralInput(username, { maxLength: 20 });
  
  try {
    const user = await getUserByUsernameService(sanitizedUsername);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    // Sanitize user data before sending to client
    const sanitizedUser = sanitizeUserProfile(user);
    reply.send({ user: sanitizedUser });
  } catch (error) {
    console.error('Error getting user by username:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}

export async function updateMyProfile(request, reply) {
  const userId = request.user.id;
  
  // Validate userId to prevent injection
  if (!isValidUserId(userId)) {
    console.error(`🛡️ SECURITY: Invalid user ID format -> ${userId}`);
    return reply.code(400).send({ error: 'Invalid user ID format' });
  }
  
  const { username, email } = request.body;

  // Validate input using our validation utility
  const validation = validateUserInput({ username, email });
  if (!validation.isValid) {
    return reply.code(400).send({ error: validation.message });
  }

  // Temel validation kontrolü
  if (!username && !email) {
    return reply.code(400).send({
      error: 'At least one field (username or email) is required'
    });
  }

  // SQL injection kontrolü
  if ((username && containsSqlInjection(username)) || (email && containsSqlInjection(email))) {
    console.error(`🛡️ SECURITY: SQL injection attempt detected in profile update`);
    return reply.code(400).send({
      error: 'Invalid characters detected in input'
    });
  }

  // XSS koruması için input'ları sanitize et
  const sanitizedData = sanitizeUserInput({ username, email });

  try {
    const updatedUser = await updateProfile(userId, sanitizedData);
    
    // Sanitize user data before sending to client
    const sanitizedUpdatedUser = sanitizeUserProfile(updatedUser);
    reply.send({ user: sanitizedUpdatedUser });
  } catch (error) {
    console.error('Error updating user profile:', error);
    reply.code(400).send({ error: error.message });
  }
}

export async function updateMyAvatar(request, reply) {
  const userId = request.user.id;

  try {
    // Dosya geldi mi kontrol et
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Dosya türü kontrol et (sadece resim kabul et)
    if (!data.mimetype.startsWith('image/')) {
      return reply.code(400).send({ error: 'Only image files are allowed' });
    }

    // Dosya boyutu kontrol et (5MB max)
    let buffer;
    try {
      buffer = await data.toBuffer();
    } catch (bufferError) {
      return reply.code(400).send({ error: 'File too large. Maximum 5MB allowed' });
    }

    // Dosya adı oluştur (userId + timestamp + uzantı)
    const fileExtension = path.extname(data.filename);
    const fileName = `${userId}_${Date.now()}${fileExtension}`;
    
    // uploads/avatars klasörü var mı kontrol et, yoksa oluştur
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Dosyayı kaydet
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Veritabanında avatar yolunu güncelle
    const avatarUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/uploads/avatars/${fileName}`;
    const updatedUser = await updateAvatar(userId, avatarUrl);

    reply.send({ 
      message: 'Avatar uploaded successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user avatar:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}

export async function getUserById(request, reply) {
  const { id } = request.params;
  
  // Validate userId to prevent injection
  if (!isValidUserId(id)) {
    console.error(`🛡️ SECURITY: Invalid user ID format -> ${id}`);
    return reply.code(400).send({ error: 'Invalid user ID format' });
  }

  try {
    const user = await getUserByIdService(id);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    // Sanitize user data before sending to client
    const sanitizedUser = sanitizeUserProfile(user);
    reply.send({ user: sanitizedUser });
  } catch (error) {
    console.error('Error getting user by id:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}

// Check user's tournament status
export async function getUserTournamentStatus(request, reply) {
  const { id } = request.params;
  
  // Validate userId to prevent injection
  if (!isValidUserId(id)) {
    console.error(`🛡️ SECURITY: Invalid user ID format -> ${id}`);
    return reply.code(400).send({ error: 'Invalid user ID format' });
  }
  
  try {
    const db = await initDB();
    
    // Use prepareSqlParams to prevent SQL injection
    const params = prepareSqlParams([id]);
    
    const user = await db.get(
      'SELECT currentTournamentId, isEliminated FROM users WHERE id = ?', 
      params
    );
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    if (!user.currentTournamentId) {
      return reply.send({ 
        isInTournament: false,
        isEliminated: false,
        tournamentId: null,
        tournamentStatus: null
      });
    }
    
    // Get tournament info - use prepareSqlParams for the tournamentId
    const tournamentParams = prepareSqlParams([user.currentTournamentId]);
    const tournament = await db.get(
      'SELECT status FROM tournaments WHERE id = ?',
      tournamentParams
    );
    
    reply.send({
      isInTournament: true,
      isEliminated: !!user.isEliminated,
      tournamentId: user.currentTournamentId,
      tournamentStatus: tournament?.status || 'unknown'
    });
    
  } catch (error) {
    console.error('Error checking tournament status:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}