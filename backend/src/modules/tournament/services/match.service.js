import { initDB } from '../../../config/db.js';
import { createRoom } from '../../game/utils/join.utils.js';
import { rooms } from '../../game/controller/game.controller.js';
import { clients } from '../../../websocket/services/client.service.js';
import { sendMessage } from '../../game/utils/join.utils.js';


export async function startTournamentMatches(tournamentId, round) {
    const db = await initDB();
    
    
    const matches = await db.all(
        `SELECT m.*, u1.username as player1Username, u2.username as player2Username 
         FROM matches m 
         JOIN users u1 ON m.player1Id = u1.id 
         JOIN users u2 ON m.player2Id = u2.id 
         WHERE m.tournamentId = ? AND m.round = ? AND m.startedAt IS NULL`,
        [tournamentId, round]
    );
    
    
    for (const match of matches) {
        await createTournamentMatch(match);
    }
}


async function createTournamentMatch(match) {
    const { id: matchId, player1Id, player2Id, tournamentId, round } = match;
    
    
    const player1Connection = clients.get(player1Id);
    const player2Connection = clients.get(player2Id);
    
    if (!player1Connection || !player2Connection) {
        
        return;
    }
    
    
    const roomId = await createRoom(player1Id, player1Connection, rooms, tournamentId, round);
    const room = rooms.get(roomId);
    
    
    const { addPlayerToRoom } = await import('../../game/utils/join.utils.js');
    await addPlayerToRoom(room, player2Id, player2Connection);
    
    
    room.matchId = matchId;
    
    
    const db = await initDB();
    await db.run(
        'UPDATE matches SET startedAt = ? WHERE id = ?',
        [new Date().toISOString(), matchId]
    );

    
    await sendMessage(player1Connection, 'tournament', 'matchStarted', {
        roomId,
        matchId,
        tournamentId,
        round,
        opponent: match.player2Username,
        players: room.players 
    });

    await sendMessage(player2Connection, 'tournament', 'matchStarted', {
        roomId,
        matchId,
        tournamentId,
        round,
        opponent: match.player1Username,
        players: room.players 
    });
}


export async function checkPendingTournamentMatches(userId) {
    const db = await initDB();
    
    
    const pendingMatches = await db.all(
        `SELECT m.*, u1.username as player1Username, u2.username as player2Username 
         FROM matches m 
         JOIN users u1 ON m.player1Id = u1.id 
         JOIN users u2 ON m.player2Id = u2.id 
         WHERE (m.player1Id = ? OR m.player2Id = ?) 
         AND m.tournamentId IS NOT NULL 
         AND m.startedAt IS NULL 
         AND m.winnerId IS NULL`,
        [userId, userId]
    );
    
    
    for (const match of pendingMatches) {
        await createTournamentMatch(match);
    }
}