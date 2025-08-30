import { initDB } from '../../../config/db.js';
export async function saveGametoDbServices(room) {
    const db = await initDB();
    const winnerUserId = room.winnerId || null;
    const players = Array.from(room.players);
    const player1Id = players[0];
    const player2Id = players[1];
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
            await db.run(updateSql, [
                player1Score,
                player2Score,
                winnerUserId,
                endedAt,
                room.matchId
            ]);
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
            const result = await db.run(insertSql, [
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
            
            room.matchId = result.lastID;
            console.log('Regular match result saved to DB');
            console.log(`Winner: ${winnerUserId}, Started: ${startedAt}, Ended: ${endedAt}`);
        } catch (error) {
            console.error('Error saving match result:', error);
        }
    }
}

export async function getMatchHistoryByUserId(userId) {
    const db = await initDB();
    const sql = `
        SELECT * FROM matches
        WHERE player1Id = ? OR player2Id = ?
        ORDER BY endedAt DESC
        LIMIT 10
    `;
    try {
        const matches = await db.all(sql, [userId, userId]);
        return matches;
    }catch (error) {
        console.error('Error fetching match history:', error);
        throw error;
    }
}

