import { addClient, removeClient, broadcastUserStatus } from '../services/client.service.js';
import { undeliveredMessageController, onlineClientsController } from '../../modules/chat/controller/chat.controller.js';
import { userRoom , rooms} from '../../modules/game/controller/game.controller.js';
import { metrics } from '../../plugins/metrics.js';
import { clearAll } from '../../modules/game/utils/end.utils.js';
import { getCurrentTournamentId } from '../services/client.service.js';


// handle new websocket connection
export async function handleConnection(connection, request) {

  
  try {
    metrics.activeConnections.inc();
  } catch (err) {
  }
  
  const token = request.headers['sec-websocket-protocol'];
  
  if (!token) {
    return connection.close();
  }
  
  try {
    const user = request.server.jwt.verify(token);
    const userId = user.id;
    
    
    await addClient(userId, connection);
    
    await broadcastUserStatus(userId, 'online');
    
    await undeliveredMessageController(userId, connection);
    
    await onlineClientsController(connection);

    return userId;
  } catch (err) {
    throw err;
  }
}


// handle websocket disconnection
export async function handleDisconnect(userId) {
  if (userId) {
    
    const user = getCurrentTournamentId(userId);
    if (user && user.currentTournamentId) {
      
      await removeUserFromTournament(userId);
      
      const { broadcastToTournamentPlayers } = await import('../../modules/tournament/utils/tournament.utils.js');
      await broadcastToTournamentPlayers(user.currentTournamentId, {
        type: 'tournament',
        event: 'playerLeft',
        data: { 
          tournamentId: user.currentTournamentId,
          leftUserId: userId,
          message: 'A player has disconnected and left the tournament'
        }
      });
    }
    
    await removeClient(userId);
    await broadcastUserStatus(userId, 'offline');
  }
  clearAll(userId, 'disconnect'); 

  try {
    metrics.activeConnections.dec();
  } catch (err) {
  }
}
