
import { handleConnection, handleDisconnect } from './handlers/connection.handler.js';
import { routeMessage } from './handlers/message.router.js';
import { handleReconnection } from '../modules/game/controller/game.controller.js';

export async function websocketHandler(connection, request) {
  let userId = null;
  
  try {
    // Handle connection and authentication
    userId = await handleConnection(connection, request);
    
    // Bağlantı başarılı olduğunda direkt reconnection'ı kontrol et
    await handleReconnection(connection, userId);
    
    // Handle incoming messages
    connection.on('message', async (message) => {
      try {
        await routeMessage(message, userId, connection);
      } catch (err) {
        console.error('Error routing message:', err);
        connection.send(JSON.stringify({ 
          type: 'error', 
          message: err.message 
        }));
      }
    });

    // Handle disconnect
    connection.on('close', async () => {
      if (userId) {
        await handleDisconnect(userId);
      }
    });
    
  } catch (err) {
    console.error('WebSocket connection failed:', err);
    await handleDisconnect(userId);
    return connection.close();
  }
}