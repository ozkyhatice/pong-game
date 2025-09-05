import { updateBall } from './start.utils.js';
import { stateGame } from '../controller/game.controller.js';

const FPS = 60;
const FRAME_INTERVAL = 1000 / FPS;

export function startGameLoop(room, connection) {
    if (room.loop) {
        stopGameLoop(room); // if there is an existing loop, clear it first
    }
    
    room.loop = setInterval(async () => {
        try {
            if (shouldUpdateGame(room)) {
                await updateGameState(room, connection);
            }
        } catch (error) {
            stopGameLoop(room);
        }
    }, FRAME_INTERVAL);

    return room.loop;
}

export function stopGameLoop(room) {
    if (room.loop) {
        clearInterval(room.loop);
        room.loop = null;
    }
}

export function pauseGame(room) {
    room.state.paused = true;
}

export function resumeGame(room) {
    room.state.paused = false;
}

function shouldUpdateGame(room) {
    return !room.state.gameOver && !room.state.paused && room.started;
}

async function updateGameState(room, connection) {
    await updateBall(room, connection);
    await stateGame({ roomId: room.id }, room.players[0]); // Already an array, get first player
}
