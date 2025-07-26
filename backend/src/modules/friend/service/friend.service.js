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