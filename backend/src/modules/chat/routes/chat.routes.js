import { addClientController, undeliveredMessageController, handleIncomingMessage } from '../controller/chat.controller.js';

export default async function chatRoutes(app, options) {
  app.get('/ws', { websocket: true }, websocketHandler);
}

async function websocketHandler(connection, request) {
  console.log('\nWebSocket connection request received');
  const token = request.headers['sec-websocket-protocol'];
  
  if (!token) {
    return connection.close();
  }
  
  try {
    const user = request.server.jwt.verify(token);
    const userId = user.id;
    console.log(`User ID from token: ${userId}`);
    
    await addClientController(userId, connection);
    await undeliveredMessageController(userId, connection);
    
    connection.on('message', async (message) => {
      try {
        await handleIncomingMessage(message, userId);
      } catch (err) {
        console.error('Error handling incoming message:', err);
      }
    });
    
  } catch (err) {
    console.error('WebSocket authentication failed:', err);
    return connection.close();
  }
}