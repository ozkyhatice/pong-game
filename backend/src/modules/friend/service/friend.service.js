import { initDB } from '../../../config/db.js';
export async function isExistingFriendRequestService(requesterId, targetId) {
    const db = await initDB();
    const existingRequest = await db.get('SELECT * FROM friends WHERE requesterID = ? AND recipientID = ?', [requesterId, targetId]);
    return existingRequest;
}