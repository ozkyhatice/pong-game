import { initDB } from '../../../config/db.js';
import { sendMessage } from '../../chat/service/websocket.service.js';
import { getActiveTournamentId, broadcastToTournamentPlayers, getTournamentParticipants} from '../utils/tournament.utils.js';

export async function createTournamentService(data, userId, connection) {
    const db = await initDB();
    const tournamentName = data.name;
    const maxPlayers = data.maxPlayers || 4;
    if (maxPlayers < 2 || maxPlayers > 4) {
        throw new Error('Max players must be between 2 and 4');
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
    
    const newTournamentId = await getActiveTournamentId();
    console.log(`Tournament "${tournamentName}" created by user ${userId} with max players ${maxPlayers} (ID: ${newTournamentId})`);
}



// Kullanıcıyı turnuvaya katma
//event: 'join'
//data: { tournamentId }
//userId: katılacak kullanıcı
//connection: kullanıcının WebSocket bağlantısı
export async function joinTournamentService(data, userId, connection) {
    const tournamentId = data.tournamentId;
    const db = await initDB();
    // user tablosunda currentTournamentId alanını güncelle
    const sql = `
        UPDATE users SET currentTournamentId = ? WHERE id = ?
    `;
    try {
        const result = await db.run(sql, [tournamentId, userId]);
        console.log(`User ${userId} joined tournament ${tournamentId}`);
        return result;
    } catch (error) {
        console.error('Error joining tournament:', error);
        throw error;
    }
}

// Turnuvayı başlatma - 8 kişi dolduğunda otomatik çağrılır
export async function startTournamentService(tournamentId) {
    const db = await initDB();
    
    // Turnuva durumunu 'active' yap
    await db.run('UPDATE tournaments SET status = "active", startAt = ? WHERE id = ?', 
        [new Date().toISOString(), tournamentId]);
    
    // Katılımcıları al ve bracket oluştur
    const participants = await getTournamentParticipants(tournamentId);
    const bracket = generateTournamentBracket(participants);
    
    // İlk round maçlarını oluştur
    await createTournamentMatches(tournamentId, bracket[0], 1);
    
    // İlk round maçlarını başlat
    const { startTournamentMatches } = await import('../services/match.service.js');
    await startTournamentMatches(tournamentId, 1);
    
    // Tüm katılımcılara turnuva başladığını bildir
    await broadcastToTournamentPlayers(tournamentId, {
        type: 'tournament',
        event: 'tournamentStarted',
        data: { 
            tournamentId,
            bracket,
            currentRound: 1,
            message: 'Tournament başladı! İlk round maçları başlıyor...'
        }
    });
    
    console.log(`Tournament ${tournamentId} started with ${participants.length} players`);
}

// Turnuva detaylarını getirme
export async function getTournamentDetailsService(tournamentId) {
    const db = await initDB();
    
    // Turnuva bilgilerini al
    const tournament = await db.get(
        'SELECT * FROM tournaments WHERE id = ?', [tournamentId]
    );
    
    if (!tournament) {
        return null;
    }
    
    // Katılımcıları al
    const participants = await getTournamentParticipants(tournamentId);
    
    // Aktif maçları al
    const matches = await db.all(
        `SELECT m.*, u1.username as player1Username, u2.username as player2Username 
         FROM matches m 
         JOIN users u1 ON m.player1Id = u1.id 
         JOIN users u2 ON m.player2Id = u2.id 
         WHERE m.tournamentId = ? 
         ORDER BY m.round ASC, m.id ASC`,
        [tournamentId]
    );
    
    return {
        ...tournament,
        participants,
        matches,
        currentPlayers: participants.length
    };
}

// Turnuva bracket'ini getirme
export async function getTournamentBracketService(tournamentId) {
    const participants = await getTournamentParticipants(tournamentId);
    return generateTournamentBracket(participants);
}

// Turnuvadan ayrılma
export async function leaveTournamentService(tournamentId, userId) {
    const db = await initDB();
    
    // Kullanıcının currentTournamentId'sini temizle
    await db.run(
        'UPDATE users SET currentTournamentId = NULL WHERE id = ?', 
        [userId]
    );
    
    console.log(`User ${userId} left tournament ${tournamentId}`);
}

// Turnuva bracket oluşturma fonksiyonu
function generateTournamentBracket(participants) {
    if (participants.length !== 4) {
        throw new Error('Tournament must have exactly 4 participants');
    }
    
    // Katılımcıları karıştır
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    
    // 2 round'luk bracket oluştur (4->2->1)
    const bracket = [
        [], // Round 1: 2 maç (Semifinal)
        []  // Round 2: 1 maç (Final)
    ];
    
    // Round 1 eşleşmeleri (4 kişi -> 2 maç)
    for (let i = 0; i < 4; i += 2) {
        bracket[0].push({
            player1: shuffled[i],
            player2: shuffled[i + 1],
            winner: null
        });
    }
    
    // Round 2 için boş placeholder
    bracket[1].push({
        player1: null,
        player2: null,
        winner: null
    });
    
    return bracket;
}

// Turnuva maçlarını veritabanında oluşturma
async function createTournamentMatches(tournamentId, roundMatches, round) {
    const db = await initDB();
    
    for (const match of roundMatches) {
        if (match.player1 && match.player2) {
            await db.run(
                `INSERT INTO matches (player1Id, player2Id, tournamentId, round, createdAt) 
                 VALUES (?, ?, ?, ?, ?)`,
                [match.player1.id, match.player2.id, tournamentId, round, new Date().toISOString()]
            );
        }
    }
}

// Maç bittiğinde sonraki round'a geçiş
export async function processTournamentMatchResult(matchId, winnerId) {
    console.log(`🏆 Processing tournament match result: matchId=${matchId}, winnerId=${winnerId}`);
    const db = await initDB();
    
    // Maç bilgilerini al
    const match = await db.get(
        'SELECT * FROM matches WHERE id = ?', [matchId]
    );
    
    if (!match || !match.tournamentId) {
        console.log(`⚠️ Match ${matchId} is not a tournament match or not found`);
        return; // Turnuva maçı değil
    }
    
    const tournamentId = match.tournamentId;
    const round = match.round;
    
    console.log(`🏆 Tournament ${tournamentId}, Round ${round}: Match ${matchId} completed by winner ${winnerId}`);
    
    // Bu round'daki tüm maçların bitip bitmediğini kontrol et
    const unfinishedMatches = await db.all(
        'SELECT * FROM matches WHERE tournamentId = ? AND round = ? AND winnerId IS NULL',
        [tournamentId, round]
    );
    
    console.log(`🏆 Unfinished matches in round ${round}: ${unfinishedMatches.length}`);
    
    if (unfinishedMatches.length > 0) {
        // Henüz bitmemiş maçlar var, bekle
        console.log(`⏳ Waiting for ${unfinishedMatches.length} more matches to complete in round ${round}`);
        await broadcastToTournamentPlayers(tournamentId, {
            type: 'tournament',
            event: 'matchCompleted',
            data: { matchId, winnerId, round }
        });
        return;
    }
    
    // Tüm maçlar bitti, sonraki round'a geç
    console.log(`🎉 All matches in round ${round} completed! Advancing to next round...`);
    await advanceToNextRound(tournamentId, round);
}

// Sonraki round'a geçiş
async function advanceToNextRound(tournamentId, currentRound) {
    const db = await initDB();
    
    console.log(`🏆 Advancing tournament ${tournamentId} from round ${currentRound}`);
    
    // Bu round'un kazananlarını al
    const winners = await db.all(
        `SELECT winnerId as id, u.username 
         FROM matches m 
         JOIN users u ON m.winnerId = u.id 
         WHERE m.tournamentId = ? AND m.round = ?`,
        [tournamentId, currentRound]
    );
    
    console.log(`🏆 Winners from round ${currentRound}:`, winners.map(w => `${w.username} (${w.id})`));
    
    if (winners.length === 1) {
        // Final bitti, turnuvayı sonlandır
        console.log(`🏆 Tournament ${tournamentId} completed! Winner: ${winners[0].username} (${winners[0].id})`);
        await finalizeTournament(tournamentId, winners[0].id);
        return;
    }
    
    const nextRound = currentRound + 1;
    
    console.log(`🏆 Creating ${Math.floor(winners.length / 2)} matches for round ${nextRound}`);
    
    // Sonraki round maçlarını oluştur
    for (let i = 0; i < winners.length; i += 2) {
        if (winners[i + 1]) {
            await db.run(
                `INSERT INTO matches (player1Id, player2Id, tournamentId, round, createdAt) 
                 VALUES (?, ?, ?, ?, ?)`,
                [winners[i].id, winners[i + 1].id, tournamentId, nextRound, new Date().toISOString()]
            );
            console.log(`🏆 Created match: ${winners[i].username} vs ${winners[i + 1].username} (Round ${nextRound})`);
        }
    }
    
    // Sonraki round maçlarını başlat
    const { startTournamentMatches } = await import('../services/match.service.js');
    await startTournamentMatches(tournamentId, nextRound);
    
    // Sonraki round başladığını bildir
    await broadcastToTournamentPlayers(tournamentId, {
        type: 'tournament',
        event: 'nextRoundStarted',
        data: { 
            tournamentId,
            round: nextRound,
            winners: winners.map(w => ({ id: w.id, username: w.username }))
        }
    });
    
    console.log(`Tournament ${tournamentId} advanced to round ${nextRound}`);
}

// Turnuvayı sonlandırma
async function finalizeTournament(tournamentId, winnerId) {
    const db = await initDB();
    
    // Turnuva durumunu 'completed' yap ve kazananı belirle
    await db.run(
        'UPDATE tournaments SET status = "completed", winnerId = ?, endAt = ? WHERE id = ?',
        [winnerId, new Date().toISOString(), tournamentId]
    );
    
    // Tüm kullanıcıların currentTournamentId'sini temizle
    await db.run(
        'UPDATE users SET currentTournamentId = NULL WHERE currentTournamentId = ?',
        [tournamentId]
    );
    
    // Kazanan kullanıcının win sayısını artır
    await db.run(
        'UPDATE users SET wins = wins + 1 WHERE id = ?',
        [winnerId]
    );
    
    // Turnuva sonuçlarını bildir
    await broadcastToTournamentPlayers(tournamentId, {
        type: 'tournament',
        event: 'tournamentEnded',
        data: { 
            tournamentId,
            winnerId,
            message: 'Tournament tamamlandı!'
        }
    });
    
    // Yeni turnuva otomatik oluştur
    await autoCreateNextTournament();
    
    console.log(`Tournament ${tournamentId} completed. Winner: ${winnerId}`);
}

// Otomatik yeni turnuva oluşturma
async function autoCreateNextTournament() {
    const db = await initDB();
    
    const sql = `
        INSERT INTO tournaments (name, startAt, endAt, maxPlayers, status) 
        VALUES (?, NULL, NULL, 4, 'pending')
    `;
    
    try {
        const result = await db.run(sql, [`Tournament ${Date.now()}`]);
        const newTournamentId = result.lastID;
        
        // Tüm kullanıcılara yeni turnuva oluşturulduğunu bildir
        const { broadcastToAll } = await import('../../../websocket/services/client.service.js');
        await broadcastToAll({
            type: 'tournament',
            event: 'newTournamentCreated',
            data: { 
                tournamentId: newTournamentId,
                message: 'Yeni turnuva oluşturuldu! Katılmak için joinle.'
            }
        });
        
        console.log(`New tournament ${newTournamentId} auto-created`);
    } catch (error) {
        console.error('Error auto-creating tournament:', error);
    }
}

// Oyuncu turnuvadan çıkarıldığında (disconnect vs.) otomatik ilerletme
export async function handlePlayerDisconnection(userId, tournamentId) {
    const db = await initDB();
    
    // Kullanıcının aktif maçları kontrol et
    const activeMatch = await db.get(
        `SELECT * FROM matches 
         WHERE tournamentId = ? AND (player1Id = ? OR player2Id = ?) AND winnerId IS NULL`,
        [tournamentId, userId, userId]
    );
    
    if (activeMatch) {
        // Rakibi otomatik kazanan yap
        const opponentId = activeMatch.player1Id === userId ? activeMatch.player2Id : activeMatch.player1Id;
        
        await db.run(
            'UPDATE matches SET winnerId = ?, endedAt = ? WHERE id = ?',
            [opponentId, new Date().toISOString(), activeMatch.id]
        );
        
        // Maç sonucunu işle
        await processTournamentMatchResult(activeMatch.id, opponentId);
        
        await broadcastToTournamentPlayers(tournamentId, {
            type: 'tournament',
            event: 'playerDisconnected',
            data: { 
                disconnectedUserId: userId,
                winnerId: opponentId,
                matchId: activeMatch.id
            }
        });
    }
    
    // Kullanıcıyı turnuvadan çıkar
    await db.run(
        'UPDATE users SET currentTournamentId = NULL WHERE id = ?',
        [userId]
    );
}
