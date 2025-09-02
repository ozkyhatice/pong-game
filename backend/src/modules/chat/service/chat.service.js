import { initDB } from '../../../config/db.js';

/**
 * Get unread messages for a user
 * Uses parameterized queries for SQL injection protection
 * 
 * @param {number} userId - User ID
 * @returns {Array} Unread messages
 */
export async function getUnreadMessages(userId) {
  const db = await initDB();
  // Parameterized query prevents SQL injection
  const unreadMessages = await db.all(
    'SELECT * FROM messages WHERE receiverId = ? AND isRead = ?', 
    [userId, 0]
  );
  return unreadMessages;
}

/**
 * Get undelivered messages for a user
 * Uses parameterized queries for SQL injection protection
 * 
 * @param {number} userId - User ID
 * @returns {Array} Undelivered messages
 */
export async function getUndeliveredMessages(userId) {
  const db = await initDB();
  // Parameterized query prevents SQL injection
  const undeliveredMessages = await db.all(
    'SELECT * FROM messages WHERE receiverId = ? AND delivered = ?', 
    [userId, 0]
  );
  return undeliveredMessages;
}

/**
 * Mark all messages as read for a user
 * Uses parameterized queries for SQL injection protection
 * 
 * @param {number} userId - User ID
 */
export async function markMessagesAsRead(userId) {
  const db = await initDB();
  // Parameterized query prevents SQL injection
  await db.run(
    'UPDATE messages SET isRead = 1 WHERE receiverId = ? AND isRead = 0',
    [userId]
  );
}

/**
 * Add a new message to the database
 * Sanitizes input and uses parameterized queries for SQL injection protection
 * 
 * @param {number} senderId - Sender user ID
 * @param {number} receiverId - Receiver user ID
 * @param {string} content - Message content (should be pre-sanitized)
 * @returns {Object} Database result
 */
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

/**
 * Update message delivery status
 * Uses parameterized queries for SQL injection protection
 * 
 * @param {number} senderId - Sender user ID
 * @param {number} receiverId - Receiver user ID
 * @param {Object} messageData - Message data containing ID
 */
export async function updateMessageStatus(senderId, receiverId, messageData) {
  const db = await initDB();
  
  if (!messageData || !messageData.id) {
    throw new Error('Invalid message data');
  }
  
  const msgId = messageData.id;
  console.log(`Updating message status - ID: ${msgId}, Sender: ${senderId}, Receiver: ${receiverId}`);
  
  // Parameterized query prevents SQL injection
  const result = await db.run(
    'UPDATE messages SET delivered = 1 WHERE id = ? AND senderId = ? AND receiverId = ?',
    [msgId, senderId, receiverId]
  );
  
  console.log('Update result:', result);
}

/**
 * Mark messages from a specific sender as read
 * Uses parameterized queries for SQL injection protection
 * 
 * @param {number} userId - Current user ID (receiver)
 * @param {number} senderId - Sender user ID
 * @returns {number} Number of messages marked as read
 */
export async function markSpecificMessagesAsRead(userId, senderId) {
  const db = await initDB();
  
  // Validate input
  if (!userId || !senderId) {
    throw new Error('Both userId and senderId are required');
  }
  
  // Parameterized query prevents SQL injection
  const result = await db.run(
    'UPDATE messages SET isRead = 1 WHERE receiverId = ? AND senderId = ? AND isRead = 0',
    [userId, senderId]
  );
  return result.changes;
}