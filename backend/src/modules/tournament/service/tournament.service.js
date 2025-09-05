import { initDB } from '../../../config/db.js';
import { sendMessage } from '../../chat/service/websocket.service.js';
import { getActiveTournamentId, broadcastToTournamentPlayers, getTournamentParticipants, broadcastTournamentUpdateToAll} from '../utils/tournament.utils.js';
import { sanitizeTournamentInput, prepareSqlParams, isValidUserId, sanitizeTournamentMessage } from '../utils/security.utils.js';


// create a new tournament
export async function createTournamentService(data, userId, connection) {
    
    if (!isValidUserId(userId)) {
        throw new Error('Invalid user ID format');
    }
    
    const db = await initDB();
    
    
    const sanitizedData = sanitizeTournamentInput(data);
    const tournamentName = sanitizedData.name;
    const maxPlayers = sanitizedData.maxPlayers || 4;
    
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
        
        const params = prepareSqlParams([
            tournamentName,
            maxPlayers
        ]);
        
        await db.run(sql, params);
    } catch (error) {
        throw error;
    }
    
    const newTournamentId = await getActiveTournamentId();    
    
    
    const updateMessage = sanitizeTournamentMessage({
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
    
    
    await broadcastTournamentUpdateToAll(updateMessage);
}









// join a tournament
export async function joinTournamentService(data, userId, connection) {
    
    if (!isValidUserId(userId)) {
        throw new Error('Invalid user ID format');
    }
    
    const tournamentId = data.tournamentId;
    if (!tournamentId) {
        throw new Error('Tournament ID is required');
    }
    
    const db = await initDB();
    
    const sql = `
        UPDATE users SET currentTournamentId = ?, isEliminated = 0 WHERE id = ?
    `;
    try {
        
        const params = prepareSqlParams([tournamentId, userId]);
        const result = await db.run(sql, params);
        return result;
    } catch (error) {
        throw error;
    }
}



// start a tournament
export async function startTournamentService(tournamentId) {
    const db = await initDB();
    
    
    const sql = `UPDATE tournaments SET status = "active", startAt = ? WHERE id = ?`;
    await db.run(sql, [new Date().toISOString(), tournamentId]);
    
    const participants = await getTournamentParticipants(tournamentId);
    const bracket = generateTournamentBracket(participants);
    
    await createTournamentMatches(tournamentId, bracket[0], 1);
    await storeTournamentPairings(tournamentId, bracket);
    
    await showMatchPairings(tournamentId, bracket[0], 1);
    
    setTimeout(async () => {
        const { startTournamentMatches } = await import('../services/match.service.js');
        await startTournamentMatches(tournamentId, 1);
    }, 5000);
    
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
    
}

export async function getTournamentDetailsService(tournamentId) {
    const db = await initDB();
    
    
    const tournament = await db.get(
        'SELECT * FROM tournaments WHERE id = ?', [tournamentId]
    );
    
    if (!tournament) {
        return null;
    }
    
    
    const participants = await getTournamentParticipants(tournamentId);
    
    const matches = await db.all(
        `SELECT m.*, u1.username as player1Username, u2.username as player2Username 
         FROM matches m 
         JOIN users u1 ON m.player1Id = u1.id 
         JOIN users u2 ON m.player2Id = u2.id 
         WHERE m.tournamentId = ? 
         ORDER BY m.round ASC, m.id ASC`,
        [tournamentId]
    );
    
    
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
    
    
    return result;
}

export async function getTournamentBracketService(tournamentId) {
    const participants = await getTournamentParticipants(tournamentId);
    
    if (participants.length < 4) {
        return null;
    }
    
    return generateTournamentBracket(participants);
}


export async function leaveTournamentService(tournamentId, userId) {
    const db = await initDB();
    
    
    await db.run(
        'UPDATE users SET currentTournamentId = NULL WHERE id = ?', 
        [userId]
    );
    
}

function generateTournamentBracket(participants) {
    if (participants.length !== 4) {
        throw new Error('Tournament must have exactly 4 participants');
    }
    
    
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    
    
    const bracket = [
        [], 
        []  
    ];
    
    
    for (let i = 0; i < 4; i += 2) {
        bracket[0].push({
            player1: shuffled[i],
            player2: shuffled[i + 1],
            winner: null
        });
    }
    
    
    bracket[1].push({
        player1: null,
        player2: null,
        winner: null
    });
    
    return bracket;
}

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



// process tournament match result
export async function processTournamentMatchResult(matchId, winnerId) {
    
    
    await updateTournamentPairingWithWinner(matchId, winnerId);
    const db = await initDB();
    
    
    const match = await db.get(
        'SELECT * FROM matches WHERE id = ?', [matchId]
    );
    
    if (!match || !match.tournamentId) {
        return; 
    }
    
    const tournamentId = match.tournamentId;
    const round = match.round;
    
    
    
    const unfinishedMatches = await db.all(
        'SELECT * FROM matches WHERE tournamentId = ? AND round = ? AND winnerId IS NULL',
        [tournamentId, round]
    );
    
    
    if (unfinishedMatches.length > 0) {
        
        await broadcastToTournamentPlayers(tournamentId, {
            type: 'tournament',
            event: 'matchCompleted',
            data: { matchId, winnerId, round }
        });
        return;
    }
    
    
    
    await showRoundResults(tournamentId, round);
    
    
    setTimeout(async () => {
        try {
            await advanceToNextRound(tournamentId, round);
        } catch (error) {
            console.error(`Error advancing to next round for tournament ${tournamentId}:`, error);
        }
    }, 5000);
}


async function storeTournamentPairings(tournamentId, bracket) {
    const db = await initDB();
    
    
    await db.run('DELETE FROM tournament_pairings WHERE tournamentId = ?', [tournamentId]);
    
    
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
    
}

async function updateTournamentPairingWithWinner(matchId, winnerId) {
    const db = await initDB();
    
    const match = await db.get('SELECT * FROM matches WHERE id = ?', [matchId]);
    if (!match || !match.tournamentId) return;
    
    await db.run(
        `UPDATE tournament_pairings 
         SET winnerId = ?, matchId = ?
         WHERE tournamentId = ? AND round = ? 
         AND ((player1Id = ? AND player2Id = ?) OR (player1Id = ? AND player2Id = ?))`,
        [winnerId, matchId, match.tournamentId, match.round, 
         match.player1Id, match.player2Id, match.player2Id, match.player1Id]
    );
    
}
async function showMatchPairings(tournamentId, roundMatches, round) {
    const roundName = round === 1 ? 'Semifinals' : round === 2 ? 'Final' : `Round ${round}`;
    
    const pairings = roundMatches.map(match => ({
        player1: match.player1.username,
        player2: match.player2.username
    }));
    
    
    await broadcastToTournamentPlayers(tournamentId, {
        type: 'tournament',
        event: 'matchPairingsRevealed',
        data: { 
            tournamentId,
            round,
            roundName,
            pairings,
            message: `${roundName} pairings revealed! Matches start in 5 seconds...`,
            startsIn: 5 
        }
    });
}

async function showRoundResults(tournamentId, completedRound) {
    const db = await initDB();
    
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
            nextRoundStartsIn: 5 
        }
    });
}

async function advanceToNextRound(tournamentId, currentRound) {
    const db = await initDB();
    
    
    const winners = await db.all(
        `SELECT winnerId as id, u.username 
         FROM matches m 
         JOIN users u ON m.winnerId = u.id 
         WHERE m.tournamentId = ? AND m.round = ?`,
        [tournamentId, currentRound]
    );
    
    
    const matches = await db.all(
        `SELECT player1Id, player2Id, winnerId 
         FROM matches 
         WHERE tournamentId = ? AND round = ?`,
        [tournamentId, currentRound]
    );
    
    for (const match of matches) {
        const loserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
        await db.run(
            'UPDATE users SET isEliminated = 1 WHERE id = ? AND currentTournamentId = ?',
            [loserId, tournamentId]
        );
    }
    
    if (winners.length === 1) {
        await finalizeTournament(tournamentId, winners[0].id);
        return;
    }
    
    const nextRound = currentRound + 1;
    
    
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
        }
    }
    
    await db.run('UPDATE tournaments SET currentRound = ? WHERE id = ?', [nextRound, tournamentId]);
    
    for (let position = 0; position < nextRoundMatches.length; position++) {
        const match = nextRoundMatches[position];
        await db.run(
            `UPDATE tournament_pairings 
             SET player1Id = ?, player2Id = ? 
             WHERE tournamentId = ? AND round = ? AND position = ? AND player1Id IS NULL`,
            [match.player1.id, match.player2.id, tournamentId, nextRound, position]
        );
    }
    
    const pairings = [];
    for (let i = 0; i < winners.length; i += 2) {
        if (winners[i + 1]) {
            pairings.push({
                player1: winners[i].username,
                player2: winners[i + 1].username
            });
        }
    }
    
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
    
    setTimeout(async () => {
        try {
            const { startTournamentMatches } = await import('../services/match.service.js');
            await startTournamentMatches(tournamentId, nextRound);
            
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
            
        } catch (error) {
        }
    }, 5000);
}

async function finalizeTournament(tournamentId, winnerId) {
    const db = await initDB();
    
    await db.run(
        'UPDATE tournaments SET status = "completed", winnerId = ?, endAt = ? WHERE id = ?',
        [winnerId, new Date().toISOString(), tournamentId]
    );
    
    await db.run(
        'UPDATE users SET currentTournamentId = NULL, isEliminated = 0 WHERE currentTournamentId = ?',
        [tournamentId]
    );
    
    await db.run(
        'UPDATE users SET wins = wins + 1 WHERE id = ?',
        [winnerId]
    );
    
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
    
    await autoCreateNextTournament();
    
}

async function autoCreateNextTournament() {
    const db = await initDB();
    
    const sql = `
        INSERT INTO tournaments (name, startAt, endAt, maxPlayers, status) 
        VALUES (?, NULL, NULL, 4, 'pending')
    `;
    
    try {
        const result = await db.run(sql, [`Tournament ${Date.now()}`]);
        const newTournamentId = result.lastID;
        
        await broadcastTournamentUpdateToAll({
            type: 'tournament',
            event: 'newTournamentCreated',
            data: { 
                tournamentId: newTournamentId,
                message: 'A new tournament has been created! Join now to participate.'
            }
        });
        
    } catch (error) {
    }
}

export async function handlePlayerDisconnection(userId, tournamentId) {
    const db = await initDB();
    
    const activeMatch = await db.get(
        `SELECT * FROM matches 
         WHERE tournamentId = ? AND (player1Id = ? OR player2Id = ?) AND winnerId IS NULL`,
        [tournamentId, userId, userId]
    );
    
    if (activeMatch) {
        const opponentId = activeMatch.player1Id === userId ? activeMatch.player2Id : activeMatch.player1Id;
        
        await db.run(
            'UPDATE matches SET winnerId = ?, endedAt = ? WHERE id = ?',
            [opponentId, new Date().toISOString(), activeMatch.id]
        );
        
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
    
    await db.run(
        'UPDATE users SET currentTournamentId = NULL WHERE id = ?',
        [userId]
    );
}


export async function getUserTournamentStatus(tournamentId, userId) {
    const db = await initDB();
    
    const tournamentDetails = await getTournamentDetailsService(tournamentId);
    
    const isParticipant = tournamentDetails && tournamentDetails.participants.some(p => p.id === userId);
    let userStatus = 'spectator'; 
    
    if (isParticipant) {
        const sql = 'SELECT isEliminated FROM users WHERE id = ?';
        const userInfo = await db.get(sql, [userId]);
        userStatus = userInfo?.isEliminated ? 'eliminated' : 'active';
    }
    
    return {
        isParticipant,
        userStatus 
    };
}


