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
    const result = await db.all('SELECT * FROM friends WHERE requesterID = ? AND recipientID = ? AND status = ?', [userId, targetId, 'approved']);
    return result;
}
