import { sendMessage } from "./join.utils.js";
import { saveGametoDbServices } from "../services/game.service.js";
import { userRoom } from "../controller/game.controller.js";
import { updateMultipleUserStats } from "../../user/service/user.service.js";
import { processTournamentMatchResult } from "../../tournament/service/tournament.service.js";
import { getUserById } from "../../user/service/user.service.js";
import { metrics } from '../../../plugins/metrics.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const BALL_RADIUS = 8;
const BALL_SPEED = 5;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const PADDLE_SPEED = 15;
const WINNING_SCORE = 5;


// update ball position and handle collisions
export async function updateBall(room, connection) {
    const ball = room.state.ball;
    if (room.players.length < 2) return;

    const [player1Id, player2Id] = room.players;
    const paddle1 = room.state.paddles[player1Id];
    const paddle2 = room.state.paddles[player2Id];

    if (!paddle1 || !paddle2) {
        return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS;
        ball.vy = -ball.vy;
        await broadcastFlashEffect(room, 'border', 3, 1.5);
    } else if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
        ball.y = CANVAS_HEIGHT - BALL_RADIUS;
        ball.vy = -ball.vy;
        await broadcastFlashEffect(room, 'border', 2, 1.5);
    }

    
    if (ball.vx < 0 && 
        ball.x - BALL_RADIUS <= PADDLE_WIDTH && 
        ball.x - BALL_RADIUS > 0 && 
        ball.y + BALL_RADIUS >= paddle1.y && 
        ball.y - BALL_RADIUS <= paddle1.y + PADDLE_HEIGHT) { 

        
        ball.x = PADDLE_WIDTH + BALL_RADIUS; 

        
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const newSpeed = Math.min(currentSpeed * 1.05, BALL_SPEED * 1.8); 

        ball.vx = Math.abs(ball.vx) * (newSpeed / currentSpeed); 

        
        const paddleCenter = paddle1.y + PADDLE_HEIGHT / 2;
        const hitOffset = ball.y - paddleCenter;
        const normalizedOffset = hitOffset / (PADDLE_HEIGHT / 2); 
        ball.vy = normalizedOffset * newSpeed * 0.5; 

        
        await broadcastFlashEffect(room, 'paddle', 0, 1.0);

    }

    
    else if (ball.vx > 0 && 
        ball.x + BALL_RADIUS >= CANVAS_WIDTH - PADDLE_WIDTH && 
        ball.x + BALL_RADIUS < CANVAS_WIDTH && 
        ball.y + BALL_RADIUS >= paddle2.y && 
        ball.y - BALL_RADIUS <= paddle2.y + PADDLE_HEIGHT) { 

        
        ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_RADIUS; 

        
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const newSpeed = Math.min(currentSpeed * 1.05, BALL_SPEED * 1.8); 

        ball.vx = -Math.abs(ball.vx) * (newSpeed / currentSpeed); 

        
        const paddleCenter = paddle2.y + PADDLE_HEIGHT / 2;
        const hitOffset = ball.y - paddleCenter;
        const normalizedOffset = hitOffset / (PADDLE_HEIGHT / 2); 
        ball.vy = normalizedOffset * newSpeed * 0.5; 

        
        await broadcastFlashEffect(room, 'paddle', 1, 1.0);

    }

    
    if (ball.x < -BALL_RADIUS) {
        
        room.state.score[player2Id] += 1;
        
        await broadcastFlashEffect(room, 'score', player2Id, 2.0);
        await broadcastFlashEffect(room, 'border', 0, 2.0); 
        await resetBallAndCheck(room, ball, player2Id);
    }
    else if (ball.x > CANVAS_WIDTH + BALL_RADIUS) {
        
        room.state.score[player1Id] += 1;
        
        await broadcastFlashEffect(room, 'score', player1Id, 2.0);
        await broadcastFlashEffect(room, 'border', 1, 2.0); 
        await resetBallAndCheck(room, ball, player1Id);
    }
}


// reset ball position and check if game is over
async function resetBallAndCheck(room, ball, scoringPlayerId) {
    
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;

    
    if (!room.ballDirectionCounter) {
        room.ballDirectionCounter = 0;
    }

    
    room.ballDirectionCounter++;
    const ballDirection = room.ballDirectionCounter % 2 === 0 ? -1 : 1;

    
    const angle = (Math.random() - 0.5) * Math.PI / 4; 
    ball.vx = ballDirection * BALL_SPEED * Math.cos(angle);
    ball.vy = BALL_SPEED * Math.sin(angle);


    
    if (room.state.score[scoringPlayerId] >= WINNING_SCORE) {
        await endGame(room, scoringPlayerId);
    }
}


// end the game and save results
async function endGame(room, winnerId) {
    room.state.gameOver = true;
    room.winnerId = winnerId;
    room.endDate = new Date();

    const players = Array.from(room.players).sort((a, b) => a - b); 
    const loserScore = room.state.score[players.find(p => p !== winnerId)] || 0;

    
    if (room.loop) {
        clearInterval(room.loop);
        room.loop = null;
    }

    try {
        
        await saveGametoDbServices(room);

        metrics.totalGamesPlayed.inc();
        
        
        if (room.tournamentId && room.winnerId) {
            await processTournamentMatchResult(room.matchId, room.winnerId);
        }

        
        const players = Array.from(room.players).sort((a, b) => a - b); 
        const playerStats = players.map(playerId => ({
            userId: playerId,
            isWinner: playerId === winnerId
        }));
        await updateMultipleUserStats(playerStats);

    } catch (error) {
    }

    
    for (const [playerId, socket] of room.sockets) {
        const user = await getUserById(winnerId);
        await sendMessage(socket, 'game', 'game-over', {
            roomId: room.id,
            winner: winnerId,
            finalScore: room.state.score,
            message: `Player ${user.username} wins!`,
            isTournamentMatch: !!room.tournamentId,
            tournamentId: room.tournamentId,
            round: room.round
        });
    }

    
    for (const playerId of room.players) {
        userRoom.delete(playerId);
    }
    room.players.clear();
    room.sockets.clear();
}


// send game state to all players
export async function broadcastGameState(room) {
    const stateData = {
        ball: room.state.ball,
        paddles: room.state.paddles,
        score: room.state.score,
        gameOver: room.state.gameOver
    };

    for (const [socket] of room.sockets.entries()) {
        await sendMessage(socket, 'game', 'state-update', {
            roomId: room.id,
            state: stateData
        });
    }
}



// send flash effect to all players
async function broadcastFlashEffect(room, type, index, duration) {
    const flashData = {
        type: type, 
        index: index, 
        duration: duration,
        timestamp: Date.now()
    };

    
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'flash-effect', {
            roomId: room.id,
            flash: flashData
        });
    }
}
