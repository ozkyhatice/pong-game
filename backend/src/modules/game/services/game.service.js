import { initDB } from '../../../config/db.js';
import { prepareSqlParams, isValidUserId } from '../utils/security.utils.js';

export async function saveGametoDbServices(room) {
    const db = await initDB();
    
    // Validate all user IDs to prevent SQL injection
    const winnerUserId = room.winnerId || null;
    if (winnerUserId && !isValidUserId(winnerUserId)) {
        console.error(`🛡️ SECURITY: Invalid winner ID format -> ${winnerUserId}`);
        return;
    }
    
    const players = Array.from(room.players);
    const player1Id = players[0];
    const player2Id = players[1];
    
    if (!isValidUserId(player1Id) || !isValidUserId(player2Id)) {
        console.error(`🛡️ SECURITY: Invalid player ID format -> Player1: ${player1Id}, Player2: ${player2Id}`);
        return;
    }
    
    const player1Score = room.state.score[player1Id] ?? 0;
    const player2Score = room.state.score[player2Id] ?? 0;
    const startedAt = new Date(room.createdAt).toISOString();
    const endedAt = room.endDate ? new Date(room.endDate).toISOString() : new Date().toISOString();
    
    // Turnuva maçıysa mevcut match'i güncelle, değilse yeni match oluştur
    if (room.tournamentId && room.matchId) {
        // Mevcut turnuva maçını güncelle
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
            console.log(`🏆 Tournament match ${room.matchId} updated with winner: ${winnerUserId}`);
        } catch (error) {
            console.error('Error updating tournament match:', error);
        }
    } else {
        // Normal maç için yeni kayıt oluştur
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
            console.log('Regular match result saved to DB');
            console.log(`Winner: ${winnerUserId}, Started: ${startedAt}, Ended: ${endedAt}`);
        } catch (error) {
            console.error('Error saving match result:', error);
        }
    }
}

export async function getMatchHistoryByUserId(userId) {
    // Validate userId to prevent SQL injection
    if (!isValidUserId(userId)) {
        console.error(`🛡️ SECURITY: Invalid user ID format for match history -> ${userId}`);
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
        console.error('Error fetching match history:', error);
        throw error;
    }
}

