import { initDB } from "../../../config/db.js";

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
    return tournament ? tournament.id : null;
}

export async function isExistActiveTournament() {
    const tournament = await getActiveTournament();
    if (tournament) {
        return true;
    }
    return false;
}