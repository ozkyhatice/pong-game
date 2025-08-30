import { AppState, RoomInfo } from "../../core/AppState.js";
import { GameService } from "../../services/GameService.js";
import { UserService } from "../../services/UserService.js";
import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";

declare global {
  var router: Router;
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [userId: number]: { x: number; y: number; width: number; height: number } };
  score: { [userId: number]: number };
  gameOver: boolean;
}

interface Player {
  id: number;
  name: string;
  isLeft: boolean;
}

export function init() {
  const canvasElement = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvasElement) {
    console.error('Canvas not found');
    return;
  }
  const canvas = canvasElement; // Non-null canvas reference
  const ctx = canvas.getContext('2d')!
  
  const player1NameEl = document.getElementById('player1-name');
  const player2NameEl = document.getElementById('player2-name');
  const player1ScoreEl = document.getElementById('player1-score');
  const player2ScoreEl = document.getElementById('player2-score');
  const roomIdEl = document.getElementById('room-id');
  const gameStatusEl = document.getElementById('game-status');
  const leaveGameBtn = document.getElementById('leave-game-btn');

  const appState = AppState.getInstance();
  const gameService = new GameService();
  const userService = new UserService();
  const currentRoom = appState.getCurrentRoom();

  if (!currentRoom) {
    notify('No room found!');
    router.navigate('home');
    return;
  }

  let gameState: GameState | null = null;
  let players: Player[] = [];
  let myPlayerId: number | null = null;
  let keysPressed: { [key: string]: boolean } = {};

  if (roomIdEl) roomIdEl.textContent = currentRoom.roomId;
  if (leaveGameBtn) leaveGameBtn.addEventListener('click', handleLeaveGame);
  
  initPlayerInfo();

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    keysPressed[e.code] = true;
    handleKeyPress();
  });

  document.addEventListener('keyup', (e) => {
    keysPressed[e.code] = false;
  });

  // Game Service Events
  gameService.onStateUpdate((data) => {
    gameState = data.state;
    updateScores();
    updatePlayerNames();
    draw();
  });

  gameService.onGameStarted((data) => {
    if (gameStatusEl) gameStatusEl.textContent = 'Playing';
    players = data.players || [];
    setTimeout(() => updatePlayerNames(), 100);
  });

  gameService.onGameError((data) => {
    if (gameStatusEl) gameStatusEl.textContent = `Error: ${data.message}`;
  });

  gameService.onPlayerLeft((data) => {
    notify(`Player ${data.leftPlayer} left the game.`);
    appState.clearCurrentRoom();
    router.navigate('home');
  });

  gameService.onGameOver((data: any) => {
    // Check if this is a tournament match
    if (data.isTournamentMatch && data.tournamentId) {
      // Tournament match completed - return to tournament page
      console.log('🏆 Tournament match completed:', data);
      notify(data.message + ' Returning to tournament...');
      
      // Update tournament state
      appState.updateTournamentStatus('active', data.round);
      appState.clearCurrentRoom();
      router.navigate('tournament');
    } else {
      // Regular match - show end game screen
      localStorage.setItem('gameResult', JSON.stringify({
        winner: data.winner,
        finalScore: data.finalScore,
        message: data.message,
        timestamp: Date.now()
      }));
      
      appState.clearCurrentRoom();
      router.navigate('end-game');
    }
  });

  // Initialize game
  initGame();
  
  // Start countdown before game begins
  startCountdown();

  function initGame() {
    if (gameStatusEl) gameStatusEl.textContent = 'Initializing...';
    
    // Set canvas background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    drawCenterLine();
  }

  function startCountdown() {
    let count = 5;
    if (gameStatusEl) gameStatusEl.textContent = `Game starts in ${count}...`;
    
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        if (gameStatusEl) gameStatusEl.textContent = `Game starts in ${count}...`;
      } else {
        clearInterval(countdownInterval);
        if (gameStatusEl) gameStatusEl.textContent = 'Starting...';
        
        // Start the actual game
        if (currentRoom) {
          gameService.startGame(currentRoom.roomId);
        }
        
        // Request initial game state
        setTimeout(() => {
          requestGameState();
        }, 500);
      }
    }, 1000);
  }

  function handleKeyPress() {
    if (!currentRoom || !gameState || gameState.gameOver) return;
    
    const myPaddle = gameState.paddles[myPlayerId || 0];
    if (!myPaddle) return;
    
    let newY: number | null = null;
    const paddleSpeed = 10;
    const paddleHeight = 100;
    
    if (keysPressed['KeyW'] || keysPressed['ArrowUp']) {
      newY = Math.max(0, myPaddle.y - paddleSpeed);
    } else if (keysPressed['KeyS'] || keysPressed['ArrowDown']) {
      newY = Math.min(canvas.height - paddleHeight, myPaddle.y + paddleSpeed);
    }
    
    if (newY !== null) {
      gameService.movePlayer(currentRoom.roomId, newY);
    }
  }

  function requestGameState() {
    if (currentRoom) {
      gameService.requestGameState(currentRoom.roomId);
    }
  }

  function draw() {
    if (!gameState) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    drawCenterLine();

    // Draw paddles
    ctx.fillStyle = '#ffffff';
    const paddleWidth = 10;
    const paddleHeight = 100;
    
    if (gameState && gameState.paddles) {
      const playerIds = Object.keys(gameState.paddles);
      playerIds.forEach((playerId, index) => {
        const paddle = gameState!.paddles[parseInt(playerId)];
        if (paddle) {
          // Left paddle (player 1) and right paddle (player 2)
          const x = index === 0 ? 0 : canvas.width - paddleWidth;
          ctx.fillRect(x, paddle.y, paddleWidth, paddleHeight);
        }
      });
    }

    // Draw ball
    if (gameState.ball) {
      ctx.beginPath();
      ctx.arc(gameState.ball.x, gameState.ball.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  function drawCenterLine() {
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function updateScores() {
    if (!gameState?.score) return;
    
    const playerIds = Object.keys(gameState.score);
    if (playerIds.length >= 2) {
      const score1 = gameState.score[parseInt(playerIds[0])] || 0;
      const score2 = gameState.score[parseInt(playerIds[1])] || 0;
      
      if (player1ScoreEl) player1ScoreEl.textContent = score1.toString();
      if (player2ScoreEl) player2ScoreEl.textContent = score2.toString();
    }
  }

  function handleLeaveGame() {
    if (currentRoom) {
      gameService.leaveGame(currentRoom.roomId);
      appState.clearCurrentRoom();
      router.navigate('home');
    }
  }

  async function initPlayerInfo() {
    const currentUser = await userService.getCurrentUser();
    myPlayerId = currentUser?.id || null;
  }

  async function updatePlayerNames() {
    if (!gameState?.score) return;
    
    const playerIds = Object.keys(gameState.score).map(id => parseInt(id));
    if (playerIds.length < 2) return;

    try {
      const [player1, player2] = await Promise.all([
        userService.getUserById(playerIds[0]),
        userService.getUserById(playerIds[1])
      ]);

      if (player1NameEl) player1NameEl.textContent = player1?.username || `Player ${playerIds[0]}`;
      if (player2NameEl) player2NameEl.textContent = player2?.username || `Player ${playerIds[1]}`;
    } catch (e) {
      console.error('Error updating player names:', e);
    }
  }
}