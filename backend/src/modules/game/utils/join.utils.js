import { v4 as uuidv4 } from 'uuid';
import { userRoom } from '../controller/game.controller.js';
export async function generateRoomId() {
    return uuidv4();
}

export async function sendMessage(connection, type, event, data = {}) {
  try {
    if (connection && connection.readyState === connection.OPEN) {
      connection.send(JSON.stringify({ type, event, data }));
    } else {
      console.warn(' Tried to send message to closed or invalid connection:', { type, event, data });
    }
  } catch (error) {
    console.error('Error sending message:', error, { type, event, data });
  }
}


export async function createRoom(userId, connection, rooms) {
    const roomId = await generateRoomId();
    const room = {
        id: roomId,
        players: new Set([userId]),
        sockets: new Map([[userId, connection]]),
        state: {
            ball: {
                x: 400,                  // Canvas center X (800/2)
                y: 200,                  // Canvas center Y (400/2) 
                vx: 5,                   // Ball starts moving right
                vy: 0                    // Ball starts horizontal
            },
            paddles: {
                [userId]: { y: 150 }    // Paddle center (400/2 - 100/2 = 150)
            },               // userId -> { y: konum }
            score: {
                [userId]: 0             // İlk oyuncunun skoru
            },                 // userId -> sayı
            gameOver: false,           // Oyun durumu
            paused: false,
        },
        loop: null,                  // setInterval ID’si, oyun döngüsünü durdurmak için
        createdAt: Date.now(),       // Oda oluşturulma zamanı
        started: false,
        endDate: null,               // Oyun bitiş tarihi
        winnerId: null               // Oyun kazananı
    };
    rooms.set(roomId, room);
    userRoom.set(userId, roomId); // Kullanıcı ve oda ilişkisi->connection close için
    return roomId;
}

export async function displayRoomState(room) {
    console.log(`Room ID: ${room.id}`);
    console.log(`Players: ${Array.from(room.players).join(', ')}`);
    console.log(`Sockets: ${Array.from(room.sockets.keys()).join(', ')}`);
    console.log(`State:`, room.state);
    console.log(`Created At: ${new Date(room.createdAt).toLocaleString()}`);
    console.log(`Started: ${room.started}`);
    console.log('-----------------------------');
}

export async function addPlayerToRoom(room, userId, connection) {
  room.players.add(userId);
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
        console.warn(`Room not found for user ${userId}`);
        return false;
    }
    if (room.players.has(userId)) {
        await sendMessage(connection, 'game', 'already-joined', {
            roomId: room.id
        });
        console.warn(`User ${userId} already joined room ${room.id}`);
        return false
    }
    if (room.players.size >= 2) {
        await sendMessage(connection, 'game', 'room-full', {
            roomId: room.id
        });
        console.warn(`Room ${room.id} is full for user ${userId}`);
        return false;
    }
    if (room.started) {
        await sendMessage(connection, 'game', 'game-already-started', {
            roomId: room.id
        });
        console.warn(`Game already started in room ${room.id} for user ${userId}`);
        return false;
    }
    
    // Tüm kontroller geçildi, katılım uygun
    return true;
}

