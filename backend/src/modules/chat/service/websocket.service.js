import { WebSocket } from 'ws';
import { 
  sendToUser,
  getOnlineClientIds
} from '../../../websocket/services/client.service.js';
import {
  getUnreadMessages,
  getUndeliveredMessages,
  updateMessageStatus
} from './chat.service.js';
import { getUserById } from '../../user/service/user.service.js';
import { isUserBlocked } from '../../friend/service/friend.service.js';

// WebSocket Specific Operations
export async function sendMissedMessages(connection, userId) {
  if (connection && connection.readyState === WebSocket.OPEN) {
    // Hem undelivered hem unread mesajları al
    const undeliveredMessages = await getUndeliveredMessages(userId);
    const unreadMessages = await getUnreadMessages(userId);

    // Engellenen kullanıcıların mesajlarını filtrele (Promise.all kullanmadan, sıralı olarak)
    const allowedUndelivered = [];
    for (const msg of undeliveredMessages) {
      const blockedByRecipient = await isUserBlocked(msg.senderId, userId); // alıcı göndereni engelledi mi?
      const blockedRecipient = await isUserBlocked(userId, msg.senderId);  // gönderen alıcıyı engelledi mi?
      if (!blockedByRecipient && !blockedRecipient) {
        allowedUndelivered.push(msg);
      }
    }

    const allowedUnread = [];
    for (const msg of unreadMessages) {
      const blockedByRecipient = await isUserBlocked(msg.senderId, userId);
      const blockedRecipient = await isUserBlocked(userId, msg.senderId);
      if (!blockedByRecipient && !blockedRecipient) {
        allowedUnread.push(msg);
      }
    }
    
    const messagePayload = {
      type: 'missedMessages',
      data: {
        undelivered: allowedUndelivered.map(msg => ({
          from: msg.senderId,
          content: msg.content,
          createdAt: msg.createdAt,
          isRead: 0,
          delivered: 0,
          id: msg.id
        })),
        unread: allowedUnread.map(msg => ({
          from: msg.senderId,
          content: msg.content,
          createdAt: msg.createdAt,
          isRead: 0,
          delivered: 1,
          id: msg.id
        })),
        totalUnreadCount: allowedUndelivered.length + allowedUnread.length
      }
    };
    
    try {
      connection.send(JSON.stringify(messagePayload));
      
      // Undelivered mesajları delivered olarak işaretle
      for (const msg of allowedUndelivered) {
        await updateMessageStatus(msg.senderId, msg.receiverId, msg);
      }
    } catch (err) {
      console.error('Error sending missed messages:', err);
    }
  }
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

export async function handleRealtimeMessage(senderId, receiverId, content, messageObj) {
  // Real-time mesaj işleme logics
  try {
    // alıcının göndereni engellediğini kontrol et
    const isBlocked = await isUserBlocked(senderId, receiverId);
    if (isBlocked) {
      return { success: false, error: 'Message cannot be delivered because you are blocked by this user' };
    }
    
    // gönderenin alıcıyı engellediğini kontrol et  
    const isReceiverBlocked = await isUserBlocked(receiverId, senderId);
    if (isReceiverBlocked) {
      return { success: false, error: 'Message cannot be delivered because you blocked this user' };
    }
    
    await sendMessage(senderId, receiverId, content, messageObj);
    return { success: true };
  } catch (error) {
    console.error('Error handling realtime message:', error);
    return { success: false, error: error.message };
  }
}


export async function getOnlineClients(requesterId = null) {
  try {
    const onlineClientIds = await getOnlineClientIds();
    const onlineClients = [];
    
    for (const userId of onlineClientIds) {
      // If requesterId is provided, hide users who are blocked by the requester
      // or who have blocked the requester
      if (requesterId) {
        const blockedByRequester = await isUserBlocked(userId, requesterId); // is userId blocked by requester?
        const blockedRequester = await isUserBlocked(requesterId, userId); // is requester blocked by userId?
        if (blockedByRequester || blockedRequester) {
          continue; // skip showing this user in the online list
        }
      }

      const userDetails = await getUserById(userId);
      if (userDetails) {
        onlineClients.push({
          id: userDetails.id,
          username: userDetails.username,
          email: userDetails.email,
          avatar: userDetails.avatar,
          wins: userDetails.wins,
          losses: userDetails.losses,
          isOnline: true
        });
      }
    }
    
    return onlineClients;
  } catch (error) {
    console.error('Error getting online clients:', error);
    return [];
  }
}