import { createTournamentService, joinTournamentService, startTournamentService, getTournamentDetailsService, leaveTournamentService, getTournamentBracketService, getUserTournamentStatus } from '../service/tournament.service.js';
import { broadcastToAll } from '../../../websocket/services/client.service.js';
import { countTournamentPlayers, getActiveTournamentId, broadcastToTournamentPlayers, broadcastTournamentUpdateToAll } from '../utils/tournament.utils.js';
import { getStatusOfTournament, isUserInTournament, getTournamentParticipants } from '../utils/tournament.utils.js';
import { sanitizeInput } from '../../../utils/security.js';
import { validateTournamentName, containsSqlInjection } from '../../../utils/validation.js';
import { sanitizeTournamentInput, validateTournamentInput, isValidUserId, sanitizeTournamentMessage } from '../utils/security.utils.js';

// Main controller to handle incoming tournament-related WebSocket messages
export async function handleTournamentMessage(msgObj, userId, connection) {
  if (!isValidUserId(userId)) {
    connection.send(JSON.stringify({
      type: 'tournament',
      event: 'error',
      data: { message: 'Invalid user ID format' }
    }));
    return;
  }
  
  const { event, data } = msgObj;
  
  // Sanitize input data to prevent XSS attacks
  const sanitizedData = sanitizeTournamentInput(data);
  
  // Validate input data to prevent SQL injection
  const validation = validateTournamentInput(sanitizedData);
  if (!validation.isValid) {
    connection.send(JSON.stringify({
      type: 'tournament',
      event: 'error',
      data: { message: validation.message }
    }));
    return;
  }
  
  const handler = eventHandlers[event];
  if (!handler) {
    throw new Error(`Unknown tournament event: ${event}`);
  }
  return await handler(sanitizedData, userId, connection);
}

const eventHandlers = {
    'create': createTournament,
    'join': joinTournament,
    'leave': leaveTournament,
    'get-details': getTournamentDetails,
    'get-bracket': getTournamentBracket
}



export async function createTournament(data, userId, connection) {
    try {
        // Validate userId
        if (!isValidUserId(userId)) {
            throw new Error('Invalid user ID format');
        }
        
        const activeTournament = await getActiveTournamentId();
        if (activeTournament) {
            throw new Error('An active tournament already exists. Cannot create a new one.');
        }
    } catch (error) {
        return;
    }
    
    // Tournament adı validation
    if (!data.name) {
        throw new Error('Tournament name is required');
    }
    
    const nameValidation = validateTournamentName(data.name);
    if (!nameValidation.isValid) {
        throw new Error(nameValidation.message);
    }

    if (containsSqlInjection(data.name)) {
        throw new Error('Invalid characters detected in tournament name');
    }
    
    const sanitizedData = {
        ...data,
        name: sanitizeInput(nameValidation.sanitizedName)
    };
    
    await createTournamentService(sanitizedData, userId);
    
    // Sanitize message before broadcasting
    const message = sanitizeTournamentMessage({
        type: 'tournament',
        event: 'created',
        data: { userId, ...sanitizedData }
    });
    
    await broadcastToAll(message);

}
export async function joinTournament(data, userId, connection) {
    // Validate userId
    if (!isValidUserId(userId)) {
        throw new Error('Invalid user ID format');
    }
    
    const tournamentId = data.tournamentId || await getActiveTournamentId();
    
    if (!tournamentId) {
        throw new Error('No active tournament to join');
    }
    
    if (await isUserInTournament(userId, tournamentId)) {
        throw new Error('User is already in the tournament');
    }
    
    if (await getStatusOfTournament(tournamentId) !== 'pending') {
        throw new Error('Cannot join a tournament that is not pending');
    }
    
    const currentPlayers = await countTournamentPlayers(tournamentId);
    if (currentPlayers >= 4) {
        throw new Error('Tournament is full');
    }
    
    await joinTournamentService({ tournamentId }, userId);
    
    
    const newPlayerCount = currentPlayers + 1;
    
    const updateMessage = sanitizeTournamentMessage({
        type: 'tournament',
        event: 'playerJoined',
        data: { 
            userId, 
            tournamentId,
            currentPlayers: newPlayerCount,
            maxPlayers: 4
        }
    });
    
    await broadcastTournamentUpdateToAll(updateMessage);
    
    if (newPlayerCount === 4) {
        await startTournamentService(tournamentId);
    }
}

export async function leaveTournament(data, userId, connection) {
    // Validate userId
    if (!isValidUserId(userId)) {
        throw new Error('Invalid user ID format');
    }
    
    const tournamentId = data.tournamentId || await getActiveTournamentId();
    
    if (!tournamentId) {
        throw new Error('No active tournament to leave');
    }
    
    if (!(await isUserInTournament(userId, tournamentId))) {
        return;
    }
    
    if (await getStatusOfTournament(tournamentId) !== 'pending') {
        throw new Error('Cannot leave a tournament that has already started');
    }
    
    await leaveTournamentService(tournamentId, userId);
    
    // Get current player count after leaving
    const currentPlayers = await countTournamentPlayers(tournamentId);
    
    // send update to all clients
    const updateMessage = sanitizeTournamentMessage({
        type: 'tournament',
        event: 'playerLeft',
        data: { 
            userId, 
            tournamentId,
            currentPlayers
        }
    });
    
    await broadcastTournamentUpdateToAll(updateMessage);
}

// get tournament details - for lobby display
export async function getTournamentDetails(data, userId, connection) {
    try {
        // Validate userId
        if (!isValidUserId(userId)) {
            throw new Error('Invalid user ID format');
        }
        
        const tournamentId = data.tournamentId || await getActiveTournamentId();        
        if (!tournamentId) {
            const response = sanitizeTournamentMessage({
                type: 'tournament',
                event: 'details',
                data: { tournament: null }
            });
            connection.send(JSON.stringify(response));
            return;
        }
        
        const tournamentDetails = await getTournamentDetailsService(tournamentId);
        
        const { isParticipant, userStatus } = await getUserTournamentStatus(tournamentId, userId);
        
        const response = sanitizeTournamentMessage({
            type: 'tournament',
            event: 'details',
            data: { 
                tournament: tournamentDetails,
                userStatus, // 'spectator', 'active', 'eliminated'
                isParticipant
            }
        });
        connection.send(JSON.stringify(response));
        
    } catch (error) {
        const errorResponse = {
            type: 'tournament',
            event: 'details',
            data: { tournament: null, error: error.message }
        };
        connection.send(JSON.stringify(errorResponse));
    }
}


export async function getTournamentBracket(data, userId, connection) {
    try {
        // Validate userId
        if (!isValidUserId(userId)) {
            throw new Error('Invalid user ID format');
        }
        
        const tournamentId = data.tournamentId || await getActiveTournamentId();
        
        if (!tournamentId) {
            const response = sanitizeTournamentMessage({
                type: 'tournament',
                event: 'bracket',
                data: { bracket: null }
            });
            connection.send(JSON.stringify(response));
            return;
        }
        
        const bracket = await getTournamentBracketService(tournamentId);
        
        const response = sanitizeTournamentMessage({
            type: 'tournament',
            event: 'bracket',
            data: { bracket }
        });
        
        connection.send(JSON.stringify(response));
        
    } catch (error) {
        const errorResponse = {
            type: 'tournament',
            event: 'bracket',
            data: { bracket: null, error: error.message }
        };
        connection.send(JSON.stringify(errorResponse));
    }
}