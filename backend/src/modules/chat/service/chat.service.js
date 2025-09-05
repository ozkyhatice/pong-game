import { initDB } from '../../../config/db.js';




export async function getUnreadMessages(userId) {
  const db = await initDB();
  
  const unreadMessages = await db.all(
    'SELECT * FROM messages WHERE receiverId = ? AND isRead = ?', 
    [userId, 0]
  );
  return unreadMessages;
}




export async function getUndeliveredMessages(userId) {
  const db = await initDB();
  
  const undeliveredMessages = await db.all(
    'SELECT * FROM messages WHERE receiverId = ? AND delivered = ?', 
    [userId, 0]
  );
  return undeliveredMessages;
}




export async function markMessagesAsRead(userId) {
  const db = await initDB();
  
  await db.run(
    'UPDATE messages SET isRead = 1 WHERE receiverId = ? AND isRead = 0',
    [userId]
  );
}







export async function addMessageToDb(senderId, receiverId, content) {
  
  if (!senderId || !receiverId || !content) {
    throw new Error('Missing required parameters');
  }

  const db = await initDB();
  
  const result = await db.run(
    'INSERT INTO messages (senderId, receiverId, content, isRead, delivered) VALUES (?, ?, ?, ?, ?)',
    [senderId, receiverId, content, 0, 0]
  );
  return result;
}







export async function updateMessageStatus(senderId, receiverId, messageData) {
  const db = await initDB();
  
  if (!messageData || !messageData.id) {
    throw new Error('Invalid message data');
  }
  
  const msgId = messageData.id;
  
  
  const result = await db.run(
    'UPDATE messages SET delivered = 1 WHERE id = ? AND senderId = ? AND receiverId = ?',
    [msgId, senderId, receiverId]
  );
  
}






export async function markSpecificMessagesAsRead(userId, senderId) {
  const db = await initDB();
  
  if (!userId || !senderId) {
    throw new Error('Both userId and senderId are required');
  }
  
  const result = await db.run(
    'UPDATE messages SET isRead = 1 WHERE receiverId = ? AND senderId = ? AND isRead = 0',
    [userId, senderId]
  );
  return result.changes;
}