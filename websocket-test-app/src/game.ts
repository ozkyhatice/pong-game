import { sendMessage } from './websocket.js';

export interface GameState {
    ball: {
        x: number;
        y: number;
        vx: number;
        vy: number;
    };
    paddles: {
        [userId: string]: { y: number };
    };
    score: {
        [userId: string]: number;
    };
    gameOver: boolean;
}

export interface Room {
    id: string;
    players: string[];
    started: boolean;
    state?: GameState;
}

let currentRoom: Room | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let myUserId: string | null = null;

// Keyboard state
const keys: { [key: string]: boolean } = {};

export function initializeGameCanvas() {
    canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    ctx = canvas?.getContext('2d') || null;
    
    if (canvas && ctx) {
        // Clear canvas initially
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw center line
        drawCenterLine();
    }
}

export function initializeGameControls() {
    const createRoomBtn = document.getElementById('createRoom') as HTMLButtonElement;
    const joinRoomBtn = document.getElementById('joinRoom') as HTMLButtonElement;
    const startGameBtn = document.getElementById('startGame') as HTMLButtonElement;
    const scorePointBtn = document.getElementById('scorePoint') as HTMLButtonElement;

    createRoomBtn?.addEventListener('click', createRoom);
    joinRoomBtn?.addEventListener('click', joinRoom);
    startGameBtn?.addEventListener('click', startGame);
    scorePointBtn?.addEventListener('click', scoreTestPoint);

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        handleKeyboard();
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
}

export function setMyUserId(userId: string) {
    myUserId = userId;
}

function drawCenterLine() {
    if (!ctx || !canvas) return;
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawPaddle(x: number, y: number) {
    if (!ctx) return;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(x, y, 10, 100);
}

function drawBall(x: number, y: number) {
    if (!ctx) return;
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
}

function drawGame(state: GameState) {
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    drawCenterLine();

    // Draw ball
    if (state.ball) {
        drawBall(state.ball.x, state.ball.y);
    }

    // Draw paddles
    const playerIds = Object.keys(state.paddles);
    if (playerIds.length >= 1) {
        drawPaddle(10, state.paddles[playerIds[0]].y);
    }
    if (playerIds.length >= 2) {
        drawPaddle(canvas.width - 20, state.paddles[playerIds[1]].y);
    }

    // Update UI info
    updateGameInfo(state, playerIds);
}

function updateGameInfo(state: GameState, playerIds: string[]) {
    const scoresElement = document.getElementById('scores');
    const ballPosElement = document.getElementById('ballPos');
    const playersElement = document.getElementById('players');

    if (scoresElement) {
        const scoreText = playerIds.map(id => `${id}: ${state.score[id] || 0}`).join(' - ');
        scoresElement.textContent = scoreText;
    }

    if (ballPosElement && state.ball) {
        ballPosElement.textContent = `(${Math.round(state.ball.x)}, ${Math.round(state.ball.y)})`;
    }

    if (playersElement) {
        playersElement.textContent = playerIds.join(', ');
    }
}

function updateRoomInfo(room: Room | null) {
    const currentRoomElement = document.getElementById('currentRoom');
    if (currentRoomElement) {
        if (room) {
            currentRoomElement.innerHTML = `
                <strong>Current Room:</strong> ${room.id}<br>
                <strong>Players:</strong> ${room.players.join(', ')}<br>
                <strong>Started:</strong> ${room.started ? 'Yes' : 'No'}
            `;
        } else {
            currentRoomElement.innerHTML = '<strong>Current Room:</strong> Not in any room';
        }
    }
}

function updateGameStatus(status: string) {
    const gameStatusElement = document.getElementById('gameStatus');
    if (gameStatusElement) {
        gameStatusElement.textContent = `Game Status: ${status}`;
    }
}

function handleKeyboard() {
    if (!currentRoom || !myUserId) return;

    let newY: number | null = null;
    const currentPaddle = currentRoom.state?.paddles[myUserId];
    if (!currentPaddle) return;

    if (keys['w'] || keys['arrowup']) {
        newY = Math.max(0, currentPaddle.y - 10);
    } else if (keys['s'] || keys['arrowdown']) {
        newY = Math.min(500, currentPaddle.y + 10); // 600 - 100 (paddle height)
    }

    if (newY !== null && newY !== currentPaddle.y) {
        sendPlayerMove(newY);
    }
}

// Game Actions
export function createRoom() {
    sendMessage('game', 'join', { roomId: null });
    updateGameStatus('Creating room...');
}

export function joinRoom() {
    const roomIdInput = document.getElementById('joinRoomId') as HTMLInputElement;
    const roomId = roomIdInput.value.trim();
    
    if (!roomId) {
        alert('Please enter a room ID');
        return;
    }

    sendMessage('game', 'join', { roomId });
    updateGameStatus(`Joining room ${roomId}...`);
}

export function startGame() {
    if (!currentRoom) {
        alert('You need to be in a room first');
        return;
    }

    sendMessage('game', 'start', { roomId: currentRoom.id });
    updateGameStatus('Starting game...');
}

export function scoreTestPoint() {
    if (!currentRoom || !myUserId) {
        alert('You need to be in a game first');
        return;
    }

    sendMessage('game', 'score', { roomId: currentRoom.id });
    updateGameStatus('Scoring point...');
}

function sendPlayerMove(y: number) {
    if (!currentRoom) return;
    
    sendMessage('game', 'move', { 
        roomId: currentRoom.id, 
        y: y 
    });
}

// Game Event Handlers
export function handleGameMessage(event: string, data: any) {
    console.log('Game message:', event, data);

    switch (event) {
        case 'room-created':
            handleRoomCreated(data);
            break;
        case 'joined':
            handleRoomJoined(data);
            break;
        case 'game-started':
            handleGameStarted(data);
            break;
        case 'state-update':
            handleStateUpdate(data);
            break;
        case 'ball-updated':
            handleBallUpdate(data);
            break;
        case 'score-update':
            handleScoreUpdate(data);
            break;
        case 'game-over':
            handleGameOver(data);
            break;
        case 'error':
        case 'room-not-found':
        case 'already-joined':
        case 'room-full':
        case 'game-already-started':
            handleGameError(event, data);
            break;
        default:
            console.log('Unknown game event:', event, data);
    }
}

function handleRoomCreated(data: any) {
    currentRoom = {
        id: data.roomId,
        players: [myUserId!],
        started: false
    };
    updateRoomInfo(currentRoom);
    updateGameStatus('Room created successfully! Waiting for another player...');
}

function handleRoomJoined(data: any) {
    currentRoom = {
        id: data.roomId,
        players: data.players || [],
        started: false
    };
    updateRoomInfo(currentRoom);
    updateGameStatus(`Joined room successfully! Players: ${currentRoom.players.length}/2`);
}

function handleGameStarted(data: any) {
    if (currentRoom) {
        currentRoom.started = true;
        updateRoomInfo(currentRoom);
    }
    updateGameStatus('Game started! Use W/S to move your paddle');
}

function handleStateUpdate(data: any) {
    if (currentRoom && data.state) {
        currentRoom.state = data.state;
        drawGame(data.state);
    }
}

function handleBallUpdate(data: any) {
    if (currentRoom && currentRoom.state && data.ball) {
        currentRoom.state.ball = data.ball;
        drawGame(currentRoom.state);
    }
}

function handleScoreUpdate(data: any) {
    if (currentRoom && currentRoom.state) {
        currentRoom.state.score = data.scores;
        drawGame(currentRoom.state);
        updateGameStatus(`Score updated! Last scorer: ${data.lastScorer}`);
    }
}

function handleGameOver(data: any) {
    if (currentRoom) {
        currentRoom.started = false;
        if (currentRoom.state) {
            currentRoom.state.gameOver = true;
            currentRoom.state.score = data.finalScore;
            drawGame(currentRoom.state);
        }
    }
    updateGameStatus(`Game Over! Winner: ${data.winner}`);
    
    // Show game over message
    alert(`Game Over!\nWinner: ${data.winner}\nFinal Score: ${JSON.stringify(data.finalScore)}`);
}

function handleGameError(event: string, data: any) {
    const errorMessages = {
        'error': data.message || 'Unknown error',
        'room-not-found': 'Room not found',
        'already-joined': 'You have already joined this room',
        'room-full': 'Room is full',
        'game-already-started': 'Game has already started'
    };
    
    const message = errorMessages[event as keyof typeof errorMessages] || `Error: ${event}`;
    updateGameStatus(message);
    alert(message);
}
