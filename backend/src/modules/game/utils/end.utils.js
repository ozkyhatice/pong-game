import { sendMessage } from '../utils/join.utils.js';
import { saveGametoDbServices } from '../services/game.service.js';
import { rooms, userRoom } from '../controller/game.controller.js';
import { updateMultipleUserStats } from '../../user/service/user.service.js';
import { processTournamentMatchResult } from '../../tournament/service/tournament.service.js';
export async function broadcastGameOver(room, userId) {
    if (!room || !room.started) {
        console.error(`🔍 GAME ERROR: Room not found or not started -> User: ${userId}`);
        return;
    }
    if (room.started && !room.state.gameOver) {
        clearInterval(room.loop);
        room.started = false;
        room.loop = null;
        room.state.gameOver = true; // Oyun bitti
        room.endDate = new Date();


    }
    try {
        // Tüm oyunculara game-over mesajı gönder
        for (const [playerId, socket] of room.sockets) {
            await sendMessage(socket, 'game', 'game-over', {
                roomId: room.id,
                winner: null, // Disconnect nedeniyle kazanan yok
                finalScore: room.state.score
            });
        }
        await saveGametoDbServices(room, userId); //db kaydet
        
        // Eğer bu bir turnuva maçıysa, turnuva ilerlemesini kontrol et
        if (room.tournamentId && room.winnerId) {
            await processTournamentMatchResult(room.matchId, room.winnerId);
        }
        
        console.log(`🏆 GAME BROADCAST: Game over sent -> Room: ${room.id}`);   
    }catch (error) {
        console.error(`🔴 GAME BROADCAST ERROR: Failed to broadcast game over -> Error: ${error.message}`);
    }
}

export async function broadcastLeft(room, userId) {
    if (!room) {
        console.error(`🔍 GAME ERROR: Room not found for leave -> User: ${userId}`);
        return;
    }
    const userId2 = room.players.size === 2 ? Array.from(room.players).filter(id => id !== userId) : [];
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
                    leftPlayer: userId
                });
            }
        }
        console.log(`🚫 GAME BROADCAST: Player left sent -> Room: ${room.id}`);   
    } catch (error) {
        console.error(`🔴 GAME BROADCAST ERROR: Failed to broadcast leave -> Error: ${error.message}`);
    }
}
export async function broadcast(room, type, event, data = {}) {
  for (const [userId, socket] of room.sockets.entries()) {
    try {
      await sendMessage(socket, type, event, data);
    } catch (error) {
      console.error(`🔴 GAME BROADCAST ERROR: Failed to send -> User: ${userId}, Room: ${room.id}, Error: ${error.message}`);
    }
  }
  console.log(`📡 GAME BROADCAST: Event sent -> Event: ${event}, Room: ${room.id}`);
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
            console.log(`🔌 GAME DISCONNECT: Player disconnected, starting timer -> User: ${userId}, Room: ${roomId}`);
            
            await broadcast(room, "game", "paused", {
                reason: "player-disconnected",
                userId: userId,
                message: `Player ${userId} disconnected. Waiting 30 seconds for reconnection...`,
                timeoutSeconds: 30
            });
            
            // Set timeout to declare opponent winner after 30 seconds
            room.disconnectionTimeout = setTimeout(async () => {
                console.log(`⏰ GAME TIMEOUT: Reconnection timeout reached -> User: ${userId}, Room: ${roomId}`);
                
                // Check if room still exists and is still paused
                const currentRoom = rooms.get(roomId);
                if (currentRoom && currentRoom.state.paused) {
                    // Declare opponent as winner
                    const opponentId = user2;
                    currentRoom.winnerId = opponentId;
                    currentRoom.endDate = new Date();
                    currentRoom.state.gameOver = true;
                    
                    console.log(`🏆 GAME WIN: Victory by disconnection -> Winner: ${opponentId}, Room: ${roomId}`);
                    
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
                        console.error(`🔴 GAME STATS ERROR: Failed to update stats after timeout -> Error: ${error.message}`);
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
                    currentRoom.players.clear();
                    currentRoom.sockets.clear();
                }
            }, 30000); // 30 seconds
          } else if (message === 'leave') {
            if (room.started && !room.state.gameOver) {
                console.log(`🚫 GAME LEAVE: Player left match -> User: ${userId}, Room: ${room.id}`);
                const players = Array.from(room.players);
                if (players.length === 2) {
                    room.winnerId = user2;
                    await saveGametoDbServices(room);
                    
                    // Eğer bu bir turnuva maçıysa, turnuva ilerlemesini kontrol et
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
                        console.log(`📊 GAME STATS: Stats updated after leave -> Room: ${room.id}`);
                    } catch (error) {
                        console.error(`🔴 GAME STATS ERROR: Failed to update stats after leave -> Error: ${error.message}`);
                    }
                }
            }
            await broadcastLeft(room, userId);
            
            // Remove the user who left
            userRoom.delete(userId);
            room.players.delete(userId);
            room.sockets.delete(userId);
            
            // Also remove the other user from the room since the game is over
            if (user2) {
                userRoom.delete(user2);
                room.players.delete(user2);
                room.sockets.delete(user2);
                console.log(`🗑️ ROOM CLEANUP: Removed other player -> User: ${user2}, Room: ${room.id}`);
            }
          }
        }
      }
}
