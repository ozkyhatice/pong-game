import { initDB } from '../../../config/db.js';
export async function isExistingFriendRequestService(requesterId, targetId) {
    const db = await initDB();
    const existingRequest = await db.get('SELECT * FROM friends WHERE requesterID = ? AND recipientID = ?', [requesterId, targetId]);
    return existingRequest;
}
export async function addFriendRequestService(requesterId, targetId) {
    const db = await initDB();
    const result = await db.run('INSERT INTO friends (requesterID, recipientID, status) VALUES (?, ?, ?)', [requesterId, targetId, 'pending']);
    return result;
}

export async function getIncomingFriendRequestsService(userId) {
    const db = await initDB();
    const requests = await db.all('SELECT * FROM friends WHERE recipientID = ? AND status = ?', [userId, 'pending']);
    return requests;
}
export async function getIncomingFriendRequestsServiceById(targetId, userId) {
    const db = await initDB();
    const requests = await db.all('SELECT * FROM friends WHERE requesterID = ? AND recipientID = ? AND status = ?', [targetId, userId, 'pending']);
    return requests;
}

export async function postAcceptRequestService(userId, targetId) {
    const db = await initDB();
    const result = await db.run('UPDATE friends SET status = ? WHERE recipientID = ? AND requesterID = ?', ['approved', userId, targetId]);
    return result;
}

export async function isFriend(userId, targetId)
{
    const db = await initDB();

    const result = await db.all(
        "SELECT * FROM friends WHERE ((requesterID = ? AND recipientID = ? AND status = ?) OR (requesterID = ? AND recipientID = ? AND status = ?))",
        [userId, targetId,'approved', targetId, userId, 'approved']
    );
    return result;
}
export async function getFriendsListServices(userId) {
    const db = await initDB();
    const result = await db.all('SELECT * from friends WHERE (requesterID = ? AND status = ?) OR (recipientID = ? AND status = ?)', [userId, 'approved', userId, 'approved']);
    return result;
}
export async function getSentRequestsServices(userId) {
    const db = await initDB();
    const result = await db.all('SELECT * FROM friends WHERE requesterID = ? AND status = ?', [userId, 'pending']);
    return result;
}
export async function deleteFriendServices(userId, targetId) {
    const db = await initDB();
    const result = await db.run(
        'DELETE FROM friends WHERE ((requesterID = ? AND recipientID = ?) OR (requesterID = ? AND recipientID = ?)) AND status = ?',
        [userId, targetId, targetId, userId, 'approved']
    );
    return result;

}

export async function isBlockedAlready(blockerId, blockedId) {
    const db = await initDB();
    const existingBlock = await db.get('SELECT * FROM blocked_users WHERE blockerId = ? AND blockedId = ?', [blockerId, blockedId]);
    return existingBlock;
}
export async function blockFriendServices(blockerId, blockedId) {
    const db = await initDB();
    const existingBlock = await isBlockedAlready(blockerId, blockedId);
    
    if (existingBlock) {
        return { error: 'User is already blocked' };
    }
    
    try{
        await db.run('DELETE FROM friends WHERE (requesterID = ? AND recipientID = ?) OR (requesterID = ? AND recipientID = ?)', [blockerId, blockedId, blockedId, blockerId]);
        const result = await db.run('INSERT INTO blocked_users (blockerId, blockedId) VALUES (?, ?)', [blockerId, blockedId]);
        if (result.changes > 0) {
            return { message: 'User blocked successfully' };
        } else {
            return { error: 'Failed to block user' };
        }
    }catch (error) {
        return { error: error.message };
    }
}

export async function unblockFriendServices(blockerId, blockedId) {
    const db = await initDB();
    const existingBlock = await isBlockedAlready(blockerId, blockedId);
    
    if (!existingBlock) {
        return { error: 'User is not blocked' };
    }
    
    try{
        const result = await db.run('DELETE FROM blocked_users WHERE blockerId = ? AND blockedId = ?', [blockerId, blockedId]);
        if (result.changes > 0) {
            return { message: 'User unblocked successfully' };
        } else {
            return { error: 'Failed to unblock user' };
        }
    }catch (error) {
        return { error: error.message };
    }
}