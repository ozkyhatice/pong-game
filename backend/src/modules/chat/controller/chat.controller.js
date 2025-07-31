import {
  broadcastUserStatus,
  sendUnreadMessages,
  markMessagesAsRead,
  getUndeliveredMessages,
  addMessageToDb,
  sendMessage
} from '../service/chat.service.js';
import { 
  addClient, 
  isConnected 
} from '../../../websocket/services/client.service.js';

export async function addClientController(userId, connection) {
  await addClient(userId, connection);
  await broadcastUserStatus(userId, 'online');
}

export async function undeliveredMessageController(userId, connection) {
  const undeliveredMessages = await getUndeliveredMessages(userId);
  if (undeliveredMessages.length > 0) {
    await sendUnreadMessages(connection, undeliveredMessages);
  }
}

export async function handleIncomingMessage(message, userId) {
  const msgStr = message.toString();
  const msgObj = JSON.parse(msgStr);
  const { receiverId, content } = msgObj;
  const type = msgObj.type || 'message';

  if (type === 'read') {
    await markMessagesAsRead(userId);
  } else if (type === 'message') {
    if (!receiverId || !content) {
      throw new Error('Receiver ID and content are required');
    }
    
    if (userId === receiverId) {
      throw new Error('You cannot send a message to yourself');
    }

    if (!await isConnected(receiverId) || !await isConnected(userId)) {
      console.log(`User ${receiverId} is not connected, message will be sent later`);
      return;
    }

    const newMessage = await addMessageToDb(userId, receiverId, content);
    
    if (newMessage && await isConnected(receiverId)) {
      try {
        const messageObj = {
          id: newMessage.lastID,
          senderId: userId,
          receiverId: receiverId,
          content: content,
          isRead: 0,
          delivered: 0,
          createdAt: new Date().toISOString()
        };
        
        await sendMessage(userId, receiverId, content, messageObj);
      } catch (err) {
        console.error('Error sending message:', err);
      }
    } else if (!await isConnected(receiverId)) {
      console.log(`User ${receiverId} is not connected, message will be sent later`);
    }
  }
}