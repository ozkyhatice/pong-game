import { processChatMessage } from '../../modules/chat/controller/chat.controller.js';

export async function routeMessage(message, userId, connection) {
  const msgStr = message.toString();
  const msgObj = JSON.parse(msgStr);
  const { type } = msgObj;

  switch (type) {
    case 'chat':
    case 'message':
    case 'read':
      // Chat modülüne yönlendir
      await processChatMessage(message, userId);
      break;
    
    case 'game':
      // Game modülüne yönlendir - şimdilik atla
      console.log('Game message received - will be implemented later');
      const { handleGameMessage} = await import('../../modules/game/controller/game.controller.js');
      try {
      await handleGameMessage(msgObj, userId, connection);
      } catch (err) {
        console.error('Error handling game message:', err);
      }
      break;
    
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}
