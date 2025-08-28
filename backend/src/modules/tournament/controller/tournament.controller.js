import { createTournamentService, joinTournamentService} from '../service/tournament.service.js';
import { broadcastToAll } from '../../../websocket/services/client.service.js';
import { countTournamentPlayers, getActiveTournamentId, } from '../utils/tournament.utils.js';
import { getStatusOfTournament, isUserInTournament} from '../utils/tournament.utils.js';

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
    const countOfPlayers = await countTournamentPlayers(data.tournamentId);
    const tournamentId = data.tournamentId;
    if (countOfPlayers.length > data.maxPlayers) {
        throw new Error('Tournament is full. Cannot join.');
    }
    if (!tournamentId) {
        throw new Error('Tournament ID is required to join a tournament');
    }
    if (await getActiveTournamentId(tournamentId) !== tournamentId) {
        throw new Error('Tournament does not active');
    }
    if (await isUserInTournament(userId, tournamentId)) {
        throw new Error('User is already in the tournament');
    }
    if (await getStatusOfTournament(tournamentId) !== 'pending') {
        throw new Error('Cannot join a tournament that is not pending');
    }
    await joinTournamentService(data, userId);
    
    
    // Sadece o turnuvadaki oyunculara broadcast yap
    
}