import { createRoom, sendMessage, checkJoinable, addPlayerToRoom, displayRoomState} from "../utils/game.utils.js";
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


export async function joinGame(data, userId, connection) {
    let room;
    if (data.roomId) {
        room = rooms.get(data.roomId);
    }
    else {
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
    
    // Odaya katılım kontrolü
    const canJoin = await checkJoinable(data, room, userId, connection);
    if (!canJoin) {
        return; // Katılım uygun değilse işlemi sonlandır (hata mesajı checkJoinable'da gönderildi)
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
    await displayRoomState(room);
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