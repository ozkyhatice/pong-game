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
import { sanitizeInput } from '../../../utils/security.js';
import { validateChatMessage, containsSqlInjection, sanitizeGeneralInput } from '../../../utils/validation.js';

/**
 * Controller for sending undelivered messages to a user when they connect
 * @param {number} userId - The ID of the user
 * @param {object} connection - WebSocket connection object
 */
export async function undeliveredMessageController(userId, connection) {
  // Tek seferde hem undelivered hem unread mesajları gönder
  await sendMissedMessages(connection, userId);
}

/**
 * Controller for sending online clients list
 * @param {object} connection - WebSocket connection object
 */
export async function onlineClientsController(connection) {
  // Online tum kullanıcıları gönder
  const onlineClients = await getOnlineClients();
  connection.send(JSON.stringify({
    type: 'onlineClients',
    data: onlineClients
  }));
}

/**
 * Process incoming chat messages from WebSocket
 * Includes validation, sanitization and SQL injection protection
 * @param {string|Buffer} message - Raw message from WebSocket
 * @param {number} userId - The ID of the sender
 */
export async function processChatMessage(message, userId) {
  const msgStr = message.toString();
  const msgObj = JSON.parse(msgStr);
  const { receiverId, content, senderId } = msgObj;
  const type = msgObj.type || 'message';

  if (type === 'read') {
    // Eğer senderId belirtilmişse sadece o kullanıcıdan gelen mesajları okundu yap
    if (senderId) {
      // Güvenlik: senderId'yi doğrula ve sanitize et
      const sanitizedSenderId = parseInt(senderId);
      if (isNaN(sanitizedSenderId)) {
        throw new Error('Invalid sender ID format');
      }
      
      await markSpecificMessagesAsRead(userId, sanitizedSenderId);
    } else {
      // Yoksa tüm mesajları okundu yap (eski davranış)
      await markMessagesAsRead(userId);
    }
  } else if (type === 'message') {
    if (!receiverId || !content) {
      throw new Error('Receiver ID and content are required');
    }
    
    // Güvenlik: receiverId'yi doğrula ve sanitize et
    const sanitizedReceiverId = parseInt(receiverId);
    if (isNaN(sanitizedReceiverId)) {
      throw new Error('Invalid receiver ID format');
    }
    
    // Chat mesajı validation
    const messageValidation = validateChatMessage(content);
    if (!messageValidation.isValid) {
      throw new Error(messageValidation.message);
    }

    // SQL injection kontrolü
    if (containsSqlInjection(content)) {
      throw new Error('Invalid characters detected in message');
    }
    
    // Validation sonucunda sanitize edilmiş mesajı kullan
    const sanitizedContent = messageValidation.sanitizedMessage;
    
    if (userId === sanitizedReceiverId) {
      throw new Error('You cannot send a message to yourself');
    }
    
    // Check if the sender is blocked by the receiver
    const isBlocked = await isUserBlocked(userId, sanitizedReceiverId);
    if (isBlocked) {
      throw new Error('You cannot send a message to this user as they have blocked you');
    }

    // Mesajı her zaman DB'ye kaydet (online/offline fark etmez)
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
      
      // Sadece her iki user da online ise mesajı gönder
      if (await isConnected(sanitizedReceiverId) && await isConnected(userId)) {
        try {
          await handleRealtimeMessage(userId, sanitizedReceiverId, sanitizedContent, messageObj);
        } catch (err) {
          console.error('Error sending message:', err);
        }
      } else {
        console.log(`User ${sanitizedReceiverId} is offline, message saved to DB and will be delivered when online`);
      }
    }
  }
}

/**
 * REST API Controller for getting chat history between two users
 * Includes security checks and input validation
 */
export async function getChatHistoryController(request, reply) {
  try {
    const otherUserIdParam = request.params.userId;
    const currentUserId = request.user.id;
    
    // Güvenlik: otherUserId'yi doğrula ve sanitize et
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
    
    // Tarih parametrelerini güvenli şekilde işle
    if (request.query.before) {
      before = sanitizeGeneralInput(request.query.before);
      // Geçerli bir tarih mi kontrol et
      if (isNaN(Date.parse(before))) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid before date format'
        });
      }
    }
    
    if (request.query.after) {
      after = sanitizeGeneralInput(request.query.after);
      // Geçerli bir tarih mı kontrol et
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
    console.error('Error getting chat history:', error);
    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * REST API Controller for marking messages as read
 * Includes input validation and sanitization
 */
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
    console.error('Error marking messages as read:', error);
    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}