import { 
  getUserByUsername as getUserByUsernameService,
  getUserById as getUserByIdService,
  updateProfile,
  updateAvatar
} from '../service/user.service.js';
import { escapeFields, sanitizeInput } from '../../../utils/security.js';
import fs from 'fs';
import path from 'path';
import { initDB } from '../../../config/db.js';

export async function getMyProfile(request, reply) {
  const userId = request.user.id;

  try {
    const user = await getUserByIdService(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    reply.send({ user });
  } catch (error) {
    console.error('Error getting user profile:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}

export async function getUserByUsername(request, reply) {
  const { username } = request.params;
  
  // XSS koruması için username'i sanitize et
  const sanitizedUsername = sanitizeInput(username);
  
  try {
    const user = await getUserByUsernameService(sanitizedUsername);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    reply.send({ user });
  } catch (error) {
    console.error('Error getting user by username:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}

export async function updateMyProfile(request, reply) {
  const userId = request.user.id;
  const { username, email } = request.body;

  // XSS koruması için input'ları escape et
  const sanitizedData = escapeFields({ username, email }, ['username', 'email']);

  try {
    const updatedUser = await updateProfile(userId, sanitizedData);
    reply.send({ user: updatedUser });
  } catch (error) {
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

  try {
    const user = await getUserByIdService(id);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    reply.send({ user });
  } catch (error) {
    console.error('Error getting user by id:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}

// Check user's tournament status
export async function getUserTournamentStatus(request, reply) {
  const { id } = request.params;
  
  try {
    const db = await initDB();
    const user = await db.get(
      'SELECT currentTournamentId, isEliminated FROM users WHERE id = ?', 
      [id]
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
    
    // Get tournament info
    const tournament = await db.get(
      'SELECT status FROM tournaments WHERE id = ?',
      [user.currentTournamentId]
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