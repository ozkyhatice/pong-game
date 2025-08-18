import { updateBall } from './start.utils.js';
import { stateGame } from '../controller/game.controller.js';

const FPS = 60;
const FRAME_INTERVAL = 1000 / FPS;

export function startGameLoop(room, connection) {
    if (room.loop) {
        stopGameLoop(room); // Eğer varolan bir loop varsa önce onu temizle
    }
    
    room.loop = setInterval(() => {
        try {
            if (shouldUpdateGame(room)) {
                updateGameState(room, connection);
            }
        } catch (error) {
            console.error('Error in game loop:', error);
            stopGameLoop(room);
        }
    }, FRAME_INTERVAL);

    console.log(`Game loop started for room ${room.id}`);
    return room.loop;
}

export function stopGameLoop(room) {
    if (room.loop) {
        clearInterval(room.loop);
        room.loop = null;
        console.log(`Game loop stopped for room ${room.id}`);
    }
}

export function pauseGame(room) {
    room.state.paused = true;
    console.log(`Game paused in room ${room.id}`);
}

export function resumeGame(room) {
    room.state.paused = false;
    console.log(`Game resumed in room ${room.id}`);
}

function shouldUpdateGame(room) {
    return !room.state.gameOver && !room.state.paused && room.started;
}

function updateGameState(room, connection) {
    updateBall(room, connection);
    stateGame({ roomId: room.id }, Array.from(room.players)[0]); // İlk player'ı kullan
}
