import {
  markMessagesAsRead,
  addMessageToDb,
  markSpecificMessagesAsRead
} from '../service/chat.service.js';
import { 
  sendMissedMessages,
  handleRealtimeMessage,
  getOnlineClients
} from '../service/websocket.service.js';
import {
  getChatHistory
} from '../service/api.service.js';
import { 
  isConnected 
} from '../../../websocket/services/client.service.js';
import {
  isUserBlocked
} from '../../friend/service/friend.service.js';
import { validateChatMessage, containsSqlInjection, sanitizeGeneralInput } from '../../../utils/validation.js';

// Controller for sending undelivered messages when user comes online
// Also sends unread messages when requested via REST API
export async function undeliveredMessageController(userId, connection) {
  await sendMissedMessages(connection, userId);
}

// Controller for sending the list of online users to a connected client
export async function onlineClientsController(connection) {
  const onlineClients = await getOnlineClients();
  connection.send(JSON.stringify({
    type: 'onlineClients',
    data: onlineClients
  }));
}

// WebSocket message processing controller
// params: message (string), userId (number)
export async function processChatMessage(message, userId) {
  try {
    // Parse message with security measures
    const { parseWebSocketMessage } = await import('../../../websocket/utils/security.js');
    const msgObj = parseWebSocketMessage(message);
    const { receiverId, content, senderId } = msgObj;
    const type = msgObj.type || 'message';

    if (type === 'read') {
      // if senderId is provided, mark messages from that sender as read
      if (senderId) {
        // security: sanitize senderId
        const sanitizedSenderId = parseInt(senderId);
        if (isNaN(sanitizedSenderId)) {
          throw new Error('Invalid sender ID format');
        }
        
        await markSpecificMessagesAsRead(userId, sanitizedSenderId);
      } else {
        // mark all messages as read
        await markMessagesAsRead(userId);
      }
    } else if (type === 'message') {
      if (!receiverId || !content) {
        throw new Error('Receiver ID and content are required');
      }
      
      const sanitizedReceiverId = parseInt(receiverId);
      if (isNaN(sanitizedReceiverId)) {
        throw new Error('Invalid receiver ID format');
      }
      
      const messageValidation = validateChatMessage(content);
      if (!messageValidation.isValid) {
        throw new Error(messageValidation.message);
      }

      if (containsSqlInjection(content)) {
        throw new Error('Invalid characters detected in message');
      }
      
      const sanitizedContent = messageValidation.sanitizedMessage;
      
      if (userId === sanitizedReceiverId) {
        throw new Error('You cannot send a message to yourself');
      }
      
      // Check if the sender is blocked by the receiver
      const isBlocked = await isUserBlocked(userId, sanitizedReceiverId);
      if (isBlocked) {
        throw new Error('You cannot send a message to this user as they have blocked you');
      }

      // save always to DB, if user is online it will be sent in real-time
      const newMessage = await addMessageToDb(userId, sanitizedReceiverId, sanitizedContent);
      
      if (newMessage) {
        const messageObj = {
          id: newMessage.lastID,
          senderId: userId,
          receiverId: sanitizedReceiverId,
          content: sanitizedContent,
          isRead: 0,
          delivered: 0,
          createdAt: new Date().toISOString()
        };
        
        // if both users are online, send in real-time
        if (await isConnected(sanitizedReceiverId) && await isConnected(userId)) {
          try {
            await handleRealtimeMessage(userId, sanitizedReceiverId, sanitizedContent, messageObj);
          } catch (err) {
            console.log('Error sending message:', err);
          }
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

// REST API Controller for fetching chat history between two users
export async function getChatHistoryController(request, reply) {
  try {
    const otherUserIdParam = request.params.userId;
    const currentUserId = request.user.id;
    

    const otherUserId = parseInt(otherUserIdParam);
    if (isNaN(otherUserId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    
    if (currentUserId === otherUserId) {
      return reply.status(400).send({
        success: false,
        error: 'Cannot get chat history with yourself'
      });
    }
    
    // Sorgulama parametrelerini güvenli şekilde işle
    const limit = parseInt(request.query.limit) || 50;
    const offset = parseInt(request.query.offset) || 0;
    let before = null;
    let after = null;
    
    if (request.query.before) {
      before = sanitizeGeneralInput(request.query.before);
      if (isNaN(Date.parse(before))) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid before date format'
        });
      }
    }
    
    if (request.query.after) {
      after = sanitizeGeneralInput(request.query.after);
      if (isNaN(Date.parse(after))) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid after date format'
        });
      }
    }
    
    // Check if the current user is blocked by the other user
    const isBlocked = await isUserBlocked(currentUserId, otherUserId);
    if (isBlocked) {
      return reply.status(403).send({
        success: false,
        error: 'You cannot view chat history with this user as they have blocked you'
      });
    }
    
    const result = await getChatHistory(currentUserId, otherUserId, {
      limit,
      offset,
      before,
      after
    });
    
    return reply.send({
      success: true,
      data: result
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}

// REST API Controller for marking messages as read from a specific sender
export async function markMessagesAsReadController(request, reply) {
  try {
    const senderIdParam = request.params.userId;
    const currentUserId = request.user.id;
    
    // Güvenlik: senderId'yi doğrula ve sanitize et
    const senderId = parseInt(senderIdParam);
    if (isNaN(senderId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    
    const markedCount = await markSpecificMessagesAsRead(currentUserId, senderId);
    
    return reply.send({
      success: true,
      data: {
        markedCount
      }
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}