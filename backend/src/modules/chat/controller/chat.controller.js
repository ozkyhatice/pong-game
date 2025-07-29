import { addClientService, broadcastUserStatusService, sendUnreadMessages, markReadMessages, getUnreadMessages} from '../services/chat.service.js';
import { isFriend } from '../../friend/service/friend.service.js';  
import { addDbMessageService, SendMessageService } from '../services/chat.service.js';
export async function addClientController(userId, connection) {
    addClientService(userId, connection);
    broadcastUserStatusService(userId, 'online');
}

export async function unreadMessageController(userId, connection) {
    const unreadMessages = await getUnreadMessages(userId);
    if (unreadMessages.length > 0) {
        sendUnreadMessages(connection, unreadMessages);
        // markReadMessages(userId, unreadMessages);
    }
}

export async function handleIncomingMessage(messages, userId) {
    const msgStr = messages.toString();
    const msgObj = JSON.parse(msgStr);
    //msgObj format-> { receiverId: 1, content: 'Merhaba'}
    const { receiverId, content } = msgObj;
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
    if (newMessage) {
        try{
            await SendMessageService(userId, receiverId, content, newMessage);
        }catch (err) {
            console.error('Error sending message:', err);
        }
    }
    else {
        throw new Error('Failed to send message');
    }
}
// export async function broadcastMessageService(receiverId, messageData) {
//     return await broadcastMessage(receiverId, messageData);
// }