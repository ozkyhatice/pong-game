import { generateRoomId , sendMessage} from "../utils/game.utils.js";
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

/*
{
  "type": "game",
  "event": "join",
  "data": {
    "roomId": "AB12CD"   // Zaten var olan oda ID’si veya yeni oda için boş olabilir
  }
}
*/



export async function createRoom(userId, connection) {
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
    console.log(`Room created with ID: ${roomId} for user ${userId}`);
    return roomId;
}

export async function addPlayerToRoom(room, userId, connection) {
  room.players.add(userId);
  room.sockets.set(userId, connection);
}
export async function joinGame(data, userId, connection) {
    let room;
    if (data.roomId) {
        room = rooms.get(data.roomId);
    }
    else {
        const roomId = await createRoom(userId, connection);
        room = rooms.get(roomId);
        if (!room) {
            throw new Error(`Failed to create or join room for user ${userId}`);
        }
        await sendMessage(connection, 'game', 'room-created', {
            roomId: room.id
        });
        return;
    }
    if (room.players.has(userId)) {
        await sendMessage(connection, 'game', 'already-joined', {
            roomId: room.id
        });
        return;
    }
    if (room.players.size >= 2) {
        await sendMessage(connection, 'game', 'room-full', {
            roomId: room.id
        });
        return;
    }
    await addPlayerToRoom(room, userId, connection);
    await sendMessage(connection, 'game', 'joined', {
        roomId: room.id,
        players: Array.from(room.players),
        message: `User ${userId} joined the game`
    });
    if (room.players.size === 2 && !room.started) {
        console.log('the game will start');
    }
    console.log(`User ${userId} joined the game`);
}
export async function startGame(data, userId) {
    console.log(`User ${userId} started the game`);
}
export async function handlePlayerMove(data, userId) {
    console.log(`User ${userId} moved:`, data);
}
export async function stateGame(data, userId) {
    console.log(`User ${userId} requested game state:`, data);
}
export async function scoreGame(data, userId) {
    console.log(`User ${userId} scored:`, data);
}