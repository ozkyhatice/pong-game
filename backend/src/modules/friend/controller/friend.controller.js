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
  getBlockedUsers
} from '../service/friend.service.js';
import { validateUserId, sanitizeFriendData } from '../utils/validation.js';
import { containsSqlInjection } from '../../../utils/validation.js';
import { escapeHTML } from '../../../utils/security.js';

export async function createFriendRequest(request, reply) {
  const requesterId = request.user.id;
  const targetIdRaw = request.params.targetId;

  // Validate and sanitize target ID
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  // Check for SQL injection patterns in all inputs
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
    console.error('Error sending friend request:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function getIncomingRequests(request, reply) {
  const userId = request.user.id;
  
  // Check for SQL injection in userId
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const requests = await getIncomingFriendRequestsWithUserInfo(userId);
    
    // Sanitize user data before sending response
    const sanitizedRequests = requests.map(request => {
      // Create a new object to avoid modifying the original
      const sanitizedRequest = { ...request };
      
      // Sanitize sender info
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
    console.error('Error retrieving incoming requests:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function acceptRequest(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.targetId;

  // Validate and sanitize target ID
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  // Check for SQL injection patterns
  if (containsSqlInjection(String(userId)) || containsSqlInjection(String(targetId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
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

  // Validate and sanitize target ID
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  // Check for SQL injection patterns
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
  
  // Check for SQL injection in userId
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const friends = await getFriendsListWithUserInfo(userId);
    
    // Sanitize user data before sending response
    const sanitizedFriends = friends.map(friend => {
      // Create a new object to avoid modifying the original
      const sanitizedFriend = { ...friend };
      
      // Sanitize friend info
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
    console.error('Error retrieving friends list:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function getSentRequestsController(request, reply) {
  const userId = request.user.id;
  
  // Check for SQL injection in userId
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const requests = await getSentRequestsWithUserInfo(userId);
    
    // Sanitize user data before sending response
    const sanitizedRequests = requests.map(request => {
      // Create a new object to avoid modifying the original
      const sanitizedRequest = { ...request };
      
      // Sanitize target info
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
    console.error('Error retrieving sent requests:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function blockFriendController(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.id;
  
  // Validate and sanitize target ID
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  // Check for SQL injection patterns
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
    console.error('Error blocking user:', error);
    return reply.code(500).send({ error: 'Internal server error' });    
  }
}

export async function unblockFriendController(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.id;
  
  // Validate and sanitize target ID
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  // Check for SQL injection patterns
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
    console.error('Error unblocking user:', error);
    return reply.code(500).send({ error: 'Internal server error' });    
  }
}

export async function deleteFriendController(request, reply) {
  const userId = request.user.id;
  const targetIdRaw = request.params.targetId;

  // Validate and sanitize target ID
  const targetIdValidation = validateUserId(targetIdRaw);
  if (!targetIdValidation.isValid) {
    return reply.code(400).send({ error: targetIdValidation.message });
  }
  
  const targetId = targetIdValidation.sanitizedValue;

  // Check for SQL injection patterns
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
    console.error('Error removing friend:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

export async function getBlockedUsersController(request, reply) {
  const userId = request.user.id;
  
  // Check for SQL injection in userId
  if (containsSqlInjection(String(userId))) {
    return reply.code(400).send({ error: 'Invalid input detected' });
  }

  try {
    const blockedUsers = await getBlockedUsers(userId);
    
    // Sanitize user data before sending response
    const sanitizedBlockedUsers = blockedUsers.map(user => {
      // Sanitize any string fields to prevent XSS
      if (user.username) user.username = escapeHTML(user.username);
      if (user.avatar) user.avatar = escapeHTML(user.avatar);
      return user;
    });
    
    return reply.code(200).send({ blockedUsers: sanitizedBlockedUsers });
  } catch (error) {
    console.error('Error retrieving blocked users:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}