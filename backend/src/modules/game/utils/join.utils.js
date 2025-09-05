import { v4 as uuidv4 } from 'uuid';
import { userRoom } from '../controller/game.controller.js';
import { sanitizeGameInput } from './security.utils.js';

export async function generateRoomId() {
    return uuidv4();
}

export async function sendMessage(connection, type, event, data = {}) {
  try {
    // Sanitize data before sending to prevent XSS attacks
    const sanitizedData = sanitizeGameInput(data);
    
    if (connection && connection.readyState === connection.OPEN) {
      connection.send(JSON.stringify({ type, event, data: sanitizedData }));
    }
  } catch (error) {
    console.log('Error sending message:', error);
  }
}


export async function createRoom(userId, connection, rooms, tournamentId = null, round = null, isMatchmaking = false) {
    const roomId = await generateRoomId();
    const room = {
        id: roomId,
        players: [userId], // Changed from Set to Array to preserve join order
        sockets: new Map([[userId, connection]]),
        state: {
            ball: {
                x: 400,                  // Canvas center X (800/2)
                y: 200,                  // Canvas center Y (400/2) 
                vx: Math.random() > 0.5 ? 5 : -5,  // Random initial direction
                vy: 0                    // Ball starts horizontal
            },
            paddles: {
                [userId]: { y: 150 }    // Paddle center (400/2 - 100/2 = 150)
            },               // userId -> { y: konum }
            score: {
                [userId]: 0             // location of first player's paddle
            },                 // userId -> number
            gameOver: false,           // game state
            paused: false,
        },
        loop: null,                  // game loop interval
        createdAt: Date.now(),       // room creation timestamp
        started: false,
        endDate: null,               
        winnerId: null,              
        tournamentId: tournamentId,  // tournament ID (if it is a tournament match)
        round: round,                // round info (if it is a tournament match)
        matchId: null,               // Match ID
        ballDirectionCounter: 0,     // ball direction change counter
        isMatchmaking: false // is it created via matchmaking
    };
    rooms.set(roomId, room); // add to global rooms map
    userRoom.set(userId, roomId); // user - room mapping
    return roomId;
}

export async function displayRoomState(room) {
    console.log(`Room ID: ${room.id}`);
    console.log(`Players: ${room.players.join(', ')}`); // Array join instead of Set conversion
    console.log(`Sockets: ${Array.from(room.sockets.keys()).join(', ')}`);
    console.log(`State:`, room.state);
    console.log(`Created At: ${new Date(room.createdAt).toLocaleString()}`);
    console.log(`Started: ${room.started}`);
    console.log('-----------------------------');
}

export async function addPlayerToRoom(room, userId, connection) {
  room.players.push(userId); // Push to array instead of Set.add()
  room.sockets.set(userId, connection);
  
  // initialize paddle and score for the new player
  if (!room.state.paddles[userId]) {
    room.state.paddles[userId] = { y: 150 }; // Paddle center (400/2 - 100/2 = 150)
  }
  
  if (!room.state.score[userId]) {
    room.state.score[userId] = 0;
  }
  userRoom.set(userId, room.id); // Update user-room mapping
}

export async function checkJoinable(data, room, userId, connection) {
    if (!room) {
        await sendMessage(connection, 'game', 'room-not-found', {
            roomId: data.roomId
        });
        return false;
    }
    if (room.players.includes(userId)) { // Array includes instead of Set has
        await sendMessage(connection, 'game', 'already-joined', {
            roomId: room.id
        });
        return false
    }
    if (room.players.length >= 2) { // Array length instead of Set size
        await sendMessage(connection, 'game', 'room-full', {
            roomId: room.id
        });
        return false;
    }
    if (room.started) {
        await sendMessage(connection, 'game', 'game-already-started', {
            roomId: room.id
        });
        return false;
    }
    return true;
}

