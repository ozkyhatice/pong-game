import { createRoom, sendMessage, checkJoinable, addPlayerToRoom} from "../utils/join.utils.js";
import { broadcast, clearAll } from "../utils/end.utils.js";
import { startGameLoop, stopGameLoop, pauseGame, resumeGame } from "../utils/game-loop.utils.js";
import { getClientById } from "../../../websocket/services/client.service.js";
import { joinMatchmakingQueue, leaveMatchmakingQueue, cancelMatchmaking, getMatchmakingStatus } from "./match-making.controller.js";
import { getMatchHistoryByUserId } from "../services/game.service.js";
import { sanitizeGameInput, validateGameInput, isValidUserId } from "../utils/security.utils.js";
import { isUserBlocked } from "../../friend/service/friend.service.js";

export const rooms = new Map();
export const userRoom = new Map(); 

// handle game websocket messages
export async function handleGameMessage(msgObj, userId, connection) {

    
    if (!isValidUserId(userId)) {
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }

    const { event, data } = msgObj;

    
    const sanitizedData = sanitizeGameInput(data);

    
    const validation = validateGameInput(sanitizedData);
    if (!validation.isValid) {
        await sendMessage(connection, 'game', 'error', {
            message: validation.message
        });
        return;
    }

    const handler = eventHandlers[event];
    if (!handler) {
        throw new Error(`No handler for event: ${event}`);
    }
    return await handler(sanitizedData, userId, connection);
}
const eventHandlers = {
    join: joinGame,
    move: handlePlayerMove,
    start: startGame,
    state: stateGame,
    score: scoreGame,
    leave: leaveGame,
    ready: handlePlayerReady,
    reconnect: handleReconnectRequest,
    history: getMatchHistoryByUserId,
    'game-invite': handleGameInvite,
    'invite-accepted': handleInviteAccepted,
    
    'matchmaking-join-queue': joinMatchmakingQueue,
    'matchmaking-leave-queue': leaveMatchmakingQueue,
    'matchmaking-cancel': cancelMatchmaking,
    'matchmaking-status': getMatchmakingStatus,
};

async function handleReconnectRequest(data, userId, connection) {
    await handleReconnection(connection, userId);
}





// join a game room
export async function joinGame(data, userId, connection) {
    
    const existingRoomId = userRoom.get(userId);
    if (existingRoomId) {
        await sendMessage(connection, 'game', 'error', {
            message: `You are already in room ${existingRoomId}. Leave your current room first.`
        });
        return;
    }

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

    
    const canJoin = await checkJoinable(data, room, userId, connection);
    if (!canJoin) {
        return; 
    }
    
    await addPlayerToRoom(room, userId, connection);
    
    await sendMessage(connection, 'game', 'joined', {
        roomId: room.id,
        players: room.players, 
        message: `User ${userId} joined the game`
    });
    if (room.players.length === 2 && !room.started) { 
    }
    
}








// start a game
export async function startGame(data, userId, connection) {
    const room = rooms.get(data.roomId);

    
    if (!room) {
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: room not found`
        });
        return;
    }

    
    if (room.started) {
        
        await sendMessage(connection, 'game', 'game-started', {
            roomId: room.id,
            players: room.players, 
            message: `Game already in progress`
        });
        return;
    }

    
    if (room.players.length < 2) { 
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: not enough players`
        });
        return;
    }

    
    if (!room.players.includes(userId)) { 
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: you are not in this room`
        });
        return;
    }

    
    room.started = true;

    startGameLoop(room, connection);

    
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'game-started', {
            roomId: room.id,
            players: room.players, 
            message: `Game started by user ${userId}`
        });
    }
}

export async function scoreGame(data, userId, connection) {
    const room = rooms.get(data.roomId);
    if (!room) return;


    
    room.state.score[userId] = room.state.score[userId] + 1;



}
export async function handlePlayerMove(data, userId) {
    const room = rooms.get(data.roomId);
    if (!room) {
        return;
    }

    if (room.state.paddles[userId]) {
        const oldY = room.state.paddles[userId].y;

        const CANVAS_HEIGHT = 400;
        const PADDLE_HEIGHT = 100;

        
        const targetY = Math.max(1, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 1, data.y));

        
        room.state.paddles[userId].y = targetY;

        
        await stateGame(data, userId);
    }
}
export async function stateGame(data, userId) {
    const room = rooms.get(data.roomId);
    if (!room) {
        return;
    }

    
    const stateData = {
        ball: room.state.ball,
        paddles: room.state.paddles,
        score: room.state.score,
        gameOver: room.state.gameOver,
    };

    
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'state-update', {
            roomId: room.id,
            state: stateData
        });
    }
}

// leave a game
export async function leaveGame(data, userId, connection) {
    await clearAll(userId, 'leave'); 

}

export async function handlePlayerReady(data, userId, connection) {
    const roomId = userRoom.get(userId);
    if (!roomId) {
        await sendMessage(connection, 'game', 'error', {
            message: 'You are not in any room'
        });
        return;
    }

    const room = rooms.get(roomId);
    if (!room) {
        await sendMessage(connection, 'game', 'error', {
            message: 'Room not found'
        });
        return;
    }

    
    if (!room.readyPlayers) {
        room.readyPlayers = new Set();
    }

    
    room.readyPlayers.add(userId);

    
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'player-ready', {
            roomId: room.id,
            readyPlayerId: userId,
            readyPlayers: Array.from(room.readyPlayers),
            totalPlayers: room.players.length 
        });
    }

    
    if (room.readyPlayers.size === 2 && room.players.length === 2) { 

        
        for (const [playerId, socket] of room.sockets) {
            await sendMessage(socket, 'game', 'all-ready', {
                roomId: room.id,
                message: 'All players are ready! Game can now start.'
            });
        }
    }
}


export async function handleReconnection(connection, userId) {
    
    if (!isValidUserId(userId)) {
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }

    const roomId = userRoom.get(userId);

    
    const { initDB } = await import('../../../config/db.js');
    const db = await initDB();

    
    const user = await db.get('SELECT currentTournamentId FROM users WHERE id = ?', [userId]);

    
    if (roomId) {
        const room = rooms.get(roomId);
        if (room && room.started) {

            
            room.sockets.set(userId, connection);

            
            if (room.disconnectionTimeout) {
                clearTimeout(room.disconnectionTimeout);
                room.disconnectionTimeout = null;
            }

            
            if (room.state.paused) {
                resumeGame(room);

                
                if (!room.loop) {
                    startGameLoop(room, connection);
                }
            }

            
            sendMessage(connection, 'navigation', 'redirect', {
                page: 'remote-game',
                reason: 'game_reconnection'
            });

            
            sendMessage(connection, 'game', "room-state", {
                roomId: room.id,
                state: room.state,
                players: room.players 
            });

            
            broadcast(room, 'game', 'reconnected', {
                userId: userId,
                message: `Player ${userId} has reconnected! Game resuming...`
            });

            return;
        }
    }

    
    if (user && user.currentTournamentId) {

        sendMessage(connection, 'navigation', 'redirect', {
            page: 'tournament',
            reason: 'tournament_reconnection'
        });

        return;
    }

    
    if (!roomId) {
        return;
    }

    
}

export async function handleGameInvite(data, userId, connection) {
    
    if (!isValidUserId(userId) || !isValidUserId(data.receiverId)) {
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }

    const { receiverId, senderUsername } = sanitizeGameInput(data);


    
    const isBlocked = await isUserBlocked(userId, receiverId);
    const isBlockedReverse = await isUserBlocked(receiverId, userId);

    if (isBlocked || isBlockedReverse) {
        await sendMessage(connection, 'game', 'error', {
            message: 'Cannot send game invite to this user'
        });
        return;
    }

    
    const recipientClient = getClientById(receiverId);
    if (!recipientClient) {
        await sendMessage(connection, 'game', 'error', {
            message: `User ${receiverId} is not online`
        });
        return;
    }

    
    const inviteMessage = {
        type: 'game',
        event: 'game-invite',
        data: {
            senderId: userId,
            receiverId: receiverId,
            senderUsername: senderUsername || 'Unknown'
        }
    };

    recipientClient.send(JSON.stringify(inviteMessage));
}

export async function handleInviteAccepted(data, userId, connection) {
    
    if (!isValidUserId(userId) || !isValidUserId(data.senderId)) {
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }

    const { senderId } = sanitizeGameInput(data);


    
    const senderClient = getClientById(senderId);
    if (!senderClient) {
        await sendMessage(connection, 'game', 'error', {
            message: `Inviter is no longer online`
        });
        return;
    }

    
    const accepterInRoom = userRoom.get(userId);
    const senderInRoom = userRoom.get(senderId);

    if (accepterInRoom) {
        await sendMessage(connection, 'game', 'error', {
            message: `You are already in room ${accepterInRoom}`
        });
        return;
    }

    if (senderInRoom) {
        await sendMessage(connection, 'game', 'error', {
            message: `Inviter is already in another room`
        });
        return;
    }

    
    const roomId = await createRoom(senderId, senderClient, rooms);
    const room = rooms.get(roomId);

    if (!room) {
        await sendMessage(connection, 'game', 'error', {
            message: `Failed to create room`
        });
        return;
    }

    
    await addPlayerToRoom(room, userId, connection);

    
    await sendMessage(connection, 'game', 'room-created', {
        roomId: room.id,
        players: room.players, 
        message: 'Game room created! You can now start the game.'
    });

    await sendMessage(senderClient, 'game', 'invite-accepted', {
        roomId: room.id,
        acceptedBy: userId,
        players: room.players, 
        message: 'Your game invitation was accepted! Room created.'
    });

}


export async function getMatchHistory(request, reply) {
    const { userId } = request.params;

    
    if (!isValidUserId(userId)) {
        return reply.code(400).send({ error: 'Invalid user ID format' });
    }

    try {
        const matches = await getMatchHistoryByUserId(userId);

        
        const formattedMatches = matches.map(match => ({
            id: match.id,
            player1Id: match.player1Id,
            player2Id: match.player2Id,
            player1Score: match.player1Score,
            player2Score: match.player2Score,
            winnerId: match.winnerId,
            startedAt: match.startedAt,
            endedAt: match.endedAt,
            tournamentId: match.tournamentId,
            round: match.round
        }));

        reply.send({
            matches: formattedMatches,
            totalMatches: formattedMatches.length
        });
    } catch (error) {
        reply.code(500).send({ error: 'Internal Server Error' });
    }
}
