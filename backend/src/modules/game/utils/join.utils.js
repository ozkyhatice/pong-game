import { v4 as uuidv4 } from 'uuid';
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
                x: 400,                  // Ortada başlat
                y: 300,
                vx: 5,                   // Hız (velocity X)
                vy: 5                    // Hız (velocity Y)
            },
            paddles: {},               // userId -> { y: konum }
            score: {},                 // userId -> sayı
            gameOver: false            // Oyun durumu
        },
        loop: null,                  // setInterval ID’si, oyun döngüsünü durdurmak için
        createdAt: Date.now(),       // Oda oluşturulma zamanı
        started: false,  
    };
    rooms.set(roomId, room);
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

