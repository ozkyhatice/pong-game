import { createTournamentService, joinTournamentService, startTournamentService, getTournamentDetailsService, leaveTournamentService, getTournamentBracketService, getUserTournamentStatus } from '../service/tournament.service.js';
import { broadcastToAll } from '../../../websocket/services/client.service.js';
import { countTournamentPlayers, getActiveTournamentId, broadcastToTournamentPlayers, broadcastTournamentUpdateToAll } from '../utils/tournament.utils.js';
import { getStatusOfTournament, isUserInTournament, getTournamentParticipants } from '../utils/tournament.utils.js';
import { initDB } from '../../../config/db.js';
import { sanitizeInput } from '../../../utils/security.js';

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
    'leave': leaveTournament,
    'get-details': getTournamentDetails,
    'get-bracket': getTournamentBracket
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
    
    // XSS koruması için tournament adını sanitize et
    const sanitizedData = {
        ...data,
        name: data.name ? sanitizeInput(data.name) : data.name
    };
    
    await createTournamentService(sanitizedData, userId);
    const message = {
        type: 'tournament',
        event: 'created',
        data: { userId, ...sanitizedData }
    };
    await broadcastToAll(message);

}
export async function joinTournament(data, userId, connection) {
    // Aktif turnuva ID'sini al (data.tournamentId yoksa)
    const tournamentId = data.tournamentId || await getActiveTournamentId();
    
    if (!tournamentId) {
        throw new Error('No active tournament to join');
    }
    
    // Validasyonlar
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
    
    // Kullanıcıyı turnuvaya katıl
    await joinTournamentService({ tournamentId }, userId);
    
    
    // Turnuva bilgilerini güncelle
    const newPlayerCount = currentPlayers + 1;
    
    // Tüm online kullanıcılara tournament güncellemesi gönder (sadece katılımcılara değil)
    await broadcastTournamentUpdateToAll({
        type: 'tournament',
        event: 'playerJoined',
        data: { 
            userId, 
            tournamentId,
            currentPlayers: newPlayerCount,
            maxPlayers: 4
        }
    });
    
    // Eğer 4 kişi doldu ise turnuvayı başlat
    if (newPlayerCount === 4) {
        await startTournamentService(tournamentId);
    }
}

// Turnuvadan ayrılma
export async function leaveTournament(data, userId, connection) {
    const tournamentId = data.tournamentId || await getActiveTournamentId();
    
    if (!tournamentId) {
        throw new Error('No active tournament to leave');
    }
    
    if (!(await isUserInTournament(userId, tournamentId))) {
        return; // Silently ignore instead of throwing error
    }
    
    if (await getStatusOfTournament(tournamentId) !== 'pending') {
        throw new Error('Cannot leave a tournament that has already started');
    }
    
    await leaveTournamentService(tournamentId, userId);
    
    // Tüm online kullanıcılara tournament güncellemesi gönder
    await broadcastTournamentUpdateToAll({
        type: 'tournament',
        event: 'playerLeft',
        data: { 
            userId, 
            tournamentId,
            currentPlayers: await countTournamentPlayers(tournamentId)
        }
    });
}

// Turnuva detaylarını getirme (herkes görebilir)
export async function getTournamentDetails(data, userId, connection) {
    try {
        const tournamentId = data.tournamentId || await getActiveTournamentId();        
        if (!tournamentId) {
            const response = {
                type: 'tournament',
                event: 'details',
                data: { tournament: null }
            };
            connection.send(JSON.stringify(response));
            return;
        }
        
        const tournamentDetails = await getTournamentDetailsService(tournamentId);
        
        // Kullanıcının turnuva durumunu servis fonksiyonu ile al
        const { isParticipant, userStatus } = await getUserTournamentStatus(tournamentId, userId);
        
        const response = {
            type: 'tournament',
            event: 'details',
            data: { 
                tournament: tournamentDetails,
                userStatus, // 'spectator', 'active', 'eliminated'
                isParticipant
            }
        };
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

// Turnuva bracket'ini getirme
export async function getTournamentBracket(data, userId, connection) {
    try {
        const tournamentId = data.tournamentId || await getActiveTournamentId();
        
        if (!tournamentId) {
            const response = {
                type: 'tournament',
                event: 'bracket',
                data: { bracket: null }
            };
            connection.send(JSON.stringify(response));
            return;
        }
        
        const bracket = await getTournamentBracketService(tournamentId);
        
        const response = {
            type: 'tournament',
            event: 'bracket',
            data: { bracket }
        };
        
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