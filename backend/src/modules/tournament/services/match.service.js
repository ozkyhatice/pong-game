import { initDB } from '../../../config/db.js';
import { createRoom } from '../../game/utils/join.utils.js';
import { rooms } from '../../game/controller/game.controller.js';
import { clients } from '../../../websocket/services/client.service.js';
import { sendMessage } from '../../game/utils/join.utils.js';

// Turnuva maçlarını başlatma fonksiyonu
export async function startTournamentMatches(tournamentId, round) {
    const db = await initDB();
    
    // Bu round'daki tüm maçları al
    const matches = await db.all(
        `SELECT m.*, u1.username as player1Username, u2.username as player2Username 
         FROM matches m 
         JOIN users u1 ON m.player1Id = u1.id 
         JOIN users u2 ON m.player2Id = u2.id 
         WHERE m.tournamentId = ? AND m.round = ? AND m.startedAt IS NULL`,
        [tournamentId, round]
    );
    
    // Her maç için oda oluştur ve oyuncuları ekle
    for (const match of matches) {
        await createTournamentMatch(match);
    }
    
    console.log(`🏆 TOURNAMENT: Started ${matches.length} matches -> Tournament: ${tournamentId}, Round: ${round}`);
}

// Tek bir turnuva maçı için oda oluşturma
async function createTournamentMatch(match) {
    const { id: matchId, player1Id, player2Id, tournamentId, round } = match;
    
    // Her iki oyuncunun da online olup olmadığını kontrol et
    const player1Connection = clients.get(player1Id);
    const player2Connection = clients.get(player2Id);
    
    if (!player1Connection || !player2Connection) {
        console.log(`⏳ TOURNAMENT MATCH: Players offline, waiting -> Match: ${matchId}, Players: ${match.player1Id}, ${match.player2Id}`);
        // Offline oyuncular için match'i pending bırak, online olunca başlayacak
        return;
    }
    
    // Oda oluştur
    const roomId = await createRoom(player1Id, player1Connection, rooms, tournamentId, round);
    const room = rooms.get(roomId);
    
    // İkinci oyuncuyu odaya ekle - addPlayerToRoom fonksiyonunu kullan
    const { addPlayerToRoom } = await import('../../game/utils/join.utils.js');
    await addPlayerToRoom(room, player2Id, player2Connection);
    
    // Match bilgilerini room'a kaydet
    room.matchId = matchId;
    
    console.log(`🏆 TOURNAMENT MATCH: Room created -> Match: ${matchId}, Room: ${roomId}, Room players order: [${room.players.join(', ')}]`);
    console.log(`🏆 TOURNAMENT MATCH: Player positions - LEFT (BLUE): ${room.players[0]}, RIGHT (RED): ${room.players[1]}`);
    
    // Maçın başladığını veritabanında güncelle
    const db = await initDB();
    await db.run(
        'UPDATE matches SET startedAt = ? WHERE id = ?',
        [new Date().toISOString(), matchId]
    );

    // Oyunculara maç başladığını bildir - ROOM'DAKİ GERÇEK SIRALAMA KULLAN
    await sendMessage(player1Connection, 'tournament', 'matchStarted', {
        roomId,
        matchId,
        tournamentId,
        round,
        opponent: match.player2Username,
        players: room.players // Room'daki gerçek sırayı kullan
    });

    await sendMessage(player2Connection, 'tournament', 'matchStarted', {
        roomId,
        matchId,
        tournamentId,
        round,
        opponent: match.player1Username,
        players: room.players // Room'daki gerçek sırayı kullan
    });    console.log(`🏆 TOURNAMENT MATCH: Match started -> Match: ${matchId}, Room: ${roomId}`);
}

// Oyuncular online olduğunda bekleyen maçları başlatma
export async function checkPendingTournamentMatches(userId) {
    const db = await initDB();
    
    // Bu oyuncunun bekleyen turnuva maçlarını kontrol et
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
    
    // Bekleyen maçları başlatmaya çalış
    for (const match of pendingMatches) {
        await createTournamentMatch(match);
    }
}