import { initDB } from '../../../config/db.js';
import { prepareSqlParams, isValidUserId } from '../utils/security.utils.js';


// save game result to database
export async function saveGametoDbServices(room) {
    const db = await initDB();
    
    
    const winnerUserId = room.winnerId || null;
    if (winnerUserId && !isValidUserId(winnerUserId)) {
        return;
    }
    
    const players = room.players; 
    const player1Id = players[0];
    const player2Id = players[1];
    
    if (!isValidUserId(player1Id) || !isValidUserId(player2Id)) {
        return;
    }
    
    const player1Score = room.state.score[player1Id] ?? 0;
    const player2Score = room.state.score[player2Id] ?? 0;
    const startedAt = new Date(room.createdAt).toISOString();
    const endedAt = room.endDate ? new Date(room.endDate).toISOString() : new Date().toISOString();
    
    
    if (room.tournamentId && room.matchId) {
        
        const updateSql = `
            UPDATE matches 
            SET player1Score = ?, player2Score = ?, winnerId = ?, endedAt = ?
            WHERE id = ?
        `;
        
        try {
            
            const params = prepareSqlParams([
                player1Score,
                player2Score,
                winnerUserId,
                endedAt,
                room.matchId
            ]);
            
            await db.run(updateSql, params);
        } catch (error) {
        }
    } else {
        
        const insertSql = `
            INSERT INTO matches (
            player1Id, player2Id, player1Score, player2Score, winnerId, tournamentId, round, startedAt, endedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            
            const params = prepareSqlParams([
                player1Id,
                player2Id,
                player1Score,
                player2Score,
                winnerUserId,
                room.tournamentId || null,
                room.round || null,
                startedAt,
                endedAt
            ]);
            
            const result = await db.run(insertSql, params);
            
            room.matchId = result.lastID;
        } catch (error) {
        }
    }
}


// get match history for user
export async function getMatchHistoryByUserId(userId) {
    
    if (!isValidUserId(userId)) {
        throw new Error('Invalid user ID format');
    }
    
    const db = await initDB();
    const sql = `
        SELECT * FROM matches
        WHERE player1Id = ? OR player2Id = ?
        ORDER BY endedAt DESC
        LIMIT 10
    `;
    try {
        
        const params = prepareSqlParams([userId, userId]);
        const matches = await db.all(sql, params);
        return matches;
    } catch (error) {
        throw error;
    }
}

