import { initDB } from '../../../config/db.js';

// Get unread messages for a user
//param {number} userId - User ID
//returns {Array} Unread messages
export async function getUnreadMessages(userId) {
  const db = await initDB();
  // Parameterized query prevents SQL injection
  const unreadMessages = await db.all(
    'SELECT * FROM messages WHERE receiverId = ? AND isRead = ?', 
    [userId, 0]
  );
  return unreadMessages;
}

// Get undelivered messages for a user
//param {number} userId - User ID
//returns {Array} Undelivered messages
export async function getUndeliveredMessages(userId) {
  const db = await initDB();
  // Parameterized query prevents SQL injection
  const undeliveredMessages = await db.all(
    'SELECT * FROM messages WHERE receiverId = ? AND delivered = ?', 
    [userId, 0]
  );
  return undeliveredMessages;
}

// Mark all messages as read for a user
//param {number} userId - User ID
//returns {void}
export async function markMessagesAsRead(userId) {
  const db = await initDB();
  // Parameterized query prevents SQL injection
  await db.run(
    'UPDATE messages SET isRead = 1 WHERE receiverId = ? AND isRead = 0',
    [userId]
  );
}

// Add a new message to the database
// Uses parameterized queries for SQL injection protection
//param {number} senderId - Sender user ID
//param {number} receiverId - Receiver user ID
//param {string} content - Message content
//returns {Object} Result of the insert operation
export async function addMessageToDb(senderId, receiverId, content) {
  // Input validation - ensure IDs are numbers and content exists
  if (!senderId || !receiverId || !content) {
    throw new Error('Missing required parameters');
  }

  const db = await initDB();
  // Parameterized query prevents SQL injection
  const result = await db.run(
    'INSERT INTO messages (senderId, receiverId, content, isRead, delivered) VALUES (?, ?, ?, ?, ?)',
    [senderId, receiverId, content, 0, 0]
  );
  return result;
}

// Update message status to delivered
// Uses parameterized queries for SQL injection protection
//param {number} senderId - Sender user ID
//param {number} receiverId - Receiver user ID
//param {Object} messageData - Message data containing at least the message ID
//returns {void}
export async function updateMessageStatus(senderId, receiverId, messageData) {
  const db = await initDB();
  
  if (!messageData || !messageData.id) {
    throw new Error('Invalid message data');
  }
  
  const msgId = messageData.id;
  
  // Parameterized query prevents SQL injection
  const result = await db.run(
    'UPDATE messages SET delivered = 1 WHERE id = ? AND senderId = ? AND receiverId = ?',
    [msgId, senderId, receiverId]
  );
  
}

// Mark messages as read from a specific sender
// Uses parameterized queries for SQL injection protection
//param {number} userId - Receiver user ID
//param {number} senderId - Sender user ID
//returns {number} Number of messages marked as read
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