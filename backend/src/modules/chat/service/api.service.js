import { initDB } from '../../../config/db.js';


export async function getChatHistory(userId, otherUserId, options = {}) {
  const db = await initDB();
  
  
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 50;
  const offset = Number.isInteger(options.offset) && options.offset >= 0 ? options.offset : 0;
  
  let whereClause = `(
    (senderId = ? AND receiverId = ?) OR 
    (senderId = ? AND receiverId = ?)
  )`;
  let params = [userId, otherUserId, otherUserId, userId];
  
  
  if (options.before) {
    
    const beforeDate = new Date(options.before);
    if (!isNaN(beforeDate.getTime())) {
      whereClause += ` AND createdAt < ?`;
      params.push(beforeDate.toISOString());
    }
  }
  
  if (options.after) {
    
    const afterDate = new Date(options.after);
    if (!isNaN(afterDate.getTime())) {
      whereClause += ` AND createdAt > ?`;
      params.push(afterDate.toISOString());
    }
  }
  
  
  const countQuery = `SELECT COUNT(*) as total FROM messages WHERE ${whereClause}`;
  const countResult = await db.get(countQuery, params);
  const totalCount = countResult.total;
  
  
  let query = `
    SELECT * FROM messages 
    WHERE ${whereClause}
    ORDER BY createdAt DESC 
  `;
  
  let queryParams = [...params];
  
  
  if (limit !== null) {
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
  }
  
  const messages = await db.all(query, queryParams);
  
  return {
    messages: messages.reverse(), 
    totalCount,
    hasMore: offset + limit < totalCount,
    pagination: {
      limit,
      offset,
      total: totalCount
    }
  };
}


export async function getPaginatedMessages(userId, otherUserId, page = 1, limit = 50) {
  
  if (limit === -1 || limit === '-1') {
    return await getChatHistory(userId, otherUserId, { limit: -1 });
  }
  
  
  const sanitizedPage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const sanitizedLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 50;
  
  const offset = (sanitizedPage - 1) * sanitizedLimit;
  return await getChatHistory(userId, otherUserId, { limit: sanitizedLimit, offset });
}


export async function getRecentConversations(userId, limit = 10) {
  const db = await initDB();
  
  
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
