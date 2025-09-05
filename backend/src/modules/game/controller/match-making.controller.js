import {rooms, userRoom, startGame} from '../controller/game.controller.js'
import { sendMessage, createRoom, addPlayerToRoom } from '../utils/join.utils.js';


export const matchmakingQueue = new Map(); 
export const matchmakingStatus = new Map(); 


// join matchmaking queue
export async function joinMatchmakingQueue(data, userId, connection) {
    
    
    const existingRoomId = userRoom.get(userId);
    if (existingRoomId) {
        await sendMessage(connection, 'game', 'error', {
            message: `You are already in room ${existingRoomId}. Leave first.`
        });
        return;
    }

    
    if (matchmakingStatus.has(userId)) {
        await sendMessage(connection, 'game', 'error', {
            message: 'You are already in matchmaking queue'
        });
        return;
    }

    
    const queueEntry = {
        userId,
        connection,
        joinTime: Date.now()
    };

    
    matchmakingQueue.set(userId, queueEntry);
    
    
    matchmakingStatus.set(userId, {
        status: 'searching',
        joinTime: Date.now()
    });


    await sendMessage(connection, 'game', 'matchmaking-joined', {
        position: matchmakingQueue.size,
        message: `Joined matchmaking queue`
    });

    
    await attemptMatchmaking();
}


// leave matchmaking queue
export async function leaveMatchmakingQueue(data, userId, connection) {
    if (!matchmakingStatus.has(userId)) {
        await sendMessage(connection, 'game', 'error', {
            message: 'You are not in any matchmaking queue'
        });
        return;
    }

    matchmakingQueue.delete(userId);
    matchmakingStatus.delete(userId);


    await sendMessage(connection, 'game', 'matchmaking-left', {
        message: `Left matchmaking queue`
    });
}

export async function cancelMatchmaking(data, userId, connection) {
    await leaveMatchmakingQueue(data, userId, connection);
}

export async function getMatchmakingStatus(data, userId, connection) {
    const status = matchmakingStatus.get(userId);
    
    if (!status) {
        await sendMessage(connection, 'game', 'matchmaking-status', {
            inQueue: false,
            message: 'Not in any matchmaking queue'
        });
        return;
    }
    
    const waitTime = Date.now() - status.joinTime;

    await sendMessage(connection, 'game', 'matchmaking-status', {
        inQueue: true,
        waitTime: Math.floor(waitTime / 1000),
        status: status.status
    });
}


// try to find a match for players
async function attemptMatchmaking() {
    if (matchmakingQueue.size < 2) return;

    
    const players = Array.from(matchmakingQueue.values()).slice(0, 2);
    const [player1, player2] = players;

    
    matchmakingQueue.delete(player1.userId);
    matchmakingQueue.delete(player2.userId);
    matchmakingStatus.delete(player1.userId);
    matchmakingStatus.delete(player2.userId);


    try {
        
        const roomId = await createRoom(player1.userId, player1.connection, rooms, null, null, true);
        const room = rooms.get(roomId);

        if (!room) {
            throw new Error('Failed to create room for matchmaking');
        }

        
        await addPlayerToRoom(room, player2.userId, player2.connection);

        
        await sendMessage(player1.connection, 'game', 'match-found', {
            roomId,
            opponent: player2.userId,
            players: room.players, 
            message: 'Match found! Game starting...'
        });

        await sendMessage(player2.connection, 'game', 'match-found', {
            roomId,
            opponent: player1.userId,
            players: room.players, 
            message: 'Match found! Game starting...'
        });

        
        setTimeout(async () => {
            try {
                await startGame({ roomId }, player1.userId, player1.connection);
            } catch (error) {
            }
        }, 5000); 

    } catch (error) {
        
        
        matchmakingQueue.set(player1.userId, player1);
        matchmakingQueue.set(player2.userId, player2);
        matchmakingStatus.set(player1.userId, { status: 'searching', joinTime: player1.joinTime });
        matchmakingStatus.set(player2.userId, { status: 'searching', joinTime: player2.joinTime });

        
        await sendMessage(player1.connection, 'game', 'error', {
            message: 'Failed to create match. Please try again.'
        });
        await sendMessage(player2.connection, 'game', 'error', {
            message: 'Failed to create match. Please try again.'
        });
    }
}