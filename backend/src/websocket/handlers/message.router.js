import { processChatMessage } from '../../modules/chat/controller/chat.controller.js';
import { parseWebSocketMessage } from '../utils/security.js';

export async function routeMessage(message, userId, connection) {
  try {
    // Sanitize and parse message securely
    const msgObj = parseWebSocketMessage(message);
    const { type } = msgObj;

    switch (type) {
      case 'chat':
      case 'message':
      case 'read':
        // Chat modülüne yönlendir
        await processChatMessage(message, userId);
        break;
      
      case 'game':
        const { handleGameMessage} = await import('../../modules/game/controller/game.controller.js');
        try {
          await handleGameMessage(msgObj, userId, connection);
        } catch (err) {
          console.error('Error handling game message:', err);
        }
        break;
      case 'tournament':
        const { handleTournamentMessage } = await import('../../modules/tournament/controller/tournament.controller.js');
        try {
          await handleTournamentMessage(msgObj, userId, connection);
        } catch (err) {
          console.error('Error handling tournament message:', err);
        }
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
    connection.send(JSON.stringify({ 
      type: 'error', 
      message: error.message === 'Potential SQL injection detected' 
        ? 'Security violation detected' 
        : 'Invalid message format'
    }));
    throw error;
  }
}
