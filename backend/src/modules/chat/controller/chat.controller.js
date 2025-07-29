import { addClientService, broadcastUserStatusService, sendUnreadMessages, markReadMessages, getUnreadMessages, getNotDelieveredMessages} from '../services/chat.service.js';
import { isFriend } from '../../friend/service/friend.service.js';  
import { addDbMessageService, SendMessageService, isConnected } from '../services/chat.service.js';
export async function addClientController(userId, connection) {
    await addClientService(userId, connection);
    await broadcastUserStatusService(userId, 'online');
}

export async function undeliveredMessageController(userId, connection) {
    const unreadMessages = await getNotDelieveredMessages(userId);
    if (unreadMessages.length > 0) {
        await sendUnreadMessages(connection, unreadMessages);
    }
}
// export async function unreadMessageController(userId, connection) {
//     const unreadMessages = await getUnreadMessages(userId);
//     if (unreadMessages.length > 0) {
        
//     }
    
// }

export async function handleIncomingMessage(messages, userId) {
    const msgStr = messages.toString();
    const msgObj = JSON.parse(msgStr);
    //msgObj format-> { receiverId: 1, content: 'Merhaba'}
    const { receiverId, content } = msgObj;
    const type = msgObj.type || 'message';
    if (type === 'read') {
        const msgId = msgObj.msgId;
        if (!msgId) {
            throw new Error('Message ID is required to mark as read');
        }
        const unreadMessages = await getUnreadMessages(userId);
        const messageToMark = unreadMessages.find(msg => msg.id === msgId);
        if (messageToMark) {
            await markReadMessages(userId, [messageToMark]);
        } else {
            console.warn(`Message with ID ${msgId} not found for user ${userId}`);
        }
        return;
    }
    else if (type === 'message') {

        if (!receiverId || !content) {
            throw new Error('Receiver ID and content are required');
        }
        if (userId === receiverId) {
            throw new Error('You cannot send a message to yourself');
        }
        if (await isFriend(userId, receiverId).length === 0) {
            throw new Error('You can only send messages to friends');
        }
        const newMessage = await addDbMessageService(userId, receiverId, content);
        if (newMessage && await isConnected(receiverId)) {
            try{
                await SendMessageService(userId, receiverId, content, newMessage);
            }catch (err) {
                console.error('Error sending message:', err);
            }
        }
        else if ( await !isConnected(receiverId))
            console.log(`User ${receiverId} is not connected, message will be sent later`);
    }
}
// export async function broadcastMessageService(receiverId, messageData) {
//     return await broadcastMessage(receiverId, messageData);
// }