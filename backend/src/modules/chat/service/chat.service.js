import { initDB } from '../../../config/db.js';
import { 
  broadcastToAll,
  sendToUser
} from '../../../websocket/services/client.service.js';

export async function broadcastUserStatus(userId, status) {
  const message = {
    type: 'userStatus',
    userID: userId,
    status: status
  };
  
  await broadcastToAll(message);
}

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

export async function sendUnreadMessages(connection, unreadMessages) {
  if (connection && connection.readyState === WebSocket.OPEN) {
    const messagePayload = {
      type: 'unreadMessages',
      messages: unreadMessages.map(msg => ({
        from: msg.senderId,
        content: msg.content,
        createdAt: msg.createdAt,
        isRead: 0,
        delivered: 1,
        id: msg.id
      }))
    };
    
    try {
      connection.send(JSON.stringify(messagePayload));
      await Promise.all(unreadMessages.map(msg =>
        updateMessageStatus(msg.senderId, msg.receiverId, msg)
      ));
    } catch (err) {
      console.error('Error sending unread messages:', err);
    }
  }
}

export async function markMessagesAsRead(userId) {
  const db = await initDB();
  await db.run(
    'UPDATE messages SET isRead = 1 WHERE receiverId = ? AND isRead = 0',
    [userId]
  );
}

export async function addMessageToDb(senderId, receiverId, content) {
  const db = await initDB();
  const result = await db.run(
    'INSERT INTO messages (senderId, receiverId, content, isRead, delivered) VALUES (?, ?, ?, ?, ?)',
    [senderId, receiverId, content, 0, 0]
  );
  return result;
}

export async function updateMessageStatus(senderId, receiverId, messageData) {
  const db = await initDB();
  const msgId = messageData.id;
  console.log(`Updating message status - ID: ${msgId}, Sender: ${senderId}, Receiver: ${receiverId}`);
  
  const result = await db.run(
    'UPDATE messages SET delivered = 1 WHERE id = ? AND senderId = ? AND receiverId = ?',
    [msgId, senderId, receiverId]
  );
  
  console.log('Update result:', result);
}

export async function sendMessage(senderId, receiverId, content, message) {
  try {
    await sendToUser(receiverId, {
      type: 'message',
      from: senderId,
      content: content,
      createdAt: message.createdAt,
      isRead: message.isRead,
      delivered: 1,
      id: message.id
    });
    
    await sendToUser(senderId, {
      type: 'message',
      to: receiverId,
      content: content,
      createdAt: message.createdAt,
      isRead: message.isRead,
      delivered: 1,
      id: message.id
    });
    
    await updateMessageStatus(senderId, receiverId, message);
  } catch (err) {
    console.error('Error sending message:', err);
  }
}