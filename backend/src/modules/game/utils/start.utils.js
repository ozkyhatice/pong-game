import { sendMessage } from "./join.utils.js";
import { saveGametoDbServices } from "../services/game.service.js";
import { userRoom } from "../controller/game.controller.js";
import { updateMultipleUserStats } from "../../user/service/user.service.js";
import { processTournamentMatchResult } from "../../tournament/service/tournament.service.js";
import { getUserById } from "../../user/service/user.service.js";

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const BALL_RADIUS = 8;
const BALL_SPEED = 5;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const PADDLE_SPEED = 15;
const WINNING_SCORE = 5;

export async function updateBall(room, connection) {
    const ball = room.state.ball;
    // Use room players order (join order) instead of ID sorting for consistency
    if (room.players.length < 2) return;

    const [player1Id, player2Id] = room.players; // First player = left, second player = right
    const paddle1 = room.state.paddles[player1Id]; // Left paddle (first player in room)
    const paddle2 = room.state.paddles[player2Id]; // Right paddle (second player in room)

    if (!paddle1 || !paddle2) {
        return;
    }

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Ball collision with top and bottom walls
    if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS;
        ball.vy = -ball.vy; // Reverse vertical direction
        // Trigger flash effect for top border
        await broadcastFlashEffect(room, 'border', 3, 1.5); // Border index 2 = top
    } else if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
        ball.y = CANVAS_HEIGHT - BALL_RADIUS;
        ball.vy = -ball.vy; // Reverse vertical direction
        // Trigger flash effect for bottom border
        await broadcastFlashEffect(room, 'border', 2, 1.5); // Border index 3 = bottom
    }

    // Left paddle collision (player1)
    if (ball.vx < 0 && // Ball moving towards left paddle
        ball.x - BALL_RADIUS <= PADDLE_WIDTH && // Ball reached paddle X position
        ball.x - BALL_RADIUS > 0 && // Ball hasn't gone past paddle
        ball.y + BALL_RADIUS >= paddle1.y && // Ball bottom >= paddle top
        ball.y - BALL_RADIUS <= paddle1.y + PADDLE_HEIGHT) { // Ball top <= paddle bottom

        // Ball hits left paddle - bounce to right
        ball.x = PADDLE_WIDTH + BALL_RADIUS; // Position ball just outside paddle

        // Increase ball speed on paddle hit
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const newSpeed = Math.min(currentSpeed * 1.05, BALL_SPEED * 1.8); // Max 1.8x original speed

        ball.vx = Math.abs(ball.vx) * (newSpeed / currentSpeed); // Make sure ball goes right with increased speed

        // Add angle based on where ball hit the paddle
        const paddleCenter = paddle1.y + PADDLE_HEIGHT / 2;
        const hitOffset = ball.y - paddleCenter;
        const normalizedOffset = hitOffset / (PADDLE_HEIGHT / 2); // -1 to 1
        ball.vy = normalizedOffset * newSpeed * 0.5; // Add vertical component with new speed

        // Trigger flash effect for left paddle hit
        await broadcastFlashEffect(room, 'paddle', 0, 1.0);

    }

    // Right paddle collision (player2)
    else if (ball.vx > 0 && // Ball moving towards right paddle
        ball.x + BALL_RADIUS >= CANVAS_WIDTH - PADDLE_WIDTH && // Ball reached paddle X position
        ball.x + BALL_RADIUS < CANVAS_WIDTH && // Ball hasn't gone past paddle
        ball.y + BALL_RADIUS >= paddle2.y && // Ball bottom >= paddle top
        ball.y - BALL_RADIUS <= paddle2.y + PADDLE_HEIGHT) { // Ball top <= paddle bottom

        // Ball hits right paddle - bounce to left
        ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_RADIUS; // Position ball just outside paddle

        // Increase ball speed on paddle hit
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const newSpeed = Math.min(currentSpeed * 1.05, BALL_SPEED * 1.8); // Max 1.8x original speed

        ball.vx = -Math.abs(ball.vx) * (newSpeed / currentSpeed); // Make sure ball goes left with increased speed

        // Add angle based on where ball hit the paddle
        const paddleCenter = paddle2.y + PADDLE_HEIGHT / 2;
        const hitOffset = ball.y - paddleCenter;
        const normalizedOffset = hitOffset / (PADDLE_HEIGHT / 2); // -1 to 1
        ball.vy = normalizedOffset * newSpeed * 0.5; // Add vertical component with new speed

        // Trigger flash effect for right paddle hit
        await broadcastFlashEffect(room, 'paddle', 1, 1.0);

    }

    // Scoring - ball goes off screen
    if (ball.x < -BALL_RADIUS) {
        // Ball went off left side - Player 2 (right) scores
        room.state.score[player2Id] += 1;
        // Trigger flash effect for scoring
        await broadcastFlashEffect(room, 'score', player2Id, 2.0);
        await broadcastFlashEffect(room, 'border', 0, 2.0); // Flash left border on score
        await resetBallAndCheck(room, ball, player2Id);
    }
    else if (ball.x > CANVAS_WIDTH + BALL_RADIUS) {
        // Ball went off right side - Player 1 (left) scores
        room.state.score[player1Id] += 1;
        // Trigger flash effect for scoring
        await broadcastFlashEffect(room, 'score', player1Id, 2.0);
        await broadcastFlashEffect(room, 'border', 1, 2.0); // Flash right border on score
        await resetBallAndCheck(room, ball, player1Id);
    }
}

async function resetBallAndCheck(room, ball, scoringPlayerId) {
    // Reset ball to center
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;

    // Initialize ball direction counter if not exists
    if (!room.ballDirectionCounter) {
        room.ballDirectionCounter = 0;
    }

    // Alternate ball direction: even = left (-1), odd = right (1)
    room.ballDirectionCounter++;
    const ballDirection = room.ballDirectionCounter % 2 === 0 ? -1 : 1;

    // Random angle but not too steep
    const angle = (Math.random() - 0.5) * Math.PI / 4; // -45 to +45 degrees
    ball.vx = ballDirection * BALL_SPEED * Math.cos(angle);
    ball.vy = BALL_SPEED * Math.sin(angle);


    // Check if game is over
    if (room.state.score[scoringPlayerId] >= WINNING_SCORE) {
        await endGame(room, scoringPlayerId);
    }
}

async function endGame(room, winnerId) {
    room.state.gameOver = true;
    room.winnerId = winnerId;
    room.endDate = new Date();

    const players = Array.from(room.players).sort((a, b) => a - b); // Consistent sorting
    const loserScore = room.state.score[players.find(p => p !== winnerId)] || 0;

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
            await processTournamentMatchResult(room.matchId, room.winnerId);
        }

        // Update player stats
        const players = Array.from(room.players).sort((a, b) => a - b); // Consistent sorting
        const playerStats = players.map(playerId => ({
            userId: playerId,
            isWinner: playerId === winnerId
        }));
        await updateMultipleUserStats(playerStats);

    } catch (error) {
        console.log(`GAME DB ERROR: Failed to save match -> Room: ${room.id}, Error: ${error.message}`);
    }

    // Broadcast game over to all players
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

    for (const [socket] of room.sockets.entries()) {
        await sendMessage(socket, 'game', 'state-update', {
            roomId: room.id,
            state: stateData
        });
    }
}

// Flash effect broadcasting function
async function broadcastFlashEffect(room, type, index, duration) {
    const flashData = {
        type: type, // 'border', 'paddle', or 'score'
        index: index, // border/paddle index or player ID for score
        duration: duration,
        timestamp: Date.now()
    };

    // Broadcast flash effect to all players in the room
    for (const [playerId, socket] of room.sockets) {
        await sendMessage(socket, 'game', 'flash-effect', {
            roomId: room.id,
            flash: flashData
        });
    }
}
