import { initDB } from '../../../config/db.js';
import { sendMessage } from '../../chat/service/websocket.service.js';
import { getActiveTournamentId, broadcastToAllPlayersInTournament} from '../utils/tournament.utils.js';

export async function createTournamentService(data, userId, connection) {
    const db = await initDB();
    const tournamentName = data.name;
    const maxPlayers = data.maxPlayers || 8;
    if (maxPlayers < 2 || maxPlayers > 8) {
        throw new Error('Max players must be between 2 and 8');
    }
    if (!tournamentName) {
        throw new Error('Tournament name is required');
    }
    const sql = `
        INSERT INTO tournaments (name, startAt, endAt, maxPlayers, status) 
        VALUES (?, NULL, NULL, ?, 'pending')
    `;
    try {
        await db.run(sql, [
            tournamentName,
            data.maxPlayers
        ]);
    }catch (error) {
        console.error('Error creating tournament:', error);
        throw error;
    }
    console.log(`TournamentID "${currentTournament}" Tournament "${tournamentName}" created by user ${userId} with max players ${maxPlayers}`);
}



// Kullanıcıyı turnuvaya katma
//event: 'join'
//data: { tournamentId }
//userId: katılacak kullanıcı
//connection: kullanıcının WebSocket bağlantısı
export async function joinTournamentService(data, userId, connection) {
    const tournamentId = data.tournamentId;
    const db = await initDB();
    // user tablosunda currentTournamentId alanını güncelle
    const sql = `
        UPDATE users SET currentTournamentId = ? WHERE id = ?
    `;
    try {
        const result = await db.run(sql, [tournamentId, userId]);
        broadcastToAllPlayersInTournament(tournamentId, {
            type: 'tournament',
            event: 'playerJoined',
            data: { userId, tournamentId }
        });
        console.log(`User ${userId} joined tournament ${tournamentId}`);
        return result;
    } catch (error) {
        console.error('Error joining tournament:', error);
        throw error;
    }
    
}
