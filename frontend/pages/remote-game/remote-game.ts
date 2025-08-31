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
  
  // Desktop elements
  const player1NameEl = document.getElementById('player1-name');
  const player2NameEl = document.getElementById('player2-name');
  const player1InitialEl = document.getElementById('player1-initial');
  const player2InitialEl = document.getElementById('player2-initial');
  const player1ScoreEl = document.getElementById('player1-score');
  const player2ScoreEl = document.getElementById('player2-score');
  const roomIdEl = document.getElementById('room-id');
  const gameStatusEl = document.getElementById('game-status');
  const leaveGameBtn = document.getElementById('leave-game-btn');
  
  // Mobile elements
  const mobilePlayer1NameEl = document.getElementById('mobile-player1-name');
  const mobilePlayer2NameEl = document.getElementById('mobile-player2-name');
  const mobilePlayer1InitialEl = document.getElementById('mobile-player1-initial');
  const mobilePlayer2InitialEl = document.getElementById('mobile-player2-initial');
  const mobilePlayer1ScoreEl = document.getElementById('mobile-player1-score');
  const mobilePlayer2ScoreEl = document.getElementById('mobile-player2-score');
  const mobileGameStatusEl = document.getElementById('mobile-game-status');
  const mobileLeaveBtn = document.getElementById('mobile-leave-btn');
  const mobileUpBtn = document.getElementById('mobile-up-btn');
  const mobileDownBtn = document.getElementById('mobile-down-btn');
  const mobileCanvas = document.getElementById('mobile-game-canvas') as HTMLCanvasElement | null;

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

  if (roomIdEl) roomIdEl.textContent = `ROOM: ${currentRoom.roomId}`;
  if (leaveGameBtn) leaveGameBtn.addEventListener('click', handleLeaveGame);
  if (mobileLeaveBtn) mobileLeaveBtn.addEventListener('click', handleLeaveGame);
  
  // Setup canvas for mobile responsiveness
  setupResponsiveCanvas();
  
  // Setup mobile touch controls
  setupMobileControls();
  
  initPlayerInfo();
  initRoomPlayerNames(); // Show player names immediately from room data

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
    if (gameStatusEl) gameStatusEl.textContent = '⚔️ BATTLE IN PROGRESS ⚔️';
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚔️ BATTLE ⚔️';
    players = data.players || [];
    setTimeout(() => updatePlayerNames(), 100);
  });

  gameService.onGameError((data) => {
    if (gameStatusEl) gameStatusEl.textContent = `❌ ERROR: ${data.message}`;
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = `❌ ERROR`;
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
    if (gameStatusEl) gameStatusEl.textContent = `⚡ BATTLE STARTS IN ${count}... ⚡`;
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = `⚡ ${count} ⚡`;
    
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        if (gameStatusEl) gameStatusEl.textContent = `⚡ BATTLE STARTS IN ${count}... ⚡`;
        if (mobileGameStatusEl) mobileGameStatusEl.textContent = `⚡ ${count} ⚡`;
      } else {
        clearInterval(countdownInterval);
        
        // Only let the first player in the room start the game to avoid race condition
        const isFirstPlayer = currentRoom && currentRoom.players[0] === myPlayerId;
        if (isFirstPlayer) {
          console.log('🎮 Starting game as first player...');
          if (gameStatusEl) gameStatusEl.textContent = '⚡ INITIALIZING BATTLE... ⚡';
          if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚡ INIT ⚡';
          gameService.startGame(currentRoom.roomId);
        } else {
          console.log('🎮 Waiting for game to start...');
          if (gameStatusEl) gameStatusEl.textContent = '⚡ WAITING FOR BATTLE START... ⚡';
          if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚡ WAIT ⚡';
        }
        
        // Request initial game state
        setTimeout(() => {
          requestGameState();
        }, 500);
      }
    }, 1000);
  }

  function handleKeyPress() {
    if (!currentRoom || !gameState || gameState.gameOver || myPlayerId === null) return;
    
    const myPaddle = gameState.paddles[myPlayerId];
    if (!myPaddle) return;
    
    let newY: number | null = null;
    const paddleSpeed = 10;
    const paddleHeight = 100;
    const gameHeight = 400; // Original game canvas height
    
    if (keysPressed['KeyW'] || keysPressed['ArrowUp']) {
      newY = Math.max(0, myPaddle.y - paddleSpeed);
    } else if (keysPressed['KeyS'] || keysPressed['ArrowDown']) {
      newY = Math.min(gameHeight - paddleHeight, myPaddle.y + paddleSpeed);
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

    const isMobile = window.innerWidth < 640;
    const targetCanvas = isMobile && mobileCanvas ? mobileCanvas : canvas;
    const targetCtx = targetCanvas.getContext('2d')!;

    // Clear canvas
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Draw center line
    drawCenterLine(targetCtx, targetCanvas);

    // Draw paddles
    targetCtx.fillStyle = '#00ff00'; // Neon green for better visibility
    
    // Use consistent paddle dimensions that match game logic
    const originalPaddleWidth = 10;  // Original game paddle width
    const originalPaddleHeight = 100; // Original game paddle height
    
    // Scale paddle dimensions proportionally to canvas
    const paddleWidth = (originalPaddleWidth / 800) * targetCanvas.width;
    const paddleHeight = (originalPaddleHeight / 400) * targetCanvas.height;
    
    if (gameState && gameState.paddles) {
      const playerIds = Object.keys(gameState.paddles).map(id => parseInt(id)).sort();
      
      // Always assign first player to left, second to right consistently
      playerIds.forEach((playerId, index) => {
        const paddle = gameState!.paddles[playerId];
        if (paddle) {
          // Scale paddle position for different canvas sizes
          const scaledY = (paddle.y / 400) * targetCanvas.height; // Scale from original 400px height
          const x = index === 0 ? 0 : targetCanvas.width - paddleWidth;
          
          targetCtx.fillRect(x, scaledY, paddleWidth, paddleHeight);
        }
      });
    }

    // Draw ball
    if (gameState.ball) {
      const scaledX = (gameState.ball.x / 800) * targetCanvas.width; // Scale from original 800px width
      const scaledY = (gameState.ball.y / 400) * targetCanvas.height; // Scale from original 400px height
      
      // Use consistent ball size that matches game logic
      const originalBallRadius = 8; // Original game ball radius
      const ballRadius = (originalBallRadius / 800) * targetCanvas.width; // Scale proportionally
      
      targetCtx.beginPath();
      targetCtx.arc(scaledX, scaledY, ballRadius, 0, Math.PI * 2);
      targetCtx.fillStyle = '#00ff00'; // Neon green
      targetCtx.fill();
      
    }
  }

  function drawCenterLine(targetCtx = ctx, targetCanvas = canvas) {
    targetCtx.setLineDash([5, 15]);
    targetCtx.beginPath();
    targetCtx.moveTo(targetCanvas.width / 2, 0);
    targetCtx.lineTo(targetCanvas.width / 2, targetCanvas.height);
    targetCtx.strokeStyle = '#00ff00'; // Neon green
    targetCtx.lineWidth = 2;
    targetCtx.stroke();
    targetCtx.setLineDash([]);
  }

  function updateScores() {
    if (!gameState?.score) return;
    
    const playerIds = Object.keys(gameState.score).map(id => parseInt(id)).sort();
    if (playerIds.length >= 2) {
      const score1 = gameState.score[playerIds[0]] || 0;
      const score2 = gameState.score[playerIds[1]] || 0;
      
      // Update desktop scores
      if (player1ScoreEl) player1ScoreEl.textContent = score1.toString();
      if (player2ScoreEl) player2ScoreEl.textContent = score2.toString();
      
      // Update mobile scores
      if (mobilePlayer1ScoreEl) mobilePlayer1ScoreEl.textContent = score1.toString();
      if (mobilePlayer2ScoreEl) mobilePlayer2ScoreEl.textContent = score2.toString();
    }
  }

  function setupResponsiveCanvas() {
    function updateCanvasSize() {
      const isMobile = window.innerWidth < 640; // sm breakpoint
      
      if (isMobile && mobileCanvas) {
        // Mobile: use separate mobile canvas
        const maxWidth = Math.min(window.innerWidth - 32, 350); // 16px padding on each side
        const aspectRatio = 400 / 800; // original height / width
        mobileCanvas.width = maxWidth;
        mobileCanvas.height = maxWidth * aspectRatio;
        
        console.log(`📱 Mobile canvas resized: ${mobileCanvas.width}x${mobileCanvas.height}`);
      } else {
        // Desktop: original size
        canvas.width = 800;
        canvas.height = 400;
        
        console.log(`🖥️ Desktop canvas resized: ${canvas.width}x${canvas.height}`);
      }
    }
    
    // Initial setup
    updateCanvasSize();
    
    // Handle window resize with debouncing
    let resizeTimeout: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateCanvasSize, 100) as any;
    });
  }

  function setupMobileControls() {
    let moveInterval: number | null = null;
    let currentDirection: 'up' | 'down' | null = null;

    // Mobile up button
    if (mobileUpBtn) {
      // Touch start - begin moving up
      mobileUpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        currentDirection = 'up';
        startContinuousMovement();
      });

      // Touch end - stop moving
      mobileUpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      // Touch cancel - stop moving (important for when touch is interrupted)
      mobileUpBtn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      // Touch leave - stop moving (when finger slides off button)
      mobileUpBtn.addEventListener('touchleave', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      // Also handle mouse events for testing on desktop
      mobileUpBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        currentDirection = 'up';
        startContinuousMovement();
      });

      mobileUpBtn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      mobileUpBtn.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });
    }

    // Mobile down button
    if (mobileDownBtn) {
      // Touch start - begin moving down
      mobileDownBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        currentDirection = 'down';
        startContinuousMovement();
      });

      // Touch end - stop moving
      mobileDownBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      // Touch cancel - stop moving (important for when touch is interrupted)
      mobileDownBtn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      // Touch leave - stop moving (when finger slides off button)
      mobileDownBtn.addEventListener('touchleave', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      // Also handle mouse events for testing on desktop
      mobileDownBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        currentDirection = 'down';
        startContinuousMovement();
      });

      mobileDownBtn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });

      mobileDownBtn.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        stopContinuousMovement();
      });
    }

    function startContinuousMovement() {
      if (moveInterval) return; // Already moving
      
      // Move immediately
      handleMobileMovement();
      
      // Continue moving every 16ms (60fps)
      moveInterval = setInterval(handleMobileMovement, 16) as any;
    }

    function stopContinuousMovement() {
      if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
      }
      currentDirection = null;
    }

    function handleMobileMovement() {
      if (!currentRoom || !gameState || gameState.gameOver || !currentDirection || myPlayerId === null) return;
      
      const myPaddle = gameState.paddles[myPlayerId];
      if (!myPaddle) return;

      const moveSpeed = 8; // Adjust speed as needed
      let newY = myPaddle.y;

      if (currentDirection === 'up') {
        newY = Math.max(0, myPaddle.y - moveSpeed);
      } else if (currentDirection === 'down') {
        // Use original canvas dimensions (400px height) for game logic
        newY = Math.min(400 - 100, myPaddle.y + moveSpeed); // 100 is paddle height, 400 is game height
      }

      if (newY !== myPaddle.y) {
        gameService.movePlayer(currentRoom.roomId, newY);
      }
    }

    // Prevent scrolling when touching game controls
    document.addEventListener('touchmove', (e) => {
      if (e.target === mobileUpBtn || e.target === mobileDownBtn) {
        e.preventDefault();
      }
    }, { passive: false });

    // Stop movement when page becomes hidden (tab switch, app backgrounded, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopContinuousMovement();
      }
    });

    // Stop movement when window loses focus
    window.addEventListener('blur', () => {
      stopContinuousMovement();
    });
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
    
    const playerIds = Object.keys(gameState.score).map(id => parseInt(id)).sort();
    if (playerIds.length < 2) return;

    try {
      const [player1, player2] = await Promise.all([
        userService.getUserById(playerIds[0]),
        userService.getUserById(playerIds[1])
      ]);

      // Update desktop elements
      if (player1NameEl) player1NameEl.textContent = player1?.username || `WARRIOR ${playerIds[0]}`;
      if (player2NameEl) player2NameEl.textContent = player2?.username || `WARRIOR ${playerIds[1]}`;
      if (player1InitialEl) player1InitialEl.textContent = player1?.username?.[0]?.toUpperCase() || 'W1';
      if (player2InitialEl) player2InitialEl.textContent = player2?.username?.[0]?.toUpperCase() || 'W2';
      
      // Update mobile elements
      if (mobilePlayer1NameEl) mobilePlayer1NameEl.textContent = player1?.username || `WARRIOR ${playerIds[0]}`;
      if (mobilePlayer2NameEl) mobilePlayer2NameEl.textContent = player2?.username || `WARRIOR ${playerIds[1]}`;
      if (mobilePlayer1InitialEl) mobilePlayer1InitialEl.textContent = player1?.username?.[0]?.toUpperCase() || 'W1';
      if (mobilePlayer2InitialEl) mobilePlayer2InitialEl.textContent = player2?.username?.[0]?.toUpperCase() || 'W2';
    } catch (e) {
      console.error('Error updating player names:', e);
    }
  }

  // Initialize player names from room data immediately
  async function initRoomPlayerNames() {
    if (!currentRoom?.players || currentRoom.players.length < 2) {
      console.log('⚠️ Not enough players in room for name display');
      return;
    }

    console.log('🎮 Initializing player names from room data:', currentRoom.players);

    try {
      const [player1, player2] = await Promise.all([
        userService.getUserById(currentRoom.players[0]),
        userService.getUserById(currentRoom.players[1])
      ]);

      // Update desktop elements
      if (player1NameEl) player1NameEl.textContent = player1?.username || `WARRIOR ${currentRoom.players[0]}`;
      if (player2NameEl) player2NameEl.textContent = player2?.username || `WARRIOR ${currentRoom.players[1]}`;
      if (player1InitialEl) player1InitialEl.textContent = player1?.username?.[0]?.toUpperCase() || 'W1';
      if (player2InitialEl) player2InitialEl.textContent = player2?.username?.[0]?.toUpperCase() || 'W2';
      
      // Update mobile elements
      if (mobilePlayer1NameEl) mobilePlayer1NameEl.textContent = player1?.username || `WARRIOR ${currentRoom.players[0]}`;
      if (mobilePlayer2NameEl) mobilePlayer2NameEl.textContent = player2?.username || `WARRIOR ${currentRoom.players[1]}`;
      if (mobilePlayer1InitialEl) mobilePlayer1InitialEl.textContent = player1?.username?.[0]?.toUpperCase() || 'W1';
      if (mobilePlayer2InitialEl) mobilePlayer2InitialEl.textContent = player2?.username?.[0]?.toUpperCase() || 'W2';
      
      // Show initial scores as 0-0
      if (player1ScoreEl) player1ScoreEl.textContent = '0';
      if (player2ScoreEl) player2ScoreEl.textContent = '0';
      if (mobilePlayer1ScoreEl) mobilePlayer1ScoreEl.textContent = '0';
      if (mobilePlayer2ScoreEl) mobilePlayer2ScoreEl.textContent = '0';
      
      console.log('🎮 Player names initialized:', {
        player1: player1?.username,
        player2: player2?.username
      });
    } catch (e) {
      console.error('Error initializing player names:', e);
    }
  }
}