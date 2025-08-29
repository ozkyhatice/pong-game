import { initDB } from "../../../config/db.js";
import WebSocket from "ws";
import { clients } from "../../../websocket/services/client.service.js";

export async function getActiveTournament() {
    const db = await initDB();
    const sql = `
        SELECT * FROM tournaments WHERE status = 'pending' ORDER BY startAt DESC LIMIT 1
        `;
    const tournament = await db.get(sql);
    return tournament;
}

export async function getTournamentById(tournamentId) {
    const db = await initDB();
    const sql = `
        SELECT * FROM tournaments WHERE id = ?
    `;
    const tournament = await db.get(sql, [tournamentId]);
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
        const players = await db.all(sql, [tournamentId]);
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
    const user = await db.get(sql, [userId, tournamentId]);
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
    const tournament = await db.get(sql, [tournamentId]);
    return tournament ? tournament.status : null;
}

export async function countTournamentPlayers(tournamentId) {
    const db = await initDB();
    const sql = `
        SELECT COUNT(*) as playerCount FROM users WHERE currentTournamentId = ?
    `;
    const result = await db.get(sql, [tournamentId]);
    return result ? result.playerCount : 0;
}
export async function broadcastToAllPlayersInTournament(tournamentId, message) {
    const players = await getTournamentPlayers(tournamentId);
    const messageStr = JSON.stringify(message);
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
