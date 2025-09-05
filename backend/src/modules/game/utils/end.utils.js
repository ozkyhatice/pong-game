import { sendMessage } from '../utils/join.utils.js';
import { saveGametoDbServices } from '../services/game.service.js';
import { rooms, userRoom } from '../controller/game.controller.js';
import { updateMultipleUserStats } from '../../user/service/user.service.js';
import { processTournamentMatchResult } from '../../tournament/service/tournament.service.js';
import { metrics } from '../../../plugins/metrics.js';
export async function broadcastGameOver(room, userId) {
    if (!room || !room.started) {
        return;
    }
    if (room.started && !room.state.gameOver) {
        clearInterval(room.loop);
        room.started = false;
        room.loop = null;
        room.state.gameOver = true;
        room.endDate = new Date();


    }
    try {
        
        for (const [socket] of room.sockets) {
            await sendMessage(socket, 'game', 'game-over', {
                roomId: room.id,
                winner: null, 
                finalScore: room.state.score
            });
        }
        await saveGametoDbServices(room, userId);
        
        metrics.totalGamesPlayed.inc();
        
        
        if (room.tournamentId && room.winnerId) {
            await processTournamentMatchResult(room.matchId, room.winnerId);
        }
        }catch (error) {
    }
}

export async function broadcastLeft(room, userId) {
    if (!room) {
        return;
    }
    const userId2 = room.players.length === 2 ? room.players.filter(id => id !== userId) : []; 
    let winId = null;
    if (userId2) 
        winId = userId2[0];
    
    if (room.started && !room.state.gameOver) {
        clearInterval(room.loop);
        room.started = false;
        room.loop = null;
        room.state.gameOver = true;
        room.endDate = new Date();
    }
    
    
    try {
        for (const [playerId, socket] of room.sockets) {
            if (playerId !== userId) { 
                await sendMessage(socket, 'game', 'player left', {
                    roomId: room.id,
                    winner: winId,
                    finalScore: room.state ? room.state.score : null,
                    leftPlayer: userId,
                    isTournamentMatch: !!room.tournamentId,
                    tournamentId: room.tournamentId,
                    round: room.round
                });
            }
        }
    } catch (error) {
    }
}
export async function broadcast(room, type, event, data = {}) {
  for (const [userId, socket] of room.sockets.entries()) {
    try {
      await sendMessage(socket, type, event, data);
    } catch (error) {
    }
  }
}


export async function clearAll(userId, message) {
      const roomId = userRoom.get(userId);
      const user2 = Array.from(userRoom.keys()).find(id => userRoom.get(id) === roomId && id !== userId);
      
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          if (message === 'disconnect') {
            
            room.state.paused = true;
            if (room.loop) {
                clearInterval(room.loop);
                room.loop = null;
            }
            room.sockets.delete(userId);
            
            
            await broadcast(room, "game", "paused", {
                reason: "player-disconnected",
                userId: userId,
                message: `Player ${userId} disconnected. Waiting 30 seconds for reconnection...`,
                timeoutSeconds: 30
            });
            
            
            room.disconnectionTimeout = setTimeout(async () => {
                
                
                const currentRoom = rooms.get(roomId);
                if (currentRoom && currentRoom.state.paused) {
                    
                    const opponentId = user2;
                    currentRoom.winnerId = opponentId;
                    currentRoom.endDate = new Date();
                    currentRoom.state.gameOver = true;
                    
                    
                    
                    await saveGametoDbServices(currentRoom);
                    metrics.totalGamesPlayed.inc();

                    if (currentRoom.tournamentId && currentRoom.winnerId) {
                        await processTournamentMatchResult(currentRoom.matchId, currentRoom.winnerId);
                    }
                    
                    
                    try {
                        const playerStats = [
                            { userId: opponentId, isWinner: true },
                            { userId: userId, isWinner: false }
                        ];
                        await updateMultipleUserStats(playerStats);
                    } catch (error) {
                    }
                    
                    
                    await broadcast(currentRoom, "game", "game-over", {
                        roomId: roomId,
                        winner: opponentId,
                        finalScore: currentRoom.state.score,
                        message: `Player ${opponentId} wins! Opponent disconnected.`,
                        reason: 'opponent-disconnected',
                        isTournamentMatch: !!currentRoom.tournamentId,
                        tournamentId: currentRoom.tournamentId,
                        round: currentRoom.round
                    });
                    
                    
                    clearTimeout(currentRoom.disconnectionTimeout);
                    for (const playerId of currentRoom.players) {
                        userRoom.delete(playerId);
                    }
                    currentRoom.players.length = 0; 
                    currentRoom.sockets.clear();
                }
            }, 30000); 
          } else if (message === 'leave') {
            if (room.started && !room.state.gameOver) {
                const players = room.players; 
                if (players.length === 2) {
                    room.winnerId = user2;
                    await saveGametoDbServices(room);
                    metrics.totalGamesPlayed.inc();

                    
                    
                    if (room.tournamentId && room.winnerId) {
                        await processTournamentMatchResult(room.matchId, room.winnerId);
                    }
                    
                    
                    try {
                        const playerStats = [
                            { userId: user2, isWinner: true },
                            { userId: userId, isWinner: false }
                        ];
                        
                        await updateMultipleUserStats(playerStats);
                    } catch (error) {
                    }
                }
            }
            await broadcastLeft(room, userId);
            
            
            userRoom.delete(userId);
            const playerIndex = room.players.indexOf(userId); 
            if (playerIndex > -1) {
                room.players.splice(playerIndex, 1); 
            }
            room.sockets.delete(userId);
            
            
            if (user2) {
                userRoom.delete(user2);
                const player2Index = room.players.indexOf(user2); 
                if (player2Index > -1) {
                    room.players.splice(player2Index, 1); 
                }
                room.sockets.delete(user2);
            }
          }
        }
      }
}
