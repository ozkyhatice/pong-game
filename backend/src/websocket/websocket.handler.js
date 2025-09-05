
import { handleConnection, handleDisconnect } from './handlers/connection.handler.js';
import { routeMessage } from './handlers/message.router.js';
import { handleReconnection } from '../modules/game/controller/game.controller.js';

export async function websocketHandler(connection, request) {
  let userId = null;
  
  try {
    
    userId = await handleConnection(connection, request);
    
    await handleReconnection(connection, userId);
    
    const { checkPendingTournamentMatches } = await import('../modules/tournament/services/match.service.js');
    await checkPendingTournamentMatches(userId);
    
    
    connection.on('message', async (message) => {
      try {
        
        await routeMessage(message, userId, connection);
      } catch (err) {
        
        
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