import { addClientController, undeliveredMessageController } from '../controller/chat.controller.js';
import { handleIncomingMessage } from '../controller/chat.controller.js';
// import {unreadMessageController} from '../controller/chat.controller.js';
export default async function websocketHandler(connection, request) {
    console.log('\nWebSocket connection request received');
    const token = request.headers['sec-websocket-protocol'];
    if (!token) return connection.close();
    
    try {
        const user = request.server.jwt.verify(token);
        const userId = user.id;
        console.log(`User ID from token: ${userId}`);
        
        await addClientController(userId, connection);
        await undeliveredMessageController(userId, connection);
        // await unreadMessageController(userId, connection);
        connection.on('message', async (messages) => {
            try {
                //Frontend sends 'read' messages; backend updates isRead = true
                await handleIncomingMessage(messages, userId);
            }catch (err) {
                console.error('Error handling incoming message:', err);
            }
        })
        

    }catch (err) {
        console.error('WebSocket authentication failed:', err);
        return connection.close();
    }
}