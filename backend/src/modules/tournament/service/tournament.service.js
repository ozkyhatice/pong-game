import { initDB } from '../../../config/db.js';
import { sendMessage } from '../../chat/service/websocket.service.js';
import { getActiveTournamentId, broadcastToTournamentPlayers, getTournamentParticipants, broadcastTournamentUpdateToAll} from '../utils/tournament.utils.js';

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
    
    // Tüm online kullanıcılara yeni tournament oluşturulduğunu bildir
    await broadcastTournamentUpdateToAll({
        type: 'tournament',
        event: 'newTournamentCreated',
        data: { 
            tournamentId: newTournamentId,
            name: tournamentName,
            maxPlayers: maxPlayers,
            createdBy: userId,
            message: 'New tournament created! Join now!'
        }
    });
}



// Kullanıcıyı turnuvaya katma
//event: 'join'
//data: { tournamentId }
//userId: katılacak kullanıcı
//connection: kullanıcının WebSocket bağlantısı
export async function joinTournamentService(data, userId, connection) {
    const tournamentId = data.tournamentId;
    const db = await initDB();
    // user tablosunda currentTournamentId alanını güncelle ve isEliminated'ı sıfırla
    const sql = `
        UPDATE users SET currentTournamentId = ?, isEliminated = 0 WHERE id = ?
    `;
    try {
        const result = await db.run(sql, [tournamentId, userId]);
        console.log(`User ${userId} joined tournament ${tournamentId} and reset elimination status`);
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
    
    // İlk round maçlarını oluştur ve pairings'i veritabanına kaydet
    await createTournamentMatches(tournamentId, bracket[0], 1);
    await storeTournamentPairings(tournamentId, bracket);
    
    // Önce maç eşleşmelerini göster, sonra maçları başlat
    await showMatchPairings(tournamentId, bracket[0], 1);
    
    // 5 saniye sonra maçları başlat
    setTimeout(async () => {
        const { startTournamentMatches } = await import('../services/match.service.js');
        await startTournamentMatches(tournamentId, 1);
    }, 5000);
    
    // Tüm online kullanıcılara turnuva başladığını bildir (katılımcılara da, sadece izleyenlere de)
    await broadcastTournamentUpdateToAll({
        type: 'tournament',
        event: 'tournamentStarted',
        data: { 
            tournamentId,
            bracket,
            participants,
            currentRound: 1,
            message: 'Tournament has started! First round matches are beginning...'
        }
    });
    
    console.log(`Tournament ${tournamentId} started with ${participants.length} players`);
}

// Turnuva detaylarını getirme
export async function getTournamentDetailsService(tournamentId) {
    const db = await initDB();
    
    console.log(`📊 TOURNAMENT SERVICE: Getting details for tournament ${tournamentId}`);
    
    // Turnuva bilgilerini al
    const tournament = await db.get(
        'SELECT * FROM tournaments WHERE id = ?', [tournamentId]
    );
    
    if (!tournament) {
        console.log(`📊 TOURNAMENT SERVICE: Tournament ${tournamentId} not found`);
        return null;
    }
    
    console.log(`📊 TOURNAMENT SERVICE: Tournament found - Status: ${tournament.status}, Name: ${tournament.name}`);
    
    // Katılımcıları al
    const participants = await getTournamentParticipants(tournamentId);
    console.log(`📊 TOURNAMENT SERVICE: Found ${participants.length} participants`);
    
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
    
    console.log(`📊 TOURNAMENT SERVICE: Found ${matches.length} matches`);
    
    // Tournament pairings'i de al
    const pairings = await db.all(
        `SELECT tp.*, u1.username as player1Username, u2.username as player2Username, u3.username as winnerUsername
         FROM tournament_pairings tp
         LEFT JOIN users u1 ON tp.player1Id = u1.id
         LEFT JOIN users u2 ON tp.player2Id = u2.id  
         LEFT JOIN users u3 ON tp.winnerId = u3.id
         WHERE tp.tournamentId = ?
         ORDER BY tp.round ASC, tp.position ASC`,
        [tournamentId]
    );
    
    const result = {
        ...tournament,
        participants,
        matches,
        pairings,
        currentPlayers: participants.length
    };
    
    console.log(`📊 TOURNAMENT SERVICE: Returning tournament details with ${result.participants.length} participants, ${result.matches.length} matches, ${result.pairings?.length || 0} pairings`);
    
    return result;
}

// Turnuva bracket'ini getirme
export async function getTournamentBracketService(tournamentId) {
    const participants = await getTournamentParticipants(tournamentId);
    
    // Eğer tournament henüz başlamamışsa (4 kişi değilse) bracket oluşturma
    if (participants.length < 4) {
        console.log(`📊 TOURNAMENT BRACKET: Not enough participants (${participants.length}/4), returning empty bracket`);
        return null;
    }
    
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
    console.log(`🏆 TOURNAMENT: Processing match ${matchId} result, winner: ${winnerId}`);
    
    // Tournament pairings'e kazananı kaydet
    await updateTournamentPairingWithWinner(matchId, winnerId);
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
    
    console.log(`🏆 TOURNAMENT ${tournamentId}: Round ${round} match ${matchId} won by ${winnerId}`);
    
    // Bu round'daki tüm maçların bitip bitmediğini kontrol et
    const unfinishedMatches = await db.all(
        'SELECT * FROM matches WHERE tournamentId = ? AND round = ? AND winnerId IS NULL',
        [tournamentId, round]
    );
    
    console.log(`⏳ TOURNAMENT ${tournamentId}: ${unfinishedMatches.length} matches remaining in round ${round}`);
    
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
    
    // Tüm maçlar bitti, kazananları göster ve sonraki round'a geç
    console.log(`🎉 All matches in round ${round} completed! Showing winners and advancing to next round...`);
    
    // Önce kazananları göster
    await showRoundResults(tournamentId, round);
    
    // 5 saniye bekle, sonra sonraki round'a geç
    setTimeout(async () => {
        try {
            await advanceToNextRound(tournamentId, round);
        } catch (error) {
            console.error(`❌ Error advancing to next round for tournament ${tournamentId}:`, error);
        }
    }, 5000);
}

// Tournament pairings'i veritabanına kaydetme
async function storeTournamentPairings(tournamentId, bracket) {
    const db = await initDB();
    
    // Mevcut pairings'i temizle
    await db.run('DELETE FROM tournament_pairings WHERE tournamentId = ?', [tournamentId]);
    
    // Her round için pairings'i kaydet (forEach yerine for...of kullan async için)
    for (let roundIndex = 0; roundIndex < bracket.length; roundIndex++) {
        const round = bracket[roundIndex];
        for (let position = 0; position < round.length; position++) {
            const match = round[position];
            await db.run(
                `INSERT INTO tournament_pairings (tournamentId, round, position, player1Id, player2Id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    tournamentId, 
                    roundIndex + 1, 
                    position, 
                    match.player1?.id || null, 
                    match.player2?.id || null
                ]
            );
        }
    }
    
    console.log(`💾 TOURNAMENT ${tournamentId}: Bracket pairings stored in database`);
}

// Tournament pairing'e kazananı güncelleme
async function updateTournamentPairingWithWinner(matchId, winnerId) {
    const db = await initDB();
    
    // Maç bilgilerini al
    const match = await db.get('SELECT * FROM matches WHERE id = ?', [matchId]);
    if (!match || !match.tournamentId) return;
    
    // Bu maça karşılık gelen pairing'i bul ve winnerId'yi güncelle
    await db.run(
        `UPDATE tournament_pairings 
         SET winnerId = ?, matchId = ?
         WHERE tournamentId = ? AND round = ? 
         AND ((player1Id = ? AND player2Id = ?) OR (player1Id = ? AND player2Id = ?))`,
        [winnerId, matchId, match.tournamentId, match.round, 
         match.player1Id, match.player2Id, match.player2Id, match.player1Id]
    );
    
    console.log(`💾 TOURNAMENT: Updated pairing with winner ${winnerId} for match ${matchId}`);
}

// Maç eşleşmelerini gösterme (tournament başlarken)
async function showMatchPairings(tournamentId, roundMatches, round) {
    const roundName = round === 1 ? 'Semifinals' : round === 2 ? 'Final' : `Round ${round}`;
    
    const pairings = roundMatches.map(match => ({
        player1: match.player1.username,
        player2: match.player2.username
    }));
    
    console.log(`🎯 Showing ${roundName} pairings for tournament ${tournamentId}:`, pairings);
    
    // Katılımcılara eşleşmeleri göster
    await broadcastToTournamentPlayers(tournamentId, {
        type: 'tournament',
        event: 'matchPairingsRevealed',
        data: { 
            tournamentId,
            round,
            roundName,
            pairings,
            message: `${roundName} pairings revealed! Matches start in 5 seconds...`,
            startsIn: 5 // seconds
        }
    });
}

// Round sonuçlarını gösterme (kazananları bildirme)
async function showRoundResults(tournamentId, completedRound) {
    const db = await initDB();
    
    // Bu round'un kazananlarını al
    const winners = await db.all(
        `SELECT m.winnerId as id, u.username,
                u1.username as player1Username, u2.username as player2Username,
                CASE WHEN m.winnerId = m.player1Id THEN u2.username ELSE u1.username END as defeatedPlayer
         FROM matches m 
         JOIN users u ON m.winnerId = u.id 
         JOIN users u1 ON m.player1Id = u1.id
         JOIN users u2 ON m.player2Id = u2.id
         WHERE m.tournamentId = ? AND m.round = ?`,
        [tournamentId, completedRound]
    );
    
    const roundName = completedRound === 1 ? 'Semifinals' : `Round ${completedRound}`;
    const nextRoundName = completedRound === 1 ? 'Final' : `Round ${completedRound + 1}`;
    
    console.log(`🏆 Round ${completedRound} completed! Winners advancing to ${nextRoundName}:`, 
        winners.map(w => w.username));
    
    // Kazananları ve sonraki round bilgisini broadcast et
    await broadcastToTournamentPlayers(tournamentId, {
        type: 'tournament',
        event: 'roundCompleted',
        data: { 
            tournamentId,
            completedRound,
            roundName,
            nextRoundName,
            winners: winners.map(w => ({ 
                id: w.id, 
                username: w.username,
                defeatedPlayer: w.defeatedPlayer
            })),
            message: `${roundName} completed! ${winners.length} player${winners.length !== 1 ? 's' : ''} advancing to ${nextRoundName}.`,
            nextRoundStartsIn: 5 // seconds
        }
    });
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
    
    // Bu round'da elenen oyuncuları işaretle
    const matches = await db.all(
        `SELECT player1Id, player2Id, winnerId 
         FROM matches 
         WHERE tournamentId = ? AND round = ?`,
        [tournamentId, currentRound]
    );
    
    // Kaybedenleri eliminated olarak işaretle
    for (const match of matches) {
        const loserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
        await db.run(
            'UPDATE users SET isEliminated = 1 WHERE id = ? AND currentTournamentId = ?',
            [loserId, tournamentId]
        );
        console.log(`❌ Player ${loserId} eliminated from tournament ${tournamentId}`);
    }
    
    if (winners.length === 1) {
        // Final bitti, turnuvayı sonlandır
        console.log(`🏆 Tournament ${tournamentId} completed! Winner: ${winners[0].username} (${winners[0].id})`);
        await finalizeTournament(tournamentId, winners[0].id);
        return;
    }
    
    const nextRound = currentRound + 1;
    
    console.log(`🏆 Creating ${Math.floor(winners.length / 2)} matches for round ${nextRound}`);
    
    // Sonraki round maçlarını oluştur
    const nextRoundMatches = [];
    for (let i = 0; i < winners.length; i += 2) {
        if (winners[i + 1]) {
            const result = await db.run(
                `INSERT INTO matches (player1Id, player2Id, tournamentId, round, createdAt) 
                 VALUES (?, ?, ?, ?, ?)`,
                [winners[i].id, winners[i + 1].id, tournamentId, nextRound, new Date().toISOString()]
            );
            nextRoundMatches.push({
                id: result.lastID,
                player1: winners[i],
                player2: winners[i + 1]
            });
            console.log(`🏆 Created match: ${winners[i].username} vs ${winners[i + 1].username} (Round ${nextRound})`);
        }
    }
    
    // Tournament current round'u güncelle
    await db.run('UPDATE tournaments SET currentRound = ? WHERE id = ?', [nextRound, tournamentId]);
    
    // Sonraki round için pairings'i güncelle (mevcut boş pairing'i update et)
    for (let position = 0; position < nextRoundMatches.length; position++) {
        const match = nextRoundMatches[position];
        await db.run(
            `UPDATE tournament_pairings 
             SET player1Id = ?, player2Id = ? 
             WHERE tournamentId = ? AND round = ? AND position = ? AND player1Id IS NULL`,
            [match.player1.id, match.player2.id, tournamentId, nextRound, position]
        );
    }
    
    // Önce maç eşleşmelerini göster
    const pairings = [];
    for (let i = 0; i < winners.length; i += 2) {
        if (winners[i + 1]) {
            pairings.push({
                player1: winners[i].username,
                player2: winners[i + 1].username
            });
        }
    }
    
    // Eşleşmeleri göster
    await broadcastToTournamentPlayers(tournamentId, {
        type: 'tournament',
        event: 'matchPairingsRevealed',
        data: { 
            tournamentId,
            round: nextRound,
            roundName: nextRound === 2 ? 'Final' : `Round ${nextRound}`,
            pairings,
            message: `${nextRound === 2 ? 'Final' : `Round ${nextRound}`} pairings revealed! Matches start in 5 seconds...`,
            startsIn: 5
        }
    });
    
    // 5 saniye sonra maçları başlat
    setTimeout(async () => {
        try {
            console.log(`🚀 TOURNAMENT ${tournamentId}: Starting round ${nextRound} matches`);
            const { startTournamentMatches } = await import('../services/match.service.js');
            await startTournamentMatches(tournamentId, nextRound);
            
            // Maçlar başladığını bildir
            const roundName = nextRound === 2 ? 'Final' : `Round ${nextRound}`;
            await broadcastToTournamentPlayers(tournamentId, {
                type: 'tournament',
                event: 'nextRoundStarted',
                data: { 
                    tournamentId,
                    round: nextRound,
                    roundName,
                    winners: winners.map(w => ({ id: w.id, username: w.username })),
                    message: `${roundName} matches are starting now!`
                }
            });
            
            console.log(`🚀 TOURNAMENT ${tournamentId}: Round ${nextRound} started successfully`);
        } catch (error) {
            console.error(`❌ Error starting round ${nextRound} for tournament ${tournamentId}:`, error);
        }
    }, 5000);
}

// Turnuvayı sonlandırma
async function finalizeTournament(tournamentId, winnerId) {
    const db = await initDB();
    
    // Turnuva durumunu 'completed' yap ve kazananı belirle
    await db.run(
        'UPDATE tournaments SET status = "completed", winnerId = ?, endAt = ? WHERE id = ?',
        [winnerId, new Date().toISOString(), tournamentId]
    );
    
    // Tüm kullanıcıların currentTournamentId ve isEliminated'ını temizle
    await db.run(
        'UPDATE users SET currentTournamentId = NULL, isEliminated = 0 WHERE currentTournamentId = ?',
        [tournamentId]
    );
    
    // Kazanan kullanıcının win sayısını artır
    await db.run(
        'UPDATE users SET wins = wins + 1 WHERE id = ?',
        [winnerId]
    );
    
    // Turnuva sonuçlarını tüm online kullanıcılara bildir
    const winnerUser = await db.get('SELECT username FROM users WHERE id = ?', [winnerId]);
    await broadcastTournamentUpdateToAll({
        type: 'tournament',
        event: 'tournamentEnded',
        data: { 
            tournamentId,
            winnerId,
            winnerUsername: winnerUser?.username || 'Unknown',
            message: `Tournament completed! Winner: ${winnerUser?.username || winnerId}`
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
        await broadcastTournamentUpdateToAll({
            type: 'tournament',
            event: 'newTournamentCreated',
            data: { 
                tournamentId: newTournamentId,
                message: 'A new tournament has been created! Join now to participate.'
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
