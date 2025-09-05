import { findUserById } from '../../user/service/user.service.js';
import {
  isExistingFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  isFriend,
  getIncomingFriendRequestById,
  addFriendRequest,
  deleteFriend,
  blockFriend,
  unblockFriend,
  getFriendsListWithUserInfo,
  getIncomingFriendRequestsWithUserInfo,
  getSentRequestsWithUserInfo,
  getBlockedUsers,
  isUserBlocked
} from '../service/friend.service.js';
import { validateUserId} from '../utils/validation.js';
import { containsSqlInjection } from '../../../utils/validation.js';
import { escapeHTML } from '../../../utils/security.js';

export async function createFriendRequest(request, reply) {
  const requesterId = request.user.id;
  const targetIdRaw = request.params.targetId;

  
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  
  if (containsSqlInjection(String(requesterId)) || containsSqlInjection(String(targetId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  const existingUser = await findUserById(targetId);
  if (!existingUser) {
    return reply.code(404).send({ error: 'Target user not found' });
  }

  if (requesterId == targetId) {
    return reply.code(400).send({ error: 'You cannot send a friend request to yourself' });
  }

  
  const isBlocked = await isUserBlocked(requesterId, targetId);
  const isBlockedReverse = await isUserBlocked(targetId, requesterId);
  
  if (isBlocked || isBlockedReverse) {
    return reply.code(400).send({ error: 'Cannot send friend request to this user' });
  }

  const existingRequest = await isExistingFriendRequest(requesterId, targetId);
  if (existingRequest) {
    return reply.code(400).send({ error: 'Friend request already exists' });
  }

  try {
    const result = await addFriendRequest(requesterId, targetId);
    if (result.changes > 0) {
      return reply.code(201).send({ message: 'Friend request sent successfully' });
    } else {
      return reply.code(500).send({ error: 'Failed to send friend request' });
    }
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function getIncomingRequests(request, reply) {
  const userId = request.user.id;
  
  
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const requests = await getIncomingFriendRequestsWithUserInfo(userId);
    
    
    const sanitizedRequests = requests.map(request => {
      
      const sanitizedRequest = { ...request };
      
      
      if (sanitizedRequest.senderInfo) {
        if (sanitizedRequest.senderInfo.username) {
          sanitizedRequest.senderInfo.username = escapeHTML(sanitizedRequest.senderInfo.username);
        }
        if (sanitizedRequest.senderInfo.avatar) {
          sanitizedRequest.senderInfo.avatar = escapeHTML(sanitizedRequest.senderInfo.avatar);
        }
      }
      
      return sanitizedRequest;
    });
    
    return reply.code(200).send({ requests: sanitizedRequests });
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function acceptRequest(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.targetId;

  
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  
  if (containsSqlInjection(String(userId)) || containsSqlInjection(String(targetId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  
  const isBlocked = await isUserBlocked(userId, targetId);
  const isBlockedReverse = await isUserBlocked(targetId, userId);
  
  if (isBlocked || isBlockedReverse) {
    return reply.code(400).send({ error: 'Cannot accept friend request from this user' });
  }

  const alreadyFriend = await isFriend(targetId, userId);
  if (alreadyFriend.length > 0) {
    return reply.code(409).send({ message: "You are already friends" });
  }

  const pendingRequest = await getIncomingFriendRequestById(targetId, userId);
  if (!pendingRequest || pendingRequest.length === 0) {
    return reply.code(404).send({ message: "No pending request found" });
  }

  const accept = await acceptFriendRequest(userId, targetId);
  if (accept.changes > 0) {
    return reply.code(201).send({ message: "Accepted request" });
  } else {
    return reply.code(500).send({ message: "Failed to accept request" });
  }
}

export async function rejectRequest(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.targetId;

  
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  
  if (containsSqlInjection(String(userId)) || containsSqlInjection(String(targetId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  const pendingRequest = await getIncomingFriendRequestById(targetId, userId);
  if (!pendingRequest || pendingRequest.length === 0) {
    return reply.code(404).send({ message: "No pending request found" });
  }

  const reject = await rejectFriendRequest(userId, targetId);
  if (reject.changes > 0) {
    return reply.code(200).send({ message: "Request rejected" });
  } else {
    return reply.code(500).send({ message: "Failed to reject request" });
  }
}

export async function getFriendsListController(request, reply) {
  const userId = request.user.id;
  
  
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const friends = await getFriendsListWithUserInfo(userId);
    
    
    const sanitizedFriends = friends.map(friend => {
      
      const sanitizedFriend = { ...friend };
      
      
      if (sanitizedFriend.friendInfo) {
        if (sanitizedFriend.friendInfo.username) {
          sanitizedFriend.friendInfo.username = escapeHTML(sanitizedFriend.friendInfo.username);
        }
        if (sanitizedFriend.friendInfo.avatar) {
          sanitizedFriend.friendInfo.avatar = escapeHTML(sanitizedFriend.friendInfo.avatar);
        }
      }
      
      return sanitizedFriend;
    });
    
    return reply.code(200).send({ friends: sanitizedFriends });
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function getSentRequestsController(request, reply) {
  const userId = request.user.id;
  
  
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const requests = await getSentRequestsWithUserInfo(userId);
    
    
    const sanitizedRequests = requests.map(request => {
      
      const sanitizedRequest = { ...request };
      
      
      if (sanitizedRequest.targetInfo) {
        if (sanitizedRequest.targetInfo.username) {
          sanitizedRequest.targetInfo.username = escapeHTML(sanitizedRequest.targetInfo.username);
        }
        if (sanitizedRequest.targetInfo.avatar) {
          sanitizedRequest.targetInfo.avatar = escapeHTML(sanitizedRequest.targetInfo.avatar);
        }
      }
      
      return sanitizedRequest;
    });
    
    return reply.code(200).send({ requests: sanitizedRequests });
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function blockFriendController(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.id;
  
  
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  
  if (containsSqlInjection(String(userId)) || containsSqlInjection(String(targetId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  const user = await findUserById(targetId);
  if (!user) {
    return reply.code(404).send({ error: 'Target user not found' });
  }

  if (userId == targetId) {
    return reply.code(400).send({ error: 'You cannot block yourself' });
  }

  try {
    const result = await blockFriend(userId, targetId);
    if (result.error) {
      return reply.code(400).send(result);
    } else if (result.message) {
      return reply.code(200).send(result);
    } else {
      return reply.code(500).send({ error: 'Failed to block user' });
    }
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });    
  }
}

export async function unblockFriendController(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.id;
  
  
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  
  if (containsSqlInjection(String(userId)) || containsSqlInjection(String(targetId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  const user = await findUserById(targetId);
  if (!user) {
    return reply.code(404).send({ error: 'Target user not found' });
  }

  if (userId == targetId) {
    return reply.code(400).send({ error: 'You cannot unblock yourself' });
  }

  try {
    const result = await unblockFriend(userId, targetId);
    if (result.error) {
      return reply.code(400).send(result);
    } else if (result.message) {
      return reply.code(200).send(result);
    } else {
      return reply.code(500).send({ error: 'Failed to unblock user' });
    }
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });    
  }
}

export async function deleteFriendController(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.targetId;

  
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  
  if (containsSqlInjection(String(userId)) || containsSqlInjection(String(targetId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  const user = await findUserById(targetId);
  if (!user) {
    return reply.code(404).send({ error: 'Target user not found' });
  }

  if (userId == targetId) {
    return reply.code(400).send({ error: 'You cannot remove yourself' });
  }
  
  try {
    const result = await deleteFriend(userId, targetId);
    if (result.changes > 0) {
      return reply.code(200).send({ message: 'Friend removed successfully' });
    } else {
      return reply.code(500).send({ error: 'Failed to remove friend' });
    }
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function getBlockedUsersController(request, reply) {
  const userId = request.user.id;
  
  
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const blockedUsers = await getBlockedUsers(userId);
    
    
    const sanitizedBlockedUsers = blockedUsers.map(user => {
      
      if (user.username) user.username = escapeHTML(user.username);
      if (user.avatar) user.avatar = escapeHTML(user.avatar);
      return user;
    });
    
    return reply.code(200).send({ blockedUsers: sanitizedBlockedUsers });
  } catch (error) {
    return reply.code(500).send({ error: 'Internal server error' });
  }
}