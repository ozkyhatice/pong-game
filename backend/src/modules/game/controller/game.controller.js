import { createRoom, sendMessage, checkJoinable, addPlayerToRoom, displayRoomState} from "../utils/join.utils.js";
import { broadcast, clearAll } from "../utils/end.utils.js";
import { startGameLoop, stopGameLoop, pauseGame, resumeGame } from "../utils/game-loop.utils.js";
import { getClientById } from "../../../websocket/services/client.service.js";
import { joinMatchmakingQueue, leaveMatchmakingQueue, cancelMatchmaking, getMatchmakingStatus } from "./match-making.controller.js";
import { getMatchHistoryByUserId } from "../services/game.service.js";
import { sanitizeGameInput, validateGameInput, isValidUserId } from "../utils/security.utils.js";
import { isUserBlocked } from "../../friend/service/friend.service.js";

export const rooms = new Map();
export const userRoom = new Map(); // userId -> roomId

export async function handleGameMessage(msgObj, userId, connection) {
    console.log(`🎮 GAME: Message received -> User: ${userId}, Event: ${msgObj.event}`);
    
    // Validate userId to prevent injection
    if (!isValidUserId(userId)) {
        console.error(`🛡️ SECURITY: Invalid user ID format -> ${userId}`);
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }
    
    const { event, data } = msgObj;
    
    // Sanitize input data to prevent XSS attacks
    const sanitizedData = sanitizeGameInput(data);
    
    // Validate input data to prevent SQL injection
    const validation = validateGameInput(sanitizedData);
    if (!validation.isValid) {
        console.error(`🛡️ SECURITY: Input validation failed -> ${validation.message}`);
        await sendMessage(connection, 'game', 'error', {
            message: validation.message
        });
        return;
    }
    
    const handler = eventHandlers[event];
    if (!handler) {
        console.error(`❌ GAME: No handler for event: ${event}`);
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
    // match-making
    'matchmaking-join-queue': joinMatchmakingQueue,
    'matchmaking-leave-queue': leaveMatchmakingQueue,
    'matchmaking-cancel': cancelMatchmaking,
    'matchmaking-status': getMatchmakingStatus,
};

async function handleReconnectRequest(data, userId, connection) {
    await handleReconnection(connection, userId);
}

// joining a game room
// type: game
// event: join
// data: { roomId: "xxxx" } or { roomId: null }
export async function joinGame(data, userId, connection) {
    // Check if user is already in a room
    const existingRoomId = userRoom.get(userId);
    if (existingRoomId) {
        await sendMessage(connection, 'game', 'error', {
            message: `You are already in room ${existingRoomId}. Leave your current room first.`
        });
        return;
    }

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
        console.log(`🎮 GAME READY: 2 players joined -> Room: ${room.id}`);
    }
    // Display the current state of the room for debugging
    await displayRoomState(room);
}




// type: game
// event: start
// data: { roomId: "xxxx" }

export async function startGame(data, userId, connection) {
    const room = rooms.get(data.roomId);
    
    // Check if the room exists
    if (!room) {
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: room not found`
        });
        console.warn(`🔍 START ERROR: Room not found -> User: ${userId}, Room: ${data.roomId}`);
        return;
    }
    
    // Check if already started (race condition protection)
    if (room.started) {
        console.log(`⚠️ START WARNING: Game already started -> User: ${userId}, Room: ${room.id}`);
        // Don't send error to user, just broadcast current state
        await sendMessage(connection, 'game', 'game-started', {
            roomId: room.id,
            players: Array.from(room.players),
            message: `Game already in progress`
        });
        return;
    }
    
    // Check player count
    if (room.players.size < 2) {
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: not enough players`
        });
        console.warn(`👥 START ERROR: Not enough players -> Room: ${room.id}, Players: ${room.players.size}`);
        return;
    }
    
    // Check if user is in the room
    if (!room.players.has(userId)) {
        await sendMessage(connection, 'game', 'error', {
            message: `Cannot start game: you are not in this room`
        });
        console.warn(`🚫 START ERROR: User not in room -> User: ${userId}, Room: ${room.id}`);
        return;
    }
    
    // Set started flag and start game
    room.started = true;
    console.log(`🎮 GAME START: Game started -> User: ${userId}, Room: ${room.id}, Players: ${Array.from(room.players).join(', ')}`);
    
    startGameLoop(room, connection);
    
    // Broadcast to all players in the room
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'game-started', {
            roomId: room.id,
            players: Array.from(room.players),
            message: `Game started by user ${userId}`
        });
    }
}

export async function scoreGame(data, userId, connection) {
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    
    // Skoru güncelle (+1 artır)
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
        
        // Direct position update with boundary safety margins
        const targetY = Math.max(1, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 1, data.y));
        
        // Direct assignment for instant response
        room.state.paddles[userId].y = targetY;
        
        // Always update for smoother real-time movement
        await stateGame(data, userId);
    } else {
        console.log(`❌ MOVE ERROR: Paddle not found for user ${userId}`);
    }
}
export async function stateGame(data, userId) {
    const room = rooms.get(data.roomId);
    if (!room) {
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

export async function leaveGame(data, userId, connection) {
    await clearAll(userId, 'leave'); // Clear user-room mapping and broadcast game over if necessary
    
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

    // Initialize ready status if not exists
    if (!room.readyPlayers) {
        room.readyPlayers = new Set();
    }

    // Mark player as ready
    room.readyPlayers.add(userId);
    console.log(`✅ GAME READY: Player ready -> User: ${userId}, Room: ${roomId}`);

    // Broadcast ready status to all players
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'player-ready', {
            roomId: room.id,
            readyPlayerId: userId,
            readyPlayers: Array.from(room.readyPlayers),
            totalPlayers: room.players.size
        });
    }

    // Check if all players are ready (and we have 2 players)
    if (room.readyPlayers.size === 2 && room.players.size === 2) {
        console.log(`🎮 GAME START: All players ready -> Room: ${roomId}`);
        
        // Broadcast that game can start
        for (const [playerId, socket] of room.sockets) {
            await sendMessage(socket, 'game', 'all-ready', {
                roomId: room.id,
                message: 'All players are ready! Game can now start.'
            });
        }
    }
}


export async function handleReconnection(connection, userId) {
    // Validate userId to prevent SQL injection
    if (!isValidUserId(userId)) {
        console.error(`🛡️ SECURITY: Invalid user ID format for reconnection -> ${userId}`);
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }
    
    const roomId = userRoom.get(userId);
    
    // Check if user has active tournament or game to reconnect to
    const { initDB } = await import('../../../config/db.js');
    const db = await initDB();
    
    // Use parameterized query to prevent SQL injection
    const user = await db.get('SELECT currentTournamentId FROM users WHERE id = ?', [userId]);
    
    // If user is in an active game, redirect to remote-game
    if (roomId) {
        const room = rooms.get(roomId);
        if (room && room.started) {
            console.log(`🎮 RECONNECT: User ${userId} has active game in room ${roomId}, redirecting to remote-game`);
            
            // Reconnect the user to the room
            room.sockets.set(userId, connection);
            
            // Cancel disconnection timeout if it exists
            if (room.disconnectionTimeout) {
                console.log(`🔄 GAME RECONNECT: Player reconnected -> User: ${userId}, Room: ${roomId}`);
                clearTimeout(room.disconnectionTimeout);
                room.disconnectionTimeout = null;
            }
            
            // Resume game if paused
            if (room.state.paused) {
                console.log(`▶️ GAME RESUME: Game resuming after reconnect -> User: ${userId}, Room: ${roomId}`);
                resumeGame(room);
                
                // Game loop'u yeniden başlat
                if (!room.loop) {
                    startGameLoop(room, connection);
                }
            }
            
            // Redirect to remote-game page
            sendMessage(connection, 'navigation', 'redirect', {
                page: 'remote-game',
                reason: 'game_reconnection'
            });
            
            // Send current state to reconnected user
            sendMessage(connection, 'game', "room-state", {
                roomId: room.id,
                state: room.state,
                players: Array.from(room.players)
            });
            
            // Notify all users about reconnection
            broadcast(room, 'game', 'reconnected', {
                userId: userId,
                message: `Player ${userId} has reconnected! Game resuming...`
            });
            
            return;
        }
    }
    
    // If user is in tournament but no active game, redirect to tournament page
    if (user && user.currentTournamentId) {
        console.log(`🏆 RECONNECT: User ${userId} is in tournament ${user.currentTournamentId}, redirecting to tournament page`);
        
        sendMessage(connection, 'navigation', 'redirect', {
            page: 'tournament',
            reason: 'tournament_reconnection'
        });
        
        return;
    }
    
    // If no room found, just return (normal case for users not in game)
    if (!roomId) {
        console.warn(`🔍 RECONNECT: User ${userId} not in any room or tournament`);
        return;
    }

    // Display the current state of the room for debugging
    await displayRoomState(room);
}

export async function handleGameInvite(data, userId, connection) {
    // Validate userId and receiverId to prevent SQL injection
    if (!isValidUserId(userId) || !isValidUserId(data.receiverId)) {
        console.error(`🛡️ SECURITY: Invalid user ID format for game invite -> ${userId} or ${data.receiverId}`);
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }
    
    const { receiverId, senderUsername } = sanitizeGameInput(data);
    
    console.log(`Game invite from user ${userId} to user ${receiverId}`);
    
    // Check if either user has blocked the other
    const isBlocked = await isUserBlocked(userId, receiverId);
    const isBlockedReverse = await isUserBlocked(receiverId, userId);
    
    if (isBlocked || isBlockedReverse) {
        await sendMessage(connection, 'game', 'error', {
            message: 'Cannot send game invite to this user'
        });
        return;
    }
    
    // Get recipient's WebSocket connection
    const recipientClient = getClientById(receiverId);
    if (!recipientClient) {
        await sendMessage(connection, 'game', 'error', {
            message: `User ${receiverId} is not online`
        });
        return;
    }
    
    // Send game invitation to recipient
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
    console.log(`📨 GAME INVITE: Invitation sent -> From: ${userId}, To: ${receiverId}`);
}

export async function handleInviteAccepted(data, userId, connection) {
    // Validate userId and senderId to prevent SQL injection
    if (!isValidUserId(userId) || !isValidUserId(data.senderId)) {
        console.error(`🛡️ SECURITY: Invalid user ID format for invite acceptance -> ${userId} or ${data.senderId}`);
        await sendMessage(connection, 'game', 'error', {
            message: 'Invalid user ID format'
        });
        return;
    }
    
    const { senderId } = sanitizeGameInput(data);
    
    console.log(`✅ GAME INVITE: Invitation accepted -> From: ${senderId}, By: ${userId}`);
    
    // Check if both users are still online
    const senderClient = getClientById(senderId);
    if (!senderClient) {
        await sendMessage(connection, 'game', 'error', {
            message: `Inviter is no longer online`
        });
        return;
    }
    
    // Check if users are already in rooms
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
    
    // Create new room with sender (inviter) as the creator
    const roomId = await createRoom(senderId, senderClient, rooms);
    const room = rooms.get(roomId);
    
    if (!room) {
        await sendMessage(connection, 'game', 'error', {
            message: `Failed to create room`
        });
        return;
    }
    
    // Add accepter (current user) to room
    await addPlayerToRoom(room, userId, connection);
    
    // Notify both users
    await sendMessage(connection, 'game', 'room-created', {
        roomId: room.id,
        players: Array.from(room.players),
        message: 'Game room created! You can now start the game.'
    });
    
    await sendMessage(senderClient, 'game', 'invite-accepted', {
        roomId: room.id,
        acceptedBy: userId,
        players: Array.from(room.players),
        message: 'Your game invitation was accepted! Room created.'
    });
    
    console.log(`🏠 ROOM CREATED: Invite room created -> Users: ${userId}, ${senderId}, Room: ${roomId}`);
}

// HTTP endpoint for getting match history
export async function getMatchHistory(request, reply) {
    const { userId } = request.params;

    // Validate userId to prevent injection
    if (!isValidUserId(userId)) {
        console.error(`🛡️ SECURITY: Invalid user ID format in getMatchHistory -> ${userId}`);
        return reply.code(400).send({ error: 'Invalid user ID format' });
    }

    try {
        const matches = await getMatchHistoryByUserId(userId);
        
        // Format the response with additional user details if needed
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
        console.error('Error fetching match history:', error);
        reply.code(500).send({ error: 'Internal Server Error' });
    }
}