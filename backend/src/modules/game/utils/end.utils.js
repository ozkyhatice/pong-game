import { sendMessage } from '../utils/join.utils.js';
import { saveGametoDbServices } from '../services/game.service.js';
import { rooms, userRoom } from '../controller/game.controller.js';
export async function broadcastGameOver(room, userId) {
    if (!room || !room.started) {
        console.error(`Room not found or game not started for user ${userId}`);
        return;
    }
    if (room.started && !room.state.gameOver) {
        clearInterval(room.loop);
        console.log(`Game loop stopped for room ${room.id}`);
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
        console.log(`Game over broadcasted for room ${room.id}`);   
    }catch (error) {
        console.error('Error broadcasting game over:', error);
    }
}

export async function broadcastLeft(room, userId) {
    if (!room) {
        console.error(`Room not found or game not started for user ${userId}`);
        return;
    }
    const userId2 = room.players.size === 2 ? Array.from(room.players).filter(id => id !== userId) : [];
    let winId = null;
    if (userId2) 
        winId = userId2[0];
    console.log("winnerId:", winId);
    if (room.started && !room.state.gameOver) {
        clearInterval(room.loop);
        console.log(`Game loop stopped for room ${room.id}`);
        room.started = false;
        room.loop = null;
        room.state.gameOver = true; // Oyun bitti
        room.endDate = new Date();
        try {
            for (const [playerId, socket] of room.sockets) {
                await sendMessage(socket, 'game', 'player left', {
                    roomId: room.id,
                    winner: winId, // Disconnect nedeniyle kazanan yok
                    finalScore: room.state.score,
                    leftPlayer: userId
                });
    
            }
            // await saveGametoDbServices(room, userId); //db kaydet
            // console.log(`Game over broadcasted for room ${room.id}`);   
        }catch (error) {
            console.error('Error broadcasting - leave:', error);
        }
    }
}
export async function broadcast(room, type, event, data = {}) {
  for (const [userId, socket] of room.sockets.entries()) {
    try {
      await sendMessage(socket, type, event, data);
    } catch (error) {
      console.error(`Error sending message to user ${userId} in room ${room.id}:`, error);
    }
  }
  console.log(`Broadcasted ${event} to room ${room.id}`);
}


export async function clearAll(userId, message) {
      const roomId = userRoom.get(userId);
      const user2 = Array.from(userRoom.keys()).find(id => userRoom.get(id) === roomId);
      
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
            await broadcast(room, "game", "paused", {
                reason: "player-disconnected",
                userId: userId
            });
          } else if (message === 'leave') {
            if (room.started && !room.state.gameOver) {
                console.log(`User ${user2} left room ${user2.id}`);
                const players = Array.from(room.players);
                if (players.length === 2) {
                    room.winnerId = user2;
                    await saveGametoDbServices(room);
                }
            }
            await broadcastLeft(room, userId);
            userRoom.delete(userId);
            room.players.delete(userId);
            room.sockets.delete(userId);
          }
        }
        console.log('roomId:', roomId);
      }
}
