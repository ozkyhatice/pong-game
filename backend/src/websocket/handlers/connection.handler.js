import { addClient, removeClient, broadcastUserStatus } from '../services/client.service.js';
import { undeliveredMessageController, onlineClientsController } from '../../modules/chat/controller/chat.controller.js';
import { userRoom , rooms} from '../../modules/game/controller/game.controller.js';
import { metrics } from '../../plugins/metrics.js';
import { clearAll } from '../../modules/game/utils/end.utils.js';
import { getCurrentTournamentId } from '../services/client.service.js';

export async function handleConnection(connection, request) {

  // Prometheus active connections metric degerini arttir
  try {
    metrics.activeConnections.inc();
  } catch (err) {
    console.log('ERROR incrementing metrics:', err.message);
  }
  
  const token = request.headers['sec-websocket-protocol'];
  
  if (!token) {
    return connection.close();
  }
  
  try {
    const user = request.server.jwt.verify(token);
    const userId = user.id;
    
    // Add client to global map
    await addClient(userId, connection);
    
    // Broadcast user online status
    await broadcastUserStatus(userId, 'online');
    
    // Send undelivered messages
    await undeliveredMessageController(userId, connection);
    
    // Send online clients
    await onlineClientsController(connection);

    return userId;
  } catch (err) {
    throw err;
  }
}

export async function handleDisconnect(userId) {
  if (userId) {
    // Check if user is in a tournament before disconnecting
    const user = getCurrentTournamentId(userId);
    if (user && user.currentTournamentId) {
      // Remove user from tournament
      await removeUserFromTournament(userId);
      // Broadcast tournament update to other participants
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
  clearAll(userId, 'disconnect'); // Clear user-room mapping and broadcast game over if necessary

  // Update active connections metric regardless of userId
  try {
    metrics.activeConnections.dec();
  } catch (err) {
    console.log('ERROR decrementing metrics:', err.message);
  }
}
