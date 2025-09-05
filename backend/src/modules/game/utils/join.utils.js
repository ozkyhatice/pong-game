import { v4 as uuidv4 } from 'uuid';
import { userRoom } from '../controller/game.controller.js';
import { sanitizeGameInput } from './security.utils.js';

export async function generateRoomId() {
    return uuidv4();
}


// send message to websocket connection
export async function sendMessage(connection, type, event, data = {}) {
  try {
    
    const sanitizedData = sanitizeGameInput(data);
    
    if (connection && connection.readyState === connection.OPEN) {
      connection.send(JSON.stringify({ type, event, data: sanitizedData }));
    }
  } catch (error) {
  }
}



// create a new game room
export async function createRoom(userId, connection, rooms, tournamentId = null, round = null, isMatchmaking = false) {
    const roomId = await generateRoomId();
    const room = {
        id: roomId,
        players: [userId], 
        sockets: new Map([[userId, connection]]),
        state: {
            ball: {
                x: 400,                  
                y: 200,                  
                vx: Math.random() > 0.5 ? 5 : -5,  
                vy: 0                    
            },
            paddles: {
                [userId]: { y: 150 }    
            },
            score: {
                [userId]: 0             
            },
            gameOver: false,           
            paused: false,
        },
        loop: null,                  
        createdAt: Date.now(),       
        started: false,
        endDate: null,               
        winnerId: null,              
        tournamentId: tournamentId,  
        round: round,                
        matchId: null,               
        ballDirectionCounter: 0,     
        isMatchmaking: false 
    };
    rooms.set(roomId, room); 
    userRoom.set(userId, roomId); 
    return roomId;
}




// add player to game room
export async function addPlayerToRoom(room, userId, connection) {
  room.players.push(userId); 
  room.sockets.set(userId, connection);
  
  
  if (!room.state.paddles[userId]) {
    room.state.paddles[userId] = { y: 150 }; 
  }
  
  if (!room.state.score[userId]) {
    room.state.score[userId] = 0;
  }
  userRoom.set(userId, room.id); 
}

export async function checkJoinable(data, room, userId, connection) {
    if (!room) {
        await sendMessage(connection, 'game', 'room-not-found', {
            roomId: data.roomId
        });
        return false;
    }
    if (room.players.includes(userId)) { 
        await sendMessage(connection, 'game', 'already-joined', {
            roomId: room.id
        });
        return false
    }
    if (room.players.length >= 2) { 
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

