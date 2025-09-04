import { initDB } from '../../../config/db.js';

export async function isExistingFriendRequest(requesterId, targetId) {
  const db = await initDB();
  // two way check for existing requests
  const existingRequest = await db.get(
    'SELECT * FROM friends WHERE ((requesterID = ? AND recipientID = ?) OR (requesterID = ? AND recipientID = ?))',
    [requesterId, targetId, targetId, requesterId]
  );
  return existingRequest;
}

export async function addFriendRequest(requesterId, targetId) {
  const db = await initDB();
  const result = await db.run(
    'INSERT INTO friends (requesterID, recipientID, status) VALUES (?, ?, ?)', 
    [requesterId, targetId, 'pending']
  );
  return result;
}

export async function getIncomingFriendRequestById(targetId, userId) {
  const db = await initDB();
  const requests = await db.all(
    'SELECT * FROM friends WHERE requesterID = ? AND recipientID = ? AND status = ?', 
    [targetId, userId, 'pending']
  );
  return requests;
}

export async function acceptFriendRequest(userId, targetId) {
  const db = await initDB();
  const result = await db.run(
    'UPDATE friends SET status = ? WHERE recipientID = ? AND requesterID = ?', 
    ['approved', userId, targetId]
  );
  return result;
}

export async function isFriend(userId, targetId) {
  const db = await initDB();
  const result = await db.all(
    `SELECT * FROM friends WHERE 
     ((requesterID = ? AND recipientID = ? AND status = ?) OR 
      (requesterID = ? AND recipientID = ? AND status = ?))`,
    [userId, targetId, 'approved', targetId, userId, 'approved']
  );
  return result;
}

export async function isBlockedAlready(blockerId, blockedId) {
  const db = await initDB();
  const existingBlock = await db.get(
    'SELECT * FROM blocked_users WHERE blockerId = ? AND blockedId = ?', 
    [blockerId, blockedId]
  );
  return existingBlock;
}

export async function blockFriend(blockerId, blockedId) {
  const db = await initDB();
  const existingBlock = await isBlockedAlready(blockerId, blockedId);
  
  if (existingBlock) {
    return { error: 'User is already blocked' };
  }
  
  try {
    // Delete any existing friendship (accepted or pending) between the users
    await db.run(
      'DELETE FROM friends WHERE (requesterID = ? AND recipientID = ?) OR (requesterID = ? AND recipientID = ?)', 
      [blockerId, blockedId, blockedId, blockerId]
    );
    
    // Add the block entry
    const result = await db.run(
      'INSERT INTO blocked_users (blockerId, blockedId) VALUES (?, ?)', 
      [blockerId, blockedId]
    );
    
    if (result.changes > 0) {
      return { message: 'User blocked successfully' };
    } else {
      return { error: 'Failed to block user' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

export async function unblockFriend(blockerId, blockedId) {
  const db = await initDB();
  const existingBlock = await isBlockedAlready(blockerId, blockedId);
  
  if (!existingBlock) {
    return { error: 'User is not blocked' };
  }
  
  try {
    const result = await db.run(
      'DELETE FROM blocked_users WHERE blockerId = ? AND blockedId = ?', 
      [blockerId, blockedId]
    );
    
    if (result.changes > 0) {
      return { message: 'User unblocked successfully' };
    } else {
      return { error: 'Failed to unblock user' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

export async function rejectFriendRequest(userId, targetId) {
  const db = await initDB();
  const result = await db.run(
    'DELETE FROM friends WHERE requesterID = ? AND recipientID = ? AND status = ?',
    [targetId, userId, 'pending']
  );
  return result;
}

export async function deleteFriend(userId, targetId) {
  const db = await initDB();
  const result = await db.run(
    'DELETE FROM friends WHERE (requesterID = ? AND recipientID = ?) OR (requesterID = ? AND recipientID = ?)', 
    [userId, targetId, targetId, userId]
  );
  return result;
}

export async function getFriendsListWithUserInfo(userId) {
  const db = await initDB();
  
  // Get friends list with blocked users excluded
  const friends = await db.all(`
    SELECT f.* FROM friends f
    WHERE ((f.requesterID = ? AND f.status = 'approved') OR (f.recipientID = ? AND f.status = 'approved'))
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b1 
      WHERE (b1.blockerId = ? AND b1.blockedId = CASE WHEN f.requesterID = ? THEN f.recipientID ELSE f.requesterID END)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b2 
      WHERE (b2.blockerId = CASE WHEN f.requesterID = ? THEN f.recipientID ELSE f.requesterID END AND b2.blockedId = ?)
    )
  `, [userId, userId, userId, userId, userId, userId]);
  
  // Get user info for each friend
  const enrichedFriends = [];
  for (const friend of friends) {
    const friendId = friend.requesterID === userId ? friend.recipientID : friend.requesterID;
    const userInfo = await db.get(
      'SELECT id, username, avatar, wins, losses FROM users WHERE id = ?',
      [friendId]
    );
    
    if (userInfo) {
      enrichedFriends.push({
        ...friend,
        friendInfo: userInfo
      });
    }
  }
  
  return enrichedFriends;
}

export async function getIncomingFriendRequestsWithUserInfo(userId) {
  const db = await initDB();
  
  // Get incoming requests with blocked users excluded
  const requests = await db.all(`
    SELECT f.* FROM friends f
    WHERE f.recipientID = ? AND f.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b1 
      WHERE (b1.blockerId = ? AND b1.blockedId = f.requesterID)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b2 
      WHERE (b2.blockerId = f.requesterID AND b2.blockedId = ?)
    )
  `, [userId, userId, userId]);
  
  // Get sender info for each request
  const enrichedRequests = [];
  for (const request of requests) {
    const senderInfo = await db.get(
      'SELECT id, username, avatar, wins, losses FROM users WHERE id = ?',
      [request.requesterID]
    );
    
    if (senderInfo) {
      enrichedRequests.push({
        ...request,
        senderInfo: senderInfo
      });
    }
  }
  
  return enrichedRequests;
}

export async function getSentRequestsWithUserInfo(userId) {
  const db = await initDB();
  
  // Get sent requests with blocked users excluded
  const requests = await db.all(`
    SELECT f.* FROM friends f
    WHERE f.requesterID = ? AND f.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b1 
      WHERE (b1.blockerId = ? AND b1.blockedId = f.recipientID)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b2 
      WHERE (b2.blockerId = f.recipientID AND b2.blockedId = ?)
    )
  `, [userId, userId, userId]);
  
  // Get target info for each request
  const enrichedRequests = [];
  for (const request of requests) {
    const targetInfo = await db.get(
      'SELECT id, username, avatar, wins, losses FROM users WHERE id = ?',
      [request.recipientID]
    );
    
    if (targetInfo) {
      enrichedRequests.push({
        ...request,
        targetInfo: targetInfo
      });
    }
  }
  
  return enrichedRequests;
}


// blocked users list
export async function getBlockedUsers(userId) {
  const db = await initDB();
  
  // engellenen kullanıcılar 
  const blockedEntries = await db.all(
    'SELECT * FROM blocked_users WHERE blockerId = ?', 
    [userId]
  );
  const blockedUsers = [];
  for (const entry of blockedEntries) {
    const blockedInfo = await db.get(
      'SELECT id, username, avatar, wins, losses FROM users WHERE id = ?',
      [entry.blockedId]
    );
    if (blockedInfo) {
      blockedUsers.push(blockedInfo);
    }
  }
  return blockedUsers;

}

export async function isUserBlocked(senderId, receiverId) {
  const db = await initDB();
  
  // Check if receiver has blocked the sender
  const blockEntry = await db.get(
    'SELECT * FROM blocked_users WHERE blockerId = ? AND blockedId = ?',
    [receiverId, senderId]
  );
  
  return blockEntry !== undefined;
}


