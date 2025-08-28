import { initDB } from '../../../config/db.js';
export async function saveGametoDbServices(room) {
    const db = await initDB();
    const winnerUserId = room.winnerId || null; // doğru yerden al
    const players = Array.from(room.players);
    const player1Id = players[0];
    const player2Id = players[1];
    const player1Score = room.state.score[player1Id] ?? 0;
    const player2Score = room.state.score[player2Id] ?? 0;
    const startedAt = new Date(room.createdAt).toISOString();
    const endedAt = room.endDate ? new Date(room.endDate).toISOString() : new Date().toISOString();
    
    const sql = `
        INSERT INTO matches (
        player1Id, player2Id, player1Score, player2Score, winnerId, startedAt, endedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await db.run(sql, [
        player1Id,
        player2Id,
        player1Score,
        player2Score,
        winnerUserId,
        startedAt,
        endedAt
        ]);
        console.log('Match result saved to DB');
        console.log(`Winner: ${winnerUserId}, Started: ${startedAt}, Ended: ${endedAt}`);
    } catch (error) {
        console.error('Error saving match result:', error);
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

