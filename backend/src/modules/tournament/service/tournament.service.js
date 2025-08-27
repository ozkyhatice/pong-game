import { initDB } from '../../../config/db.js';
export async function createTournamentService(data, userId, connection) {
    // Tournament oluşturma işlemleri
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
    console.log(`User ${userId} is creating a tournament with data:`, data);
    // Burada veritabanı işlemleri yapılabilir
}


export async function joinTournamentService(data, userId, connection) {
    console.log(`User ${userId} is joining tournament with data:`, data);
}
export async function getTournamentPlayers(tournamentId) {
    const db = await initDB();
    // const players = await db.all(
        
    // );
    // console.log('Tournament players:', players);
    // return players.map(player => player.userId);
}