import { sendMessage } from "./join.utils.js";
import { saveGametoDbServices } from "../services/game.service.js";
import { userRoom } from "../controller/game.controller.js";
import { updateMultipleUserStats } from "../../user/service/user.service.js";
export async function updateBall(room, connection) {
    const ball = room.state.ball;
    const ballRadius = 8;
    const paddleWidth = 10;
    const paddleHeight = 100;
    const canvasWidth = 800;
    const canvasHeight = 400;
    
    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Check for top and bottom wall collisions
    if (ball.y - ballRadius <= 0) {
        ball.y = ballRadius;
        ball.vy = Math.abs(ball.vy); // Make sure it bounces down
    } else if (ball.y + ballRadius >= canvasHeight) {
        ball.y = canvasHeight - ballRadius;
        ball.vy = -Math.abs(ball.vy); // Make sure it bounces up
    }
    
    const [player1, player2] = Array.from(room.players);
    const paddle1 = room.state.paddles[player1];
    const paddle2 = room.state.paddles[player2];
    
    if (!paddle1 || !paddle2) {
        console.error('Paddles not found for players:', player1, player2);
        return;
    }
    
    // Left paddle collision (player1)
    if (ball.vx < 0 && // Ball moving left
        ball.x - ballRadius <= paddleWidth && // Ball reached paddle
        ball.x - ballRadius > 0 && // Ball not past paddle
        ball.y >= paddle1.y && 
        ball.y <= paddle1.y + paddleHeight) {
        
        // Calculate hit position on paddle (0 to 1)
        const hitPos = (ball.y - paddle1.y) / paddleHeight;
        
        // Reflect ball
        ball.vx = Math.abs(ball.vx); // Always bounce right
        ball.x = paddleWidth + ballRadius; // Position outside paddle
        
        // Adjust angle based on hit position
        const maxAngle = Math.PI / 3; // 60 degrees max
        const angle = (hitPos - 0.5) * 2 * maxAngle; // -60 to +60 degrees
        ball.vy = Math.abs(ball.vx) * Math.tan(angle);
        
    }
    
    // Right paddle collision (player2)
    if (ball.vx > 0 && // Ball moving right
        ball.x + ballRadius >= canvasWidth - paddleWidth && // Ball reached paddle
        ball.x + ballRadius < canvasWidth && // Ball not past paddle
        ball.y >= paddle2.y && 
        ball.y <= paddle2.y + paddleHeight) {
        
        // Calculate hit position on paddle (0 to 1)
        const hitPos = (ball.y - paddle2.y) / paddleHeight;
        
        // Reflect ball
        ball.vx = -Math.abs(ball.vx); // Always bounce left
        ball.x = canvasWidth - paddleWidth - ballRadius; // Position outside paddle
        
        // Adjust angle based on hit position
        const maxAngle = Math.PI / 3; // 60 degrees max
        const angle = (hitPos - 0.5) * 2 * maxAngle; // -60 to +60 degrees
        ball.vy = Math.abs(ball.vx) * Math.tan(angle);
        
    }

    // Scoring - only when ball goes completely off screen
    if (ball.x < -ballRadius) {
        room.state.score[player2] += 1;
        console.log(`Goal! Player ${player2} score: ${room.state.score[player2]}`);
        resetBall(ball);
        await checkGameEnd(room, player2);
    } else if (ball.x > canvasWidth + ballRadius) {
        room.state.score[player1] += 1;
        console.log(`Goal! Player ${player1} score: ${room.state.score[player1]}`);
        resetBall(ball);
        await checkGameEnd(room, player1);
    }
    
    // Optional ball update message (not needed if using state-update)
    // sendMessage(connection, 'game', 'ball-updated', {
    //     roomId: room.id,
    //     ball: room.state.ball
    // });
}
function resetBall(ball) {
    ball.x = 400; // Center X
    ball.y = 200; // Center Y
    
    // Random direction but with consistent speed
    const speed = 5;
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -30 to +30 degrees
    const direction = Math.random() > 0.5 ? 1 : -1; // Left or right
    
    ball.vx = direction * speed * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
    
}

async function checkGameEnd(room, scoringPlayerId) {
    const winningScore = 5;
    if (room.state.score[scoringPlayerId] >= winningScore) {
        room.state.gameOver = true;
        room.winnerId = scoringPlayerId;
        room.endDate = new Date();
        
        console.log(`Game Over! Player ${scoringPlayerId} wins with ${room.state.score[scoringPlayerId]} points`);
        
        // Stop the game loop
        if (room.loop) {
            clearInterval(room.loop);
            room.loop = null;
            console.log(`Game loop stopped for room ${room.id}`);
        }
        
        // Save game result to database
        try {
            await saveGametoDbServices(room);
            console.log('Game result saved to database');
        } catch (error) {
            console.error('Error saving game to database:', error);
        }

        // Update user stats (wins/losses)
        try {
            const players = Array.from(room.players);
            const playerStats = players.map(playerId => ({
                userId: playerId,
                isWinner: playerId === scoringPlayerId
            }));
            
            await updateMultipleUserStats(playerStats);
            console.log('User stats updated successfully');
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
        
        // Broadcast game over to all players
        for (const [playerId, socket] of room.sockets) {
            await sendMessage(socket, 'game', 'game-over', {
                roomId: room.id,
                winner: scoringPlayerId,
                finalScore: room.state.score,
                message: `Player ${scoringPlayerId} wins!`
            });
        }
        
        // Clean up players from room after game over
        for (const playerId of room.players) {
            userRoom.delete(playerId);
        }
        room.players.clear();
        room.sockets.clear();
    }
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