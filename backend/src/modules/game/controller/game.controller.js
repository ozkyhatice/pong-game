import { createRoom, sendMessage, checkJoinable, addPlayerToRoom, displayRoomState} from "../utils/join.utils.js";
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
export async function startGame(data, userId, connection) {
    console.log(`User ${userId} started the game`);
    const room = rooms.get(data.roomId);
    if (!room || room.started) {
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: room not found or already started`
        });
        return;
    }
    room.started = true;
    // room.loop = setInterval(() => {
    //     updateBall(room);
    //     broadcastGameState(room);   
    // }, 1000 / 60); // 60 FPS
    await sendMessage(connection, 'game', 'game-started', {
        roomId: room.id,
        players: Array.from(room.players),
        message: `Game started by user ${userId}`
    });
    console.log(`Game started in room ${room.id} by user ${userId}`);
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