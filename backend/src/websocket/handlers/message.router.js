import { processChatMessage } from '../../modules/chat/controller/chat.controller.js';

export async function routeMessage(message, userId) {
  const msgStr = message.toString();
  const msgObj = JSON.parse(msgStr);
  const { type } = msgObj;

  if ( type === 'message' || type === 'read' ) 
  {
    await processChatMessage(message, userId);
  }
  else if (type === 'game') 
  {
    console.log('process game message:', msgObj);
    // await processGameMessage(message, userId);
  }
  else 
  {
    throw new Error(`Unknown message type: ${type}`);
  }
}
