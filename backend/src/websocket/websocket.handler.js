
import { handleConnection, handleDisconnect } from './handlers/connection.handler.js';
import { routeMessage } from './handlers/message.router.js';
import { handleReconnection } from '../modules/game/controller/game.controller.js';

export async function websocketHandler(connection, request) {
  let userId = null;
  
  try {
    // Handle connection and authentication
    userId = await handleConnection(connection, request);
    
    await handleReconnection(connection, userId);
    
    const { checkPendingTournamentMatches } = await import('../modules/tournament/services/match.service.js');
    await checkPendingTournamentMatches(userId);
    
    // Handle incoming messages with security protections
    connection.on('message', async (message) => {
      try {
        // Message is validated and sanitized in routeMessage function
        await routeMessage(message, userId, connection);
      } catch (err) {
        
        // Don't expose detailed error messages to client for security reasons
        const clientErrorMessage = err.message.includes('SQL injection') || 
                                  err.message.includes('XSS') ? 
                                  'Security violation detected' : 
                                  'Error processing message';
        
        connection.send(JSON.stringify({ 
          type: 'error', 
          message: clientErrorMessage
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
    await handleDisconnect(userId);
    return connection.close();
  }
}