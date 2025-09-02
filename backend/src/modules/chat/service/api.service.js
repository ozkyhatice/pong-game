import { initDB } from '../../../config/db.js';

/**
 * Get chat history between two users with pagination and filtering options
 * Uses parameterized queries for SQL injection protection
 * 
 * @param {number} userId - Current user ID
 * @param {number} otherUserId - Other user ID
 * @param {Object} options - Pagination and filtering options
 * @returns {Object} Chat history with pagination info
 */
export async function getChatHistory(userId, otherUserId, options = {}) {
  const db = await initDB();
  
  // Sanitize and validate input parameters
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 50;
  const offset = Number.isInteger(options.offset) && options.offset >= 0 ? options.offset : 0;
  
  let whereClause = `(
    (senderId = ? AND receiverId = ?) OR 
    (senderId = ? AND receiverId = ?)
  )`;
  let params = [userId, otherUserId, otherUserId, userId];
  
  // Date filtering - using parameterized queries for safety
  if (options.before) {
    // Validate date format
    const beforeDate = new Date(options.before);
    if (!isNaN(beforeDate.getTime())) {
      whereClause += ` AND createdAt < ?`;
      params.push(beforeDate.toISOString());
    }
  }
  
  if (options.after) {
    // Validate date format
    const afterDate = new Date(options.after);
    if (!isNaN(afterDate.getTime())) {
      whereClause += ` AND createdAt > ?`;
      params.push(afterDate.toISOString());
    }
  }
  
  // Get total count for pagination
  const countQuery = `SELECT COUNT(*) as total FROM messages WHERE ${whereClause}`;
  const countResult = await db.get(countQuery, params);
  const totalCount = countResult.total;
  
  // Get messages with pagination - using parameterized queries for limit and offset
  let query = `
    SELECT * FROM messages 
    WHERE ${whereClause}
    ORDER BY createdAt DESC 
  `;
  
  let queryParams = [...params];
  
  // Eğer limit belirtilmişse sorguya ekle
  if (limit !== null) {
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
  }
  
  const messages = await db.all(query, queryParams);
  
  return {
    messages: messages.reverse(), // Reverse to show oldest first
    totalCount,
    hasMore: offset + limit < totalCount,
    pagination: {
      limit,
      offset,
      total: totalCount
    }
  };
}

/**
 * Get paginated messages for a conversation
 * Delegates to getChatHistory with page-based parameters
 * Supports loading all messages with limit=-1
 * 
 * @param {number} userId - Current user ID
 * @param {number} otherUserId - Other user ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page, -1 for all messages
 * @returns {Object} Paginated messages
 */
export async function getPaginatedMessages(userId, otherUserId, page = 1, limit = 50) {
  // Handle special case for getting all messages
  if (limit === -1 || limit === '-1') {
    return await getChatHistory(userId, otherUserId, { limit: -1 });
  }
  
  // Validate and sanitize input
  const sanitizedPage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const sanitizedLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 50;
  
  const offset = (sanitizedPage - 1) * sanitizedLimit;
  return await getChatHistory(userId, otherUserId, { limit: sanitizedLimit, offset });
}

/**
 * Get recent conversations for a user
 * Uses parameterized queries for SQL injection protection
 * 
 * @param {number} userId - User ID
 * @param {number} limit - Maximum number of conversations to return
 * @returns {Array} Recent conversations
 */
export async function getRecentConversations(userId, limit = 10) {
  const db = await initDB();
  
  // Sanitize and validate limit
  const sanitizedLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;
  
  const query = `
    SELECT 
      CASE 
        WHEN senderId = ? THEN receiverId 
        ELSE senderId 
      END as otherUserId,
      MAX(createdAt) as lastMessageTime,
      COUNT(*) as messageCount,
      SUM(CASE WHEN receiverId = ? AND isRead = 0 THEN 1 ELSE 0 END) as unreadCount
    FROM messages 
    WHERE senderId = ? OR receiverId = ?
    GROUP BY otherUserId
    ORDER BY lastMessageTime DESC
    LIMIT ?
  `;
  
  const conversations = await db.all(query, [userId, userId, userId, userId, sanitizedLimit]);
  return conversations;
}
