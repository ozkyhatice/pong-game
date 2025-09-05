import { initDB } from '../../../config/db.js';
import { prepareSqlParams, isValidUserId } from '../utils/security.utils.js';

export async function saveGametoDbServices(room) {
    const db = await initDB();
    
    // Validate all user IDs to prevent SQL injection
    const winnerUserId = room.winnerId || null;
    if (winnerUserId && !isValidUserId(winnerUserId)) {
        return;
    }
    
    const players = room.players; // Already an array
    const player1Id = players[0];
    const player2Id = players[1];
    
    if (!isValidUserId(player1Id) || !isValidUserId(player2Id)) {
        return;
    }
    
    const player1Score = room.state.score[player1Id] ?? 0;
    const player2Score = room.state.score[player2Id] ?? 0;
    const startedAt = new Date(room.createdAt).toISOString();
    const endedAt = room.endDate ? new Date(room.endDate).toISOString() : new Date().toISOString();
    
    // if tournament match, update existing record instead of inserting new one
    if (room.tournamentId && room.matchId) {
        // update existing match record
        const updateSql = `
            UPDATE matches 
            SET player1Score = ?, player2Score = ?, winnerId = ?, endedAt = ?
            WHERE id = ?
        `;
        
        try {
            // Prepare parameters to prevent SQL injection
            const params = prepareSqlParams([
                player1Score,
                player2Score,
                winnerUserId,
                endedAt,
                room.matchId
            ]);
            
            await db.run(updateSql, params);
        } catch (error) {
            console.log('Error updating tournament match:', error);
        }
    } else {
        // create new match record
        const insertSql = `
            INSERT INTO matches (
            player1Id, player2Id, player1Score, player2Score, winnerId, tournamentId, round, startedAt, endedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            // Prepare parameters to prevent SQL injection
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
            console.log('Error saving match result:', error);
        }
    }
}

export async function getMatchHistoryByUserId(userId) {
    // Validate userId to prevent SQL injection
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
        // Prepare parameters to prevent SQL injection
        const params = prepareSqlParams([userId, userId]);
        const matches = await db.all(sql, params);
        return matches;
    } catch (error) {
        throw error;
    }
}

