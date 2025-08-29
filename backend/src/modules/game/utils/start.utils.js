import { sendMessage } from "./join.utils.js";
import { saveGametoDbServices } from "../services/game.service.js";
import { userRoom } from "../controller/game.controller.js";
import { updateMultipleUserStats } from "../../user/service/user.service.js";
import { processTournamentMatchResult } from "../../tournament/service/tournament.service.js";

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const BALL_RADIUS = 8;
const BALL_SPEED = 5;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const PADDLE_SPEED = 8;
const WINNING_SCORE = 5;

export async function updateBall(room, connection) {
    const ball = room.state.ball;
    const [player1Id, player2Id] = Array.from(room.players);
    const paddle1 = room.state.paddles[player1Id]; // Left paddle
    const paddle2 = room.state.paddles[player2Id]; // Right paddle
    
    if (!paddle1 || !paddle2) {
        console.error('Paddles not found for players:', player1Id, player2Id);
        return;
    }
    
    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Ball collision with top and bottom walls
    if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS;
        ball.vy = -ball.vy; // Reverse vertical direction
    } else if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
        ball.y = CANVAS_HEIGHT - BALL_RADIUS;
        ball.vy = -ball.vy; // Reverse vertical direction
    }
    
    // Left paddle collision (player1)
    if (ball.vx < 0 && // Ball moving towards left paddle
        ball.x - BALL_RADIUS <= PADDLE_WIDTH && // Ball reached paddle X position
        ball.x - BALL_RADIUS > 0 && // Ball hasn't gone past paddle
        ball.y + BALL_RADIUS >= paddle1.y && // Ball bottom >= paddle top
        ball.y - BALL_RADIUS <= paddle1.y + PADDLE_HEIGHT) { // Ball top <= paddle bottom
        
        // Ball hits left paddle - bounce to right
        ball.x = PADDLE_WIDTH + BALL_RADIUS; // Position ball just outside paddle
        ball.vx = Math.abs(ball.vx); // Make sure ball goes right
        
        // Add angle based on where ball hit the paddle
        const paddleCenter = paddle1.y + PADDLE_HEIGHT / 2;
        const hitOffset = ball.y - paddleCenter;
        const normalizedOffset = hitOffset / (PADDLE_HEIGHT / 2); // -1 to 1
        ball.vy = normalizedOffset * BALL_SPEED * 0.5; // Add vertical component
        
        console.log(`Left paddle hit! Ball bouncing right`);
    }
    
    // Right paddle collision (player2)
    else if (ball.vx > 0 && // Ball moving towards right paddle
        ball.x + BALL_RADIUS >= CANVAS_WIDTH - PADDLE_WIDTH && // Ball reached paddle X position
        ball.x + BALL_RADIUS < CANVAS_WIDTH && // Ball hasn't gone past paddle
        ball.y + BALL_RADIUS >= paddle2.y && // Ball bottom >= paddle top
        ball.y - BALL_RADIUS <= paddle2.y + PADDLE_HEIGHT) { // Ball top <= paddle bottom
        
        // Ball hits right paddle - bounce to left
        ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_RADIUS; // Position ball just outside paddle
        ball.vx = -Math.abs(ball.vx); // Make sure ball goes left
        
        // Add angle based on where ball hit the paddle
        const paddleCenter = paddle2.y + PADDLE_HEIGHT / 2;
        const hitOffset = ball.y - paddleCenter;
        const normalizedOffset = hitOffset / (PADDLE_HEIGHT / 2); // -1 to 1
        ball.vy = normalizedOffset * BALL_SPEED * 0.5; // Add vertical component
        
        console.log(`Right paddle hit! Ball bouncing left`);
    }
    
    // Scoring - ball goes off screen
    if (ball.x < -BALL_RADIUS) {
        // Ball went off left side - Player 2 (right) scores
        room.state.score[player2Id] += 1;
        console.log(`GOAL! Player ${player2Id} scores! Score: ${room.state.score[player1Id]} - ${room.state.score[player2Id]}`);
        await resetBallAndCheck(room, ball, player2Id);
    } 
    else if (ball.x > CANVAS_WIDTH + BALL_RADIUS) {
        // Ball went off right side - Player 1 (left) scores  
        room.state.score[player1Id] += 1;
        console.log(`GOAL! Player ${player1Id} scores! Score: ${room.state.score[player1Id]} - ${room.state.score[player2Id]}`);
        await resetBallAndCheck(room, ball, player1Id);
    }
}

async function resetBallAndCheck(room, ball, scoringPlayerId) {
    // Reset ball to center
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    
    // Ball starts moving towards the player who was scored on
    const [player1Id, player2Id] = Array.from(room.players);
    const ballDirection = scoringPlayerId === player1Id ? 1 : -1; // If player1 scored, ball goes right
    
    // Random angle but not too steep
    const angle = (Math.random() - 0.5) * Math.PI / 4; // -45 to +45 degrees
    ball.vx = ballDirection * BALL_SPEED * Math.cos(angle);
    ball.vy = BALL_SPEED * Math.sin(angle);
    
    console.log(`Ball reset. Direction: ${ballDirection > 0 ? 'right' : 'left'}`);
    
    // Check if game is over
    if (room.state.score[scoringPlayerId] >= WINNING_SCORE) {
        await endGame(room, scoringPlayerId);
    }
}

async function endGame(room, winnerId) {
    room.state.gameOver = true;
    room.winnerId = winnerId;
    room.endDate = new Date();
    
    console.log(`🏆 GAME OVER! Player ${winnerId} wins ${room.state.score[winnerId]}-${room.state.score[Array.from(room.players).find(p => p !== winnerId)]}`);
    
    // Stop game loop
    if (room.loop) {
        clearInterval(room.loop);
        room.loop = null;
    }
    
    try {
        // Save to database
        await saveGametoDbServices(room);
        
        // Eğer bu bir turnuva maçıysa, turnuva ilerlemesini kontrol et
        if (room.tournamentId && room.winnerId) {
            console.log(`🏆 Processing tournament match result: matchId=${room.matchId}, winnerId=${room.winnerId}`);
            await processTournamentMatchResult(room.matchId, room.winnerId);
        }
        
        // Update player stats
        const players = Array.from(room.players);
        const playerStats = players.map(playerId => ({
            userId: playerId,
            isWinner: playerId === winnerId
        }));
        await updateMultipleUserStats(playerStats);
        
        console.log('Game saved to database and stats updated');
    } catch (error) {
        console.error('Error saving game:', error);
    }
    
    // Broadcast game over to all players
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'game-over', {
            roomId: room.id,
            winner: winnerId,
            finalScore: room.state.score,
            message: `Player ${winnerId} wins!`,
            isTournamentMatch: !!room.tournamentId,
            tournamentId: room.tournamentId,
            round: room.round
        });
    }
    
    // Clean up room
    for (const playerId of room.players) {
        userRoom.delete(playerId);
    }
    room.players.clear();
    room.sockets.clear();
}

export async function broadcastGameState(room) {
    const stateData = {
        ball: room.state.ball,
        paddles: room.state.paddles,
        score: room.state.score,
        gameOver: room.state.gameOver
    };

    for (const [userId, socket] of room.sockets.entries()) {
        await sendMessage(socket, 'game', 'state-update', {
            roomId: room.id,
            state: stateData
        });
    }
}