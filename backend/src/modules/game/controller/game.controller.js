import { createRoom, sendMessage, checkJoinable, addPlayerToRoom, displayRoomState} from "../utils/join.utils.js";
import { updateBall, broadcastGameState} from "../utils/start.utils.js";
import { saveGametoDbServices } from "../services/game.service.js";
const rooms = new Map();
export async function handleGameMessage(msgObj, userId, connection) {

    const { event, data} = msgObj;
    const handler = eventHandlers[event];
    if (!handler) {
        throw new Error(`No handler for event: ${event}`);
    }
    return await handler(data, userId, connection);
}
const eventHandlers = {
    join: joinGame,
    move: handlePlayerMove,
    start: startGame,
    state: stateGame,
    score: scoreGame,

};



// joining a game room
// type: game
// event: join
// data: { roomId: "xxxx" } or { roomId: null }
export async function joinGame(data, userId, connection) {
    let room;
    // if roomId already exists, get it
    if (data.roomId) {
        room = rooms.get(data.roomId);
    }
    else {
        // if roomId does not exist, create a new room
        const roomId = await createRoom(userId, connection, rooms);
        room = rooms.get(roomId);
        if (!room) {
            throw new Error(`Failed to create or join room for user ${userId}`);
        }
        await sendMessage(connection, 'game', 'room-created', {
            roomId: room.id
        });
        return;
    }
    
    // check rules of joining
    const canJoin = await checkJoinable(data, room, userId, connection);
    if (!canJoin) {
        return; // if joining is not allowed, end the process (error message sent in checkJoinable)
    }
    // add player to room
    await addPlayerToRoom(room, userId, connection);
    // Notify the user that they have joined the room
    await sendMessage(connection, 'game', 'joined', {
        roomId: room.id,
        players: Array.from(room.players),
        message: `User ${userId} joined the game`
    });
    if (room.players.size === 2 && !room.started) {
        console.log('the game will start');
    }
    // Display the current state of the room for debugging
    await displayRoomState(room);
}




// type: game
// event: start
// data: { roomId: "xxxx" }

export async function startGame(data, userId, connection) {
    const room = rooms.get(data.roomId);
    // Check if the room exists and is not already started
    if (!room || room.started) {
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: room not found or already started`
        });
        return;
    }
    if (room.players.size < 2) {
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: not enough players`
        });
        return;
    }
    room.started = true;
    // Initialize paddles and scores for both players
    room.loop = setInterval(() => {
        // Update the ball position and check for collisions
        updateBall(room, connection);
        // State update gönder
        stateGame({ roomId: room.id }, userId);        
    }, 1000 / 60); // 60 FPS
    await sendMessage(connection, 'game', 'game-started', {
        roomId: room.id,
        players: Array.from(room.players),
        message: `Game started by user ${userId}`
    });
}
export async function scoreGame(data, userId, connection) {
    console.log(`User ${userId} scored:`, data);
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    console.log('room state before score:', room.state);
    
    // Skoru güncelle (+1 artır)
    room.state.score[userId] = room.state.score[userId] + 1;
    
    console.log(`User ${userId} new score: ${room.state.score[userId]}`);
    console.log(`All scores:`, room.state.score);
    
    // 5 skor kontrolü
    if (room.state.score[userId] >= 5) {
        room.state.gameOver = true;
        room.started = false;
        room.winnerId = userId; // kazananı belirle
        room.endDate = new Date(); // bitiş tarihini belirle
        
        // Game loop'u durdur
        if (room.loop) {
            clearInterval(room.loop);
            room.loop = null;
        }
        
        console.log(`Game over! Winner: User ${userId}, Final scores:`, room.state.score);
        console.log(`Game ended at: ${room.endDate}`);
        
        // DB'ye kaydet
        try {
            await saveGametoDbServices(room);
            console.log(`Game data saved to DB for room ${room.id}`);
        } catch (error) {
            console.error('Error saving game to DB:', error);
        }
        
        // Tüm oyunculara game-over gönder
        for (const [playerId, socket] of room.sockets) {
            await sendMessage(socket, 'game', 'game-over', {
                roomId: room.id,
                winner: userId,
                finalScore: room.state.score
            });
        }
    } else {
        // Oyun devam ediyor, score update gönder
        for (const [playerId, socket] of room.sockets) {
            await sendMessage(socket, 'game', 'score-update', {
                roomId: room.id,
                scores: room.state.score,
                lastScorer: userId
            });
        }
    }
}
export async function handlePlayerMove(data, userId) {
    const room = rooms.get(data.roomId);
    if (!room) {
        console.error(`Room not found for user ${userId}`);
        return;
    }
    
    // Oyuncunun paddle'ını güncelle
    if (room.state.paddles[userId]) {
        room.state.paddles[userId].y = data.y;
        console.log(`User ${userId} moved paddle to y=${data.y}`);
        
        // Oyun durumunu güncelle ve tüm oyunculara gönder
        await stateGame(data, userId);
    } else {
        console.error(`Paddle not found for user ${userId}`);
    }
}
export async function stateGame(data, userId) {
    const room = rooms.get(data.roomId);
    if (!room) {
        console.error(`Room not found for user ${userId}`);
        return;
    }
    
    // Oyun durumunu güncelle
    const stateData = {
        ball: room.state.ball,
        paddles: room.state.paddles,
        score: room.state.score,
        gameOver: room.state.gameOver,
    };
    
    // Tüm oyunculara oyun durumunu gönder
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'state-update', {
            roomId: room.id,
            state: stateData
        });
    }
}