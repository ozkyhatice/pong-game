import { initDB } from "../../../config/db.js";
import WebSocket from "ws";
import { clients, broadcastToAll } from "../../../websocket/services/client.service.js";
import { sanitizeTournamentMessage, prepareSqlParams } from "./security.utils.js";

export async function getActiveTournament() {
    const db = await initDB();
    const sql = `
        SELECT * FROM tournaments WHERE status IN ('pending', 'active') ORDER BY startAt DESC LIMIT 1
        `;
    const tournament = await db.get(sql);
    return tournament;
}

export async function getTournamentById(tournamentId) {
    const db = await initDB();
    const sql = `
        SELECT * FROM tournaments WHERE id = ?
    `;
    // Prepare parameters to prevent SQL injection
    const params = prepareSqlParams([tournamentId]);
    const tournament = await db.get(sql, params);
    return tournament;
}

export async function getActiveTournamentId() {
    const tournament = await getActiveTournament();
    if (tournament) {
        return tournament.id;
    }
    return null;
}

export async function isExistActiveTournament() {
    const tournament = await getActiveTournament();
    if (tournament) {
        return true;
    }
    return false;
}
export async function getTournamentPlayers(tournamentId) {
    const db = await initDB();
    const sql = `
        SELECT id, username FROM users WHERE currentTournamentId = ?
    `;
    try {
        // Prepare parameters to prevent SQL injection
        const params = prepareSqlParams([tournamentId]);
        const players = await db.all(sql, params);
        return players;
    } catch (error) {
        console.error('Error fetching tournament players:', error);
        throw error;
    }
}
export async function isUserInTournament(userId, tournamentId) {
    const db = await initDB();
    const sql = `
        SELECT * from users WHERE id = ? AND currentTournamentId = ?
    `;
    // Prepare parameters to prevent SQL injection
    const params = prepareSqlParams([userId, tournamentId]);
    const user = await db.get(sql, params);
    if (user) {
        return true;
    }
    return false;
}

export async function getStatusOfTournament(tournamentId) {
    const db = await initDB();
    const sql = `
        SELECT status FROM tournaments WHERE id = ?
    `;
    // Prepare parameters to prevent SQL injection
    const params = prepareSqlParams([tournamentId]);
    const tournament = await db.get(sql, params);
    return tournament ? tournament.status : null;
}

export async function countTournamentPlayers(tournamentId) {
    const db = await initDB();
    const sql = `
        SELECT COUNT(*) as playerCount FROM users WHERE currentTournamentId = ?
    `;
    // Prepare parameters to prevent SQL injection
    const params = prepareSqlParams([tournamentId]);
    const result = await db.get(sql, params);
    return result ? result.playerCount : 0;
}
export async function broadcastToAllPlayersInTournament(tournamentId, message) {
    const players = await getTournamentPlayers(tournamentId);
    
    // Sanitize message before broadcasting
    const sanitizedMessage = sanitizeTournamentMessage(message);
    const messageStr = JSON.stringify(sanitizedMessage);
    
    players.forEach(player => {
        const connection = clients.get(player.id);
        if (connection && connection.readyState === WebSocket.OPEN) {
            connection.send(messageStr);
        }
    });
    console.log(`Broadcasted message to all players in tournament ${tournamentId}`);
}

// Alias for consistency
export const broadcastToTournamentPlayers = broadcastToAllPlayersInTournament;

// Turnuva katılımcılarını getirme
export const getTournamentParticipants = getTournamentPlayers;

// Tüm online kullanıcılara tournament güncellemesi gönderme
export async function broadcastTournamentUpdateToAll(message) {
    // Sanitize message before broadcasting
    const sanitizedMessage = sanitizeTournamentMessage(message);
    await broadcastToAll(sanitizedMessage);
    console.log(`🏆 WS BROADCAST: Tournament update sent to all online users`);
}


export async function removeUserFromTournament(userId) {
    const db = await initDB();
    try {
        await db.run('UPDATE users SET currentTournamentId = NULL WHERE id = ?', [userId]);
        console.log(`User ${userId} removed from their tournament`);
    } catch (error) {
        console.error(`Error removing user ${userId} from tournament:`, error);
        throw error;
    }
}