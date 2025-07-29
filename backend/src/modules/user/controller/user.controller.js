import { 
  getUserById, 
  getUserByUsername as getUserByUsernameService,
  updateProfile
} from '../service/user.service.js';

export async function getMyProfile(request, reply) {
  const userId = request.user.id;

  try {
    const user = await getUserById(userId);
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
  
  try {
    const user = await getUserByUsernameService(username);
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
  const { username, email, avatar } = request.body;

  try {
    const updatedUser = await updateProfile(userId, { username, email, avatar });
    reply.send({ user: updatedUser });
  } catch (error) {
    if (error.message.includes('already taken') || error.message.includes('not found')) {
      return reply.code(400).send({ error: error.message });
    }
    console.error('Error updating user profile:', error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}
