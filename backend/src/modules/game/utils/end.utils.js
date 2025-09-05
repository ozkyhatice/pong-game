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
        // send game over to all players
        for (const [socket] of room.sockets) {
            await sendMessage(socket, 'game', 'game-over', {
                roomId: room.id,
                winner: null, 
                finalScore: room.state.score
            });
        }
        await saveGametoDbServices(room, userId);
        
        metrics.totalGamesPlayed.inc();
        
        // if tournament match, process the result
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
    const userId2 = room.players.length === 2 ? room.players.filter(id => id !== userId) : []; // Array operations instead of Set
    let winId = null;
    if (userId2) 
        winId = userId2[0];
    // Stop game if it's running
    if (room.started && !room.state.gameOver) {
        clearInterval(room.loop);
        room.started = false;
        room.loop = null;
        room.state.gameOver = true;
        room.endDate = new Date();
    }
    
    // Always broadcast player left message
    try {
        for (const [playerId, socket] of room.sockets) {
            if (playerId !== userId) { // Don't send to the user who left
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
            // Pause the game and store game state
            room.state.paused = true;
            if (room.loop) {
                clearInterval(room.loop);
                room.loop = null;
            }
            room.sockets.delete(userId);
            
            // Start 30-second reconnection timer            
            await broadcast(room, "game", "paused", {
                reason: "player-disconnected",
                userId: userId,
                message: `Player ${userId} disconnected. Waiting 30 seconds for reconnection...`,
                timeoutSeconds: 30
            });
            
            // Set timeout to declare opponent winner after 30 seconds
            room.disconnectionTimeout = setTimeout(async () => {
                
                // Check if room still exists and is still paused
                const currentRoom = rooms.get(roomId);
                if (currentRoom && currentRoom.state.paused) {
                    // Declare opponent as winner
                    const opponentId = user2;
                    currentRoom.winnerId = opponentId;
                    currentRoom.endDate = new Date();
                    currentRoom.state.gameOver = true;
                    
                    
                    // Save game and process tournament if applicable
                    await saveGametoDbServices(currentRoom);
                    if (currentRoom.tournamentId && currentRoom.winnerId) {
                        await processTournamentMatchResult(currentRoom.matchId, currentRoom.winnerId);
                    }
                    
                    // Update player stats
                    try {
                        const playerStats = [
                            { userId: opponentId, isWinner: true },   // Kalan oyuncu kazanır
                            { userId: userId, isWinner: false }       // Disconnect olan oyuncu kaybeder
                        ];
                        await updateMultipleUserStats(playerStats);
                    } catch (error) {
                        console.log(` GAME STATS ERROR: Failed to update stats after timeout -> Error: ${error.message}`);
                    }
                    
                    // Broadcast game over with disconnect reason
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
                    
                    // Clean up room
                    clearTimeout(currentRoom.disconnectionTimeout);
                    for (const playerId of currentRoom.players) {
                        userRoom.delete(playerId);
                    }
                    currentRoom.players.length = 0; // Clear array instead of Set.clear()
                    currentRoom.sockets.clear();
                }
            }, 30000); // 30 seconds
          } else if (message === 'leave') {
            if (room.started && !room.state.gameOver) {
                const players = room.players; // Already an array
                if (players.length === 2) {
                    room.winnerId = user2;
                    await saveGametoDbServices(room);
                    
                    // if it is tournament match, process the result
                    if (room.tournamentId && room.winnerId) {
                        await processTournamentMatchResult(room.matchId, room.winnerId);
                    }
                    
                    // Update user stats - winner gets +1 win, leaver gets +1 loss
                    try {
                        const playerStats = [
                            { userId: user2, isWinner: true },    // Kalan oyuncu kazanır
                            { userId: userId, isWinner: false }   // Çıkan oyuncu kaybeder
                        ];
                        
                        await updateMultipleUserStats(playerStats);
                    } catch (error) {
                        console.log(` GAME STATS ERROR: Failed to update stats after leave -> Error: ${error.message}`);
                    }
                }
            }
            await broadcastLeft(room, userId);
            
            // Remove the user who left
            userRoom.delete(userId);
            const playerIndex = room.players.indexOf(userId); // Find index in array
            if (playerIndex > -1) {
                room.players.splice(playerIndex, 1); // Remove from array
            }
            room.sockets.delete(userId);
            
            // Also remove the other user from the room since the game is over
            if (user2) {
                userRoom.delete(user2);
                const player2Index = room.players.indexOf(user2); // Find index in array
                if (player2Index > -1) {
                    room.players.splice(player2Index, 1); // Remove from array
                }
                room.sockets.delete(user2);
            }
          }
        }
      }
}
