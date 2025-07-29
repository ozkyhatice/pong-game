import { initDB } from '../../../config/db.js';
const clients = new Map();
export async function addClientService(userID, connection) {
    clients.set(userID, connection);
}

export async function isConnected(userID) {
    return clients.has(userID) && clients.get(userID).readyState === WebSocket.OPEN;
}
export async function broadcastUserStatusService(userId, status) {
    const message = JSON.stringify( 
        {
            type: 'userStatus',
            userID: userId,
            status: status
        }
    )
    clients.forEach((user) => {
        if (user && user.readyState === WebSocket.OPEN) {
            user.send(message);
        }
    }
    );
    
}

export async function getUnreadMessages(userId) {
    const db = await initDB();
    const unreadMessages = await db.all('SELECT * from messages WHERE receiverId = ? AND isRead = ?', [userId, 0]);
    console.log('userId:', userId, typeof userId);
    return unreadMessages;
}
export async function getNotDelieveredMessages(userId) {
    const db = await initDB();
    const notDeliveredMessages = await db.all('SELECT * from messages WHERE receiverId = ? AND delivered = ?', [userId, 0]);
    return notDeliveredMessages;
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
    try{
        
        connection.send(JSON.stringify(messagePayload));
        await Promise.all(unreadMessages.map(msg =>
            updateMessageStatus(msg.senderId, msg.receiverId, msg)
        ));
    }catch (err) {
        console.error('Error sending unread messages:', err);
    }
}
}
export async function markReadMessagesById(userId) {
  const db = await initDB();
  await db.run(
   `UPDATE messages SET isRead = 1 WHERE receiverId = ? AND isRead = 0`,
    [userId]
  );
}

export async function addDbMessageService(senderId, receiverId, content) {
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
    const sql = `UPDATE messages SET delivered = 1 WHERE id = ? AND senderId = ? AND receiverId = ?`;
    const result = await db.run(sql, [msgId, senderId, receiverId]);
    console.log(`Update result:`, result);
}

export async function sendToUser(userId, messageData) {
    const socket = clients.get(userId);
    if (socket && socket.readyState === WebSocket.OPEN) {
        const message = JSON.stringify(messageData);
        socket.send(message);
    }
    else
    {
        console.error(`WebSocket connection for user ${userId} is not open or does not exist.`);
    }
}

export async function SendMessageService(senderId, receiverId, content, message) {
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
        }catch (err) {
            console.error('Error sending message:', err);
        }
    }