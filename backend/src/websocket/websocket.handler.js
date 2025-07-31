import { addClient, removeClient } from './services/client.service.js';

export async function websocketHandler(connection, request) {
  console.log('\nWebSocket connection request received');
  const token = request.headers['sec-websocket-protocol'];
  
  if (!token) {
    return connection.close();
  }
  
  try {
    const user = request.server.jwt.verify(token);
    const userId = user.id;
    console.log(`User ID from token: ${userId}`);
    
    // Add client to global map
    await addClient(userId, connection);
    
    // Handle initial connection (undelivered messages etc.)
    await handleClientConnect(userId, connection);
    
    // Handle incoming messages with switch-case
    connection.on('message', async (message) => {
      try {
        await handleIncomingMessage(message, userId);
      } catch (err) {
        console.error('Error handling incoming message:', err);
        connection.send(JSON.stringify({ 
          type: 'error', 
          message: err.message 
        }));
      }
    });

    // Handle disconnect
    connection.on('close', async () => {
      await removeClient(userId);
      console.log(`Client ${userId} disconnected`);
    });
    
  } catch (err) {
    console.error('WebSocket authentication failed:', err);
    return connection.close();
  }
}

async function handleClientConnect(userId, connection) {
  // Chat modülündeki initial connection işlemleri
  const { addClientController, undeliveredMessageController } = await import('../modules/chat/controller/chat.controller.js');
  await addClientController(userId, connection);
  await undeliveredMessageController(userId, connection);
}

async function handleIncomingMessage(message, userId) {
  const msgStr = message.toString();
  const msgObj = JSON.parse(msgStr);
  const { type } = msgObj;

  switch (type) {
    case 'chat':
    case 'message':
    case 'read':
      // Chat controller'ın handleIncomingMessage'ını kullan
      const { handleIncomingMessage: chatHandler } = await import('../modules/chat/controller/chat.controller.js');
      await chatHandler(message, userId);
      break;
    
    case 'game':
      // Game modülüne yönlendir - şimdilik atla
      console.log('Game message received - will be implemented later');
      // const { handleGameMessage } = await import('./handlers/game.handler.js');
      // await handleGameMessage(msgObj, userId);
      break;
    
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}