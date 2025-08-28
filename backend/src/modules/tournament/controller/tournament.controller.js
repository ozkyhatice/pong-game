import { sendMessage } from '../../chat/service/websocket.service.js';
import { createTournamentService, joinTournamentService, getTournamentPlayers } from '../service/tournament.service.js';
import { broadcastToAll, sendToUser } from '../../../websocket/services/client.service.js';
import { getActiveTournamentId, isExistActiveTournament } from '../utils/tournament.utils.js';

export async function handleTournamentMessage(msgObj, userId, connection) {
  const { event, data} = msgObj;
  const handler = eventHandlers[event];
  if (!handler) {
    throw new Error(`Unknown tournament event: ${event}`);
  }
  return await handler(data, userId, connection);
}

const eventHandlers = {
    'create': createTournament,
    'join': joinTournament,
}



export async function createTournament(data, userId, connection) {
    try {
        const activeTournament = await getActiveTournamentId();
        if (activeTournament) {
            throw new Error('An active tournament already exists. Cannot create a new one.');
        }
    } catch (error) {
        console.error('Error checking active tournament:', error);
        return;
    }
    await createTournamentService(data, userId);
    const message = {
        type: 'tournament',
        event: 'created',
        data: { userId, ...data }
    };
    await broadcastToAll(message);

}
export async function joinTournament(data, userId, connection) {
    await joinTournamentService(data, userId);
    
    // Sadece o turnuvadaki oyunculara broadcast yap
    
}