import { sendMessage } from "./join.utils.js";
export function updateBall(room, connection) {
    const ball = room.state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;
    // Check for wall collisions
    if (ball.y <= 0 || ball.y >= 600) { // Assuming canvas height is 600
        ball.vy *= -1; // Reverse Y velocity
    }
    const [player1, player2] = Array.from(room.players);
    const paddle1 = room.state.paddles[player1];
    const paddle2 = room.state.paddles[player2];
    const paddleWidth = 10; // Assuming paddle width is 10
    const paddleHeight = 100; // Assuming paddle height is 100
    // Check for paddle collisions
    if (ball.x <= paddleWidth &&
        ball.y >= paddle1.y &&
        ball.y <= paddle1.y + paddleHeight) {
        ball.vx *= -1;
        ball.x = paddleWidth; // paddle içine girmesin
    }
    // Sağ paddle çarpması
    if (ball.x >= 800 - paddleWidth && // 800: oyun alanı genişliği
        ball.y >= paddle2.y &&
        ball.y <= paddle2.y + paddleHeight) {
        ball.vx *= -1;
        ball.x = 800 - paddleWidth;
    }

    // Gol olma durumu
    if (ball.x < 0) {
        room.state.score[player2] += 1;
        resetBall(ball);
    } else if (ball.x > 800) {
        room.state.score[player1] += 1;
        resetBall(ball);
    }
    
    console.log('state ball:', ball);
    sendMessage(connection, 'game', 'ball-updated', {
        roomId: room.id,
        ball: room.state.ball
    });
}
function resetBall(ball) {
    ball.x = 400;
    ball.y = 300;
    ball.vx = (Math.random() > 0.5 ? 5 : -5);
    ball.vy = (Math.random() > 0.5 ? 5 : -5);
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