import { AppState, RoomInfo } from "../../core/AppState.js";
import { GameService } from "../../services/GameService.js";
import { UserService } from "../../services/UserService.js";
import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";
import { WebSocketManager } from "../../core/WebSocketManager.js";

declare global {
  var router: Router;
}

const PADDLE_MOVE_SPEED = 15;

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [userId: number]: { x: number; y: number; width: number; height: number } };
  score: { [userId: number]: number };
  gameOver: boolean;
}

const PONG_3D_CONFIG = {
  TABLE: { width: 12, height: 0.15, depth: 6 },
  PADDLE: { width: 0.2, height: 0.4, depth: 1.2 },
  BALL: { radius: 0.12 },
  BORDER_THICKNESS: 0.15,
  CAMERA: {
    DEFAULT_POSITION: { x: 0, y: 8, z: 6 },
    MIN_DISTANCE: 5,
    MAX_DISTANCE: 15,
    MIN_BETA: 0.1,
    MAX_BETA: Math.PI / 2 - 0.1
  },
  COLORS: {
    TABLE: { r: 0.1, g: 0.2, b: 0.1 },
    BORDER: { r: 0.2, g: 1, b: 0.2 },
    LEFT_PADDLE: { r: 0, g: 0.8, b: 1 },
    RIGHT_PADDLE: { r: 1, g: 0.2, b: 0.3 },
    BALL: { r: 1, g: 1, b: 1 }, // Bright white
    BORDER_FLASH: { r: 1, g: 0, b: 1 }, // Magenta flash
    PADDLE_FLASH: { r: 1, g: 1, b: 0 }, // Yellow flash
    SCORE_FLASH: { r: 0, g: 1, b: 0 }, // Green score flash
    // Particle effects colors
    PARTICLES: {
      HIT: { r: 1, g: 1, b: 0 }, // Yellow hit particles
      SCORE: { r: 0, g: 1, b: 0 }, // Green score particles
      TRAIL: { r: 0.5, g: 0.8, b: 1 } // Blue trail particles
    }
  }
};

interface Player {
  id: number;
  name: string;
  isLeft: boolean;
}

let engine: any = null;
let scene: any = null;
let camera: any = null;
let glowLayer: any = null;

let table: any = null;
let borders: any[] = [];
let paddle1: any = null;
let paddle2: any = null;
let ball: any = null;
let ballTrail: any = null;

let tableMat: any = null;
let borderMats: any[] = [];
let paddle1Mat: any = null;
let paddle2Mat: any = null;
let ballMat: any = null;

let mainLight: any = null;
let paddle1Light: any = null;
let paddle2Light: any = null;
let ballLight: any = null;
let ambientLight: any = null;

let hitParticles: any = null;
let scoreParticles: any = null;
let ballTrailParticles: any = null;

let borderFlashTimes: number[] = [0, 0, 0, 0];
let paddleFlashTimes: number[] = [0, 0];
let ballColorIndex = 0;
let lastBallPosition = { x: 0, y: 0, z: 0 };

let controlsEnabled = false;
let flashEffectsEnabled = false;
let warmupTimer: number | null = null;

let gameState: GameState | null = {
  ball: { x: 400, y: 200, dx: 3, dy: 2 },
  paddles: {
    1: { x: -10, y: 150, width: 20, height: 100 },
    2: { x: 790, y: 150, width: 20, height: 100 }
  },
  score: { 1: 0, 2: 0 },
  gameOver: false
};

let players: Player[] = [];
let myPlayerId: number | null = null;
let keysPressed: { [key: string]: boolean } = {};
let pauseCountdownTimer: number | null = null;
let mobileControlDirection: 'up' | 'down' | null = null;
let mobileControlInterval: number | null = null;
let keyboardControlInterval: number | null = null;
let lastPaddlePosition: number | null = null;

let player1Avatar: string | null = null;
let player2Avatar: string | null = null;

let resizeHandler: (() => void) | null = null;

function initResponsiveLayout() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                  (window.innerWidth <= 768 && 'ontouchstart' in window);

  console.log('📱 Initializing responsive layout:', {
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    hasTouchSupport: 'ontouchstart' in window,
    isMobile
  });

  const mobileLayout = document.getElementById('mobile-layout');
  const desktopLayout = document.getElementById('desktop-layout');

  if (isMobile) {
    if (mobileLayout) mobileLayout.style.display = 'block';
    if (desktopLayout) desktopLayout.style.display = 'none';
    console.log('📱 Mobile layout activated');
  } else {
    if (mobileLayout) mobileLayout.style.display = 'none';
    if (desktopLayout) desktopLayout.style.display = 'flex';
    console.log('🖥️ Desktop layout activated');
  }
}

export async function init() {
  initResponsiveLayout();

  const wsManager = WebSocketManager.getInstance();
  const currentAppState = AppState.getInstance();

  if (!wsManager.isConnected()) {
    const currentRoom = currentAppState.getCurrentRoom();
    const userToken = localStorage.getItem('authToken');

    if (currentRoom && userToken) {
      console.log('🔄 Remote-game: Page reloaded, attempting to reconnect and rejoin room...');

      try {
        wsManager.connect(userToken);
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);

          const onConnected = () => {
            clearTimeout(timeout);
            wsManager.off('connected', onConnected);
            wsManager.off('error', onError);
            resolve(true);
          };

          const onError = (error: any) => {
            clearTimeout(timeout);
            wsManager.off('connected', onConnected);
            wsManager.off('error', onError);
            reject(error);
          };

          wsManager.on('connected', onConnected);
          wsManager.on('error', onError);
        });

        const gameService = new GameService();
        gameService.reconnectToGame();

        console.log('✅ Remote-game: Successfully reconnected to WebSocket');
        notify('Reconnecting to game...');

      } catch (error) {
        console.error('❌ Remote-game: Failed to reconnect:', error);
        notify('Failed to reconnect. Returning to home...');
        currentAppState.clearCurrentRoom();
        window.router.navigate('home');
        return;
      }
    } else {
      console.log('🔄 Remote-game: No room data or token, redirecting to home');
      window.router.navigate('home');
      return;
    }
  }

  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    notify('3D engine not available. Please refresh the page.');
    return;
  }

  const desktopCanvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const mobileCanvas = document.getElementById('mobile-game-canvas') as HTMLCanvasElement | null;

  if (!desktopCanvas && !mobileCanvas) {
    console.error('No canvas found');
    notify('Game canvas not found!');
    return;
  }

  const player1NameEl = document.getElementById('player1-name');
  const player2NameEl = document.getElementById('player2-name');
  const player1InitialEl = document.getElementById('player1-initial');
  const player2InitialEl = document.getElementById('player2-initial');
  const player1ScoreEl = document.getElementById('player1-score');
  const player2ScoreEl = document.getElementById('player2-score');
  const roomIdEl = document.getElementById('room-id');
  const gameStatusEl = document.getElementById('game-status');
  const leaveGameBtn = document.getElementById('leave-game-btn');

  const pauseMessageEl = document.getElementById('pause-message');
  const pauseTextEl = document.getElementById('pause-text');
  const pauseCountdownEl = document.getElementById('pause-countdown');

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

  const mobilePauseMessageEl = document.getElementById('mobile-pause-message');
  const mobilePauseTextEl = document.getElementById('mobile-pause-text');
  const mobilePauseCountdownEl = document.getElementById('mobile-pause-countdown');

  const gameService = new GameService();
  const userService = new UserService();
  let currentRoom = currentAppState.getCurrentRoom();

  if (!currentRoom) {
    notify('No room found!');
    router.navigate('home');
    return;
  }

  if (roomIdEl) roomIdEl.textContent = `ROOM: ${currentRoom.roomId}`;
  if (leaveGameBtn) leaveGameBtn.addEventListener('click', handleLeaveGame);
  if (mobileLeaveBtn) mobileLeaveBtn.addEventListener('click', handleLeaveGame);

  init3DScene();

  setupMobileControls();
  setupKeyboardControls();

  initPlayerInfo();
  initRoomPlayerNames();

  gameService.onStateUpdate((data) => {
    if (gameStatusEl) gameStatusEl.textContent = ' BATTLE ';
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = ' BATTLE ';

    gameState = data.state;
    update3DGameState();
    updateScores();
    updatePlayerNames();
  });

  gameService.onGameStarted((data) => {
    if (gameStatusEl) gameStatusEl.textContent = ' BATTLE ';
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = ' BATTLE ';

    if (data.players && currentRoom) {
      console.log('🎮 Updating room players order from game-started event:', data.players);
      console.log('🎮 Previous room players order:', currentRoom.players);

      const updatedRoom = {
        ...currentRoom,
        players: data.players
      };
      currentAppState.setCurrentRoom(updatedRoom);
      currentRoom = updatedRoom;

      console.log('🎮 Room players order updated to:', currentRoom.players);
      console.log('🎮 CONSISTENT ORDER - LEFT (BLUE):', currentRoom.players[0], ', RIGHT (RED):', currentRoom.players[1]);
    }

    players = data.players || [];
    setTimeout(() => updatePlayerNames(), 100);
  });

  gameService.onGameError((data) => {
    if (gameStatusEl) gameStatusEl.textContent = `❌ ERROR: ${data.message}`;
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = `❌ ERROR`;
  });

  gameService.onPlayerLeft((data: any) => {
    if (data.isTournamentMatch && data.tournamentId) {
      console.log('🏆 Tournament player left:', data);
      notify(`Player ${data.leftPlayer} left the match. You win! Returning to tournament...`);
      currentAppState.updateTournamentStatus('active', data.round);
      currentAppState.clearCurrentRoom();
      cleanup3D();
      router.navigate('tournament');
    } else {
      notify(`Player ${data.leftPlayer} left the game.`);
      currentAppState.clearCurrentRoom();
      cleanup3D();
      router.navigate('home');
    }
  });

  gameService.onGameOver((data: any) => {
    if (data.isTournamentMatch && data.tournamentId) {
      console.log('🏆 Tournament match completed:', data);
      notify(data.message + ' Returning to tournament...');
      currentAppState.updateTournamentStatus('active', data.round);
      currentAppState.clearCurrentRoom();

      localStorage.setItem('lastTournamentMatchResult', JSON.stringify({
        winner: data.winner,
        finalScore: data.finalScore,
        message: data.message,
        round: data.round,
        timestamp: Date.now()
      }));

      cleanup3D();
      router.navigate('tournament');
    } else {
      localStorage.setItem('gameResult', JSON.stringify({
        winner: data.winner,
        finalScore: data.finalScore,
        message: data.message,
        playerOrder: currentRoom?.players || [], // Add room players order for consistent display
        timestamp: Date.now()
      }));
      currentAppState.clearCurrentRoom();
      cleanup3D();
      router.navigate('end-game');
    }
  });

  gameService.onGamePaused((data: any) => {
    console.log('⏸️ Game paused:', data);
    showPauseMessage(data.message, data.timeoutSeconds);
  });

  gameService.onGameResumed((data: any) => {
    console.log('▶️ Game resumed:', data);
    hidePauseMessage();
  });

  wsManager.on('room-state', (data: any) => {
    console.log('🎮 REMOTE-GAME: Room state received:', data);
    if (data.roomId && data.state) {
      gameState = data.state;
      update3DGameState();
      updateScores();
      updatePlayerNames();
    }
  });

  gameService.onPlayerReconnected((data: any) => {
    console.log('🔄 Player reconnected:', data);
    notify(`Player ${data.playerId} reconnected`, 'green');
  });

  gameService.onGameInvite((data: any) => {
    console.log('🎮 REMOTE-GAME: Game invite received during game:', data);
  });

  wsManager.on('player-move', (data: any) => {
    if (data.userId && data.y !== undefined && gameState) {
      gameState.paddles[data.userId] = {
        ...gameState.paddles[data.userId],
        y: data.y
      };
      update3DGameState();
    }
  });

  wsManager.on('flash-effect', (data: any) => {
    console.log('💥 Flash effect received from server:', data);
    if (data.flash) {
      handleServerFlashEffect(data.flash);
    }
  });

  wsManager.on('game-update', (data: any) => {
    console.log('🎮 REMOTE-GAME: Game update received:', data);
    if (data.state) {
      gameState = data.state;
      update3DGameState();
      updateScores();
    }
  });

  wsManager.on('game-end', (data: any) => {
    console.log('🎮 REMOTE-GAME: Game end received:', data);
    // This is handled by gameService.onGameOver, but adding as backup
  });

  const tournamentService = new (await import('../../services/TournamentService.js')).TournamentService();
  tournamentService.onTournamentEnded((data: any) => {
    console.log('🏆 Tournament ended during game:', data);
    const isWinner = data.winnerId === myPlayerId;
    const message = isWinner
      ? '🎉 Congratulations! You won the tournament!'
      : `🏆 Tournament ended. Winner: ${data.winnerUsername}`;

    notify(message);

    gameState = null;
    players = [];
    myPlayerId = null;

    if (mobileControlInterval) {
      clearInterval(mobileControlInterval);
      mobileControlInterval = null;
    }

    if (pauseCountdownTimer) {
      clearTimeout(pauseCountdownTimer);
      pauseCountdownTimer = null;
    }

    setTimeout(() => {
      currentAppState.clearCurrentRoom();
      currentAppState.clearCurrentTournament();
      cleanup3D();

      localStorage.setItem('tournamentResult', JSON.stringify({
        isWinner,
        winnerUsername: data.winnerUsername,
        message: data.message,
        timestamp: Date.now()
      }));

      router.navigate('end-game');
    }, 3000);
  });

  gameService.onPlayerReconnected((data: any) => {
    console.log('🔄 Player reconnected:', data);
    hidePauseMessage();
  });

  startCountdown();

  function init3DScene() {
    console.log('🎮 Initializing Enhanced 3D Pong Arena...');

    if (engine) {
      console.log('🧹 Cleaning up existing engine...');
      cleanup3D();
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    (window.innerWidth <= 768 && 'ontouchstart' in window);
    const targetCanvas = (isMobile && mobileCanvas) ? mobileCanvas : desktopCanvas;

    console.log('🎮 Canvas selection:', { isMobile, targetCanvas: targetCanvas?.id });

    if (!targetCanvas) {
      console.error('No target canvas available');
      return;
    }

    engine = new BABYLON.Engine(targetCanvas, true, {
      antialias: true,
      adaptToDeviceRatio: true,
      powerPreference: "high-performance",
      stencil: true
    });

    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    camera = new BABYLON.ArcRotateCamera('camera',
      -Math.PI / 2,          // Alpha: -90 degrees (opposite side view)
      Math.PI / 4,           // Beta: 45 degrees (45 degree angle from top)
      12,                    // Radius: distance from target
      BABYLON.Vector3.Zero(), // Target: center of the table
      scene
    );

    camera.inputs.clear();

    camera.setTarget(BABYLON.Vector3.Zero());

    console.log('🎮 Fixed camera setup: 45° view from opposite side');


    glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.8;
    glowLayer.blurKernelSize = 64;

    createEnhancedTable();
    createEnhancedBorders();
    createEnhancedPaddles();
    createEnhancedBall();
    createEnhancedLighting();
    createParticleSystems();

    setupResponsiveCanvas(targetCanvas);

    engine.runRenderLoop(() => {
      handleEnhancedAnimations();
      scene.render();
    });

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }

    resizeHandler = () => {
      if (engine) {
        engine.resize();
        setupResponsiveCanvas(targetCanvas);
      }
      initResponsiveLayout();
    };

    window.addEventListener('resize', resizeHandler);

    console.log('✅ Enhanced 3D Pong Arena initialized successfully');
  }

  function createEnhancedTable() {
    table = BABYLON.MeshBuilder.CreateBox('table', {
      width: PONG_3D_CONFIG.TABLE.width,
      height: PONG_3D_CONFIG.TABLE.height,
      depth: PONG_3D_CONFIG.TABLE.depth
    }, scene);

    tableMat = new BABYLON.StandardMaterial('tableMat', scene);
    tableMat.diffuseColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.TABLE.r, PONG_3D_CONFIG.COLORS.TABLE.g, PONG_3D_CONFIG.COLORS.TABLE.b);
    tableMat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.TABLE.r, PONG_3D_CONFIG.COLORS.TABLE.g, PONG_3D_CONFIG.COLORS.TABLE.b);
    tableMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    tableMat.roughness = 0.8;
    table.material = tableMat;
    table.position.y = -PONG_3D_CONFIG.TABLE.height / 2;

    const centerLine = BABYLON.MeshBuilder.CreateBox('centerLine', {
      width: 0.05,
      height: 0.02,
      depth: PONG_3D_CONFIG.TABLE.depth * 0.8
    }, scene);

    const centerLineMat = new BABYLON.StandardMaterial('centerLineMat', scene);
    centerLineMat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BORDER.r, PONG_3D_CONFIG.COLORS.BORDER.g, PONG_3D_CONFIG.COLORS.BORDER.b);
    centerLineMat.alpha = 0.6;
    centerLine.material = centerLineMat;
    centerLine.position.y = 0.01;
    glowLayer.addIncludedOnlyMesh(centerLine);
  }

  function createEnhancedBorders() {
    const borderThickness = PONG_3D_CONFIG.BORDER_THICKNESS;
    const tableWidth = PONG_3D_CONFIG.TABLE.width;
    const tableDepth = PONG_3D_CONFIG.TABLE.depth;

    const borderConfigs = [
      { name: 'left', size: { width: borderThickness, height: 0.3, depth: tableDepth + borderThickness * 2 }, pos: { x: -tableWidth/2 - borderThickness/2, y: 0.1, z: 0 } },
      { name: 'right', size: { width: borderThickness, height: 0.3, depth: tableDepth + borderThickness * 2 }, pos: { x: tableWidth/2 + borderThickness/2, y: 0.1, z: 0 } },
      { name: 'top', size: { width: tableWidth, height: 0.3, depth: borderThickness }, pos: { x: 0, y: 0.1, z: tableDepth/2 + borderThickness/2 } },
      { name: 'bottom', size: { width: tableWidth, height: 0.3, depth: borderThickness }, pos: { x: 0, y: 0.1, z: -tableDepth/2 - borderThickness/2 } }
    ];

    borders = [];
    borderMats = [];

    borderConfigs.forEach((config, index) => {
      const border = BABYLON.MeshBuilder.CreateBox(config.name + 'Border', config.size, scene);
      border.position = new BABYLON.Vector3(config.pos.x, config.pos.y, config.pos.z);

      const borderMat = new BABYLON.StandardMaterial(config.name + 'BorderMat', scene);
      borderMat.diffuseColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BORDER.r, PONG_3D_CONFIG.COLORS.BORDER.g, PONG_3D_CONFIG.COLORS.BORDER.b);
      borderMat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BORDER.r, PONG_3D_CONFIG.COLORS.BORDER.g, PONG_3D_CONFIG.COLORS.BORDER.b);
      borderMat.specularColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BORDER.r, PONG_3D_CONFIG.COLORS.BORDER.g, PONG_3D_CONFIG.COLORS.BORDER.b);
      borderMat.alpha = 0.8;
      border.material = borderMat;

      borders.push(border);
      borderMats.push(borderMat);
      glowLayer.addIncludedOnlyMesh(border);
    });
  }

  function createEnhancedPaddles() {
    const paddleConfig = PONG_3D_CONFIG.PADDLE;

    paddle1 = BABYLON.MeshBuilder.CreateBox('paddle1', {
      width: paddleConfig.width,
      height: paddleConfig.height,
      depth: paddleConfig.depth
    }, scene);

    paddle1Mat = new BABYLON.StandardMaterial('paddle1Mat', scene);
    paddle1Mat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    paddle1Mat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.LEFT_PADDLE.r, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.g, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.b);
    paddle1Mat.specularColor = new BABYLON.Color3(1, 1, 1);
    paddle1Mat.specularPower = 64;
    paddle1Mat.alpha = 0.9;
    paddle1.material = paddle1Mat;

    paddle1.position.x = -PONG_3D_CONFIG.TABLE.width/2 + 0.5; // Left side
    paddle1.position.y = paddleConfig.height/2; // On table surface
    paddle1.position.z = 0; // Center position initially
    glowLayer.addIncludedOnlyMesh(paddle1);

    paddle2 = BABYLON.MeshBuilder.CreateBox('paddle2', {
      width: paddleConfig.width,
      height: paddleConfig.height,
      depth: paddleConfig.depth
    }, scene);

    paddle2Mat = new BABYLON.StandardMaterial('paddle2Mat', scene);
    paddle2Mat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    paddle2Mat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.r, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.g, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.b);
    paddle2Mat.specularColor = new BABYLON.Color3(1, 1, 1);
    paddle2Mat.specularPower = 64;
    paddle2Mat.alpha = 0.9;
    paddle2.material = paddle2Mat;

    paddle2.position.x = PONG_3D_CONFIG.TABLE.width/2 - 0.5; // Right side
    paddle2.position.y = paddleConfig.height/2; // On table surface
    paddle2.position.z = 0; // Center position initially
    glowLayer.addIncludedOnlyMesh(paddle2);
  }

  function createEnhancedBall() {
    ball = BABYLON.MeshBuilder.CreateSphere('pongBall', {
      diameter: PONG_3D_CONFIG.BALL.radius * 2,
      segments: 16
    }, scene);

    ballMat = new BABYLON.StandardMaterial('ballMat', scene);
    ballMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ballMat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BALL.r, PONG_3D_CONFIG.COLORS.BALL.g, PONG_3D_CONFIG.COLORS.BALL.b);
    ballMat.specularColor = new BABYLON.Color3(1, 1, 1);
    ballMat.specularPower = 128;
    ball.material = ballMat;
    ball.position.y = PONG_3D_CONFIG.BALL.radius;
    glowLayer.addIncludedOnlyMesh(ball);

    lastBallPosition = { x: 0, y: PONG_3D_CONFIG.BALL.radius, z: 0 };
  }

  function createEnhancedLighting() {
    mainLight = new BABYLON.DirectionalLight("mainLight", new BABYLON.Vector3(-0.5, -1, -0.5), scene);
    mainLight.diffuse = new BABYLON.Color3(0.8, 0.9, 1);
    mainLight.intensity = 0.5;

    ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.diffuse = new BABYLON.Color3(0.2, 0.3, 0.4);
    ambientLight.intensity = 0.3;

    paddle1Light = new BABYLON.PointLight("paddle1Light", new BABYLON.Vector3(-5, 2, 0), scene);
    paddle1Light.diffuse = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.LEFT_PADDLE.r, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.g, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.b);
    paddle1Light.intensity = 0.8;
    paddle1Light.range = 3;

    paddle2Light = new BABYLON.PointLight("paddle2Light", new BABYLON.Vector3(5, 2, 0), scene);
    paddle2Light.diffuse = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.r, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.g, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.b);
    paddle2Light.intensity = 0.8;
    paddle2Light.range = 3;

    ballLight = new BABYLON.PointLight("ballLight", new BABYLON.Vector3(0, 1, 0), scene);
    ballLight.diffuse = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BALL.r, PONG_3D_CONFIG.COLORS.BALL.g, PONG_3D_CONFIG.COLORS.BALL.b);
    ballLight.intensity = 1.0;
    ballLight.range = 2;
  }

  function createParticleSystems() {
    const BABYLON = (window as any).BABYLON;

    ballTrailParticles = new BABYLON.ParticleSystem("ballTrail", 50, scene);
    ballTrailParticles.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", scene);
    ballTrailParticles.emitter = ball;
    ballTrailParticles.minEmitBox = new BABYLON.Vector3(-0.05, -0.05, -0.05);
    ballTrailParticles.maxEmitBox = new BABYLON.Vector3(0.05, 0.05, 0.05);
    ballTrailParticles.color1 = new BABYLON.Color4(PONG_3D_CONFIG.COLORS.PARTICLES.TRAIL.r, PONG_3D_CONFIG.COLORS.PARTICLES.TRAIL.g, PONG_3D_CONFIG.COLORS.PARTICLES.TRAIL.b, 1);
    ballTrailParticles.color2 = new BABYLON.Color4(PONG_3D_CONFIG.COLORS.PARTICLES.TRAIL.r, PONG_3D_CONFIG.COLORS.PARTICLES.TRAIL.g, PONG_3D_CONFIG.COLORS.PARTICLES.TRAIL.b, 0);
    ballTrailParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    ballTrailParticles.minSize = 0.05;
    ballTrailParticles.maxSize = 0.1;
    ballTrailParticles.minLifeTime = 0.2;
    ballTrailParticles.maxLifeTime = 0.5;
    ballTrailParticles.emitRate = 100;
    ballTrailParticles.minEmitPower = 0.1;
    ballTrailParticles.maxEmitPower = 0.3;
    ballTrailParticles.start();

    hitParticles = new BABYLON.ParticleSystem("hitParticles", 100, scene);
    hitParticles.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", scene);
    hitParticles.emitter = new BABYLON.Vector3(0, 0, 0);
    hitParticles.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
    hitParticles.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
    hitParticles.color1 = new BABYLON.Color4(PONG_3D_CONFIG.COLORS.PARTICLES.HIT.r, PONG_3D_CONFIG.COLORS.PARTICLES.HIT.g, PONG_3D_CONFIG.COLORS.PARTICLES.HIT.b, 1);
    hitParticles.color2 = new BABYLON.Color4(PONG_3D_CONFIG.COLORS.PARTICLES.HIT.r, PONG_3D_CONFIG.COLORS.PARTICLES.HIT.g, PONG_3D_CONFIG.COLORS.PARTICLES.HIT.b, 0);
    hitParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    hitParticles.minSize = 0.03;
    hitParticles.maxSize = 0.08;
    hitParticles.minLifeTime = 0.3;
    hitParticles.maxLifeTime = 0.8;
    hitParticles.emitRate = 0;
    hitParticles.minEmitPower = 0.5;
    hitParticles.maxEmitPower = 1.5;
    hitParticles.gravity = new BABYLON.Vector3(0, -2, 0);
    hitParticles.start();

    scoreParticles = new BABYLON.ParticleSystem("scoreParticles", 200, scene);
    scoreParticles.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", scene);
    scoreParticles.emitter = new BABYLON.Vector3(0, 1, 0);
    scoreParticles.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
    scoreParticles.maxEmitBox = new BABYLON.Vector3(0.2, 0.5, 0.2);
    scoreParticles.color1 = new BABYLON.Color4(PONG_3D_CONFIG.COLORS.PARTICLES.SCORE.r, PONG_3D_CONFIG.COLORS.PARTICLES.SCORE.g, PONG_3D_CONFIG.COLORS.PARTICLES.SCORE.b, 1);
    scoreParticles.color2 = new BABYLON.Color4(PONG_3D_CONFIG.COLORS.PARTICLES.SCORE.r, PONG_3D_CONFIG.COLORS.PARTICLES.SCORE.g, PONG_3D_CONFIG.COLORS.PARTICLES.SCORE.b, 0);
    scoreParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    scoreParticles.minSize = 0.05;
    scoreParticles.maxSize = 0.15;
    scoreParticles.minLifeTime = 1.0;
    scoreParticles.maxLifeTime = 2.0;
    scoreParticles.emitRate = 0; // Manual emission only
    scoreParticles.minEmitPower = 1.0;
    scoreParticles.maxEmitPower = 3.0;
    scoreParticles.gravity = new BABYLON.Vector3(0, -1, 0);
    scoreParticles.start();
  }

  function setupResponsiveCanvas(targetCanvas: HTMLCanvasElement) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    (window.innerWidth <= 768 && 'ontouchstart' in window);

    console.log('📱 Device detection:', {
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      hasTouchSupport: 'ontouchstart' in window,
      isMobile
    });

    if (isMobile && mobileCanvas) {
      const maxWidth = Math.min(window.innerWidth - 32, 400);
      const aspectRatio = 0.75;
      mobileCanvas.width = maxWidth;
      mobileCanvas.height = maxWidth * aspectRatio;

      const mobileLayout = document.getElementById('mobile-layout');
      const desktopLayout = document.getElementById('desktop-layout');

      if (mobileLayout) {
        mobileLayout.style.display = 'block';
      }
      if (desktopLayout) {
        desktopLayout.style.display = 'none';
      }

      console.log(`📱 Enhanced 3D Mobile canvas: ${mobileCanvas.width}x${mobileCanvas.height}`);
    } else if (desktopCanvas) {
      desktopCanvas.width = 1000;
      desktopCanvas.height = 600;

      const mobileLayout = document.getElementById('mobile-layout');
      const desktopLayout = document.getElementById('desktop-layout');

      if (mobileLayout) {
        mobileLayout.style.display = 'none';
      }
      if (desktopLayout) {
        desktopLayout.style.display = 'flex';
      }

      console.log(`🖥️ Enhanced 3D Desktop canvas: ${desktopCanvas.width}x${desktopCanvas.height}`);
    }

    if (engine) {
      engine.resize();
    }
  }

  function handleEnhancedAnimations() {
    if (!scene || !engine) return;

    const deltaTime = engine.getDeltaTime() / 1000;

    handleBorderFlashes(deltaTime);
    handlePaddleFlashes(deltaTime);

    if (paddle1Light && paddle1) {
      paddle1Light.position.x = paddle1.position.x;
      paddle1Light.position.z = paddle1.position.z;
    }
    if (paddle2Light && paddle2) {
      paddle2Light.position.x = paddle2.position.x;
      paddle2Light.position.z = paddle2.position.z;
    }
    if (ballLight && ball) {
      ballLight.position.x = ball.position.x;
      ballLight.position.y = ball.position.y;
      ballLight.position.z = ball.position.z;
    }

    if (ball && gameState) {
      ball.rotation.x += deltaTime * 5;
      ball.rotation.z += deltaTime * 3;
    }
  }

  function handleBorderFlashes(deltaTime: number) {
    if (!flashEffectsEnabled) return;

    borderFlashTimes.forEach((flashTime, index) => {
      if (flashTime > 0) {
        borderFlashTimes[index] -= deltaTime;
        const flashIntensity = Math.max(0, borderFlashTimes[index] / 1.5);

        if (borderMats[index]) {
          borderMats[index].emissiveColor = new BABYLON.Color3(
            PONG_3D_CONFIG.COLORS.BORDER.r + (PONG_3D_CONFIG.COLORS.BORDER_FLASH.r - PONG_3D_CONFIG.COLORS.BORDER.r) * flashIntensity,
            PONG_3D_CONFIG.COLORS.BORDER.g + (PONG_3D_CONFIG.COLORS.BORDER_FLASH.g - PONG_3D_CONFIG.COLORS.BORDER.g) * flashIntensity,
            PONG_3D_CONFIG.COLORS.BORDER.b + (PONG_3D_CONFIG.COLORS.BORDER_FLASH.b - PONG_3D_CONFIG.COLORS.BORDER.b) * flashIntensity
          );
        }
      } else if (borderMats[index]) {
        borderMats[index].emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BORDER.r, PONG_3D_CONFIG.COLORS.BORDER.g, PONG_3D_CONFIG.COLORS.BORDER.b);
      }
    });
  }

  function handlePaddleFlashes(deltaTime: number) {
    if (!flashEffectsEnabled) return;

    if (paddleFlashTimes[0] > 0) {
      paddleFlashTimes[0] -= deltaTime;
      const flashIntensity = Math.max(0, paddleFlashTimes[0] / 1.0);

      if (paddle1Mat) {
        paddle1Mat.emissiveColor = new BABYLON.Color3(
          PONG_3D_CONFIG.COLORS.LEFT_PADDLE.r + (PONG_3D_CONFIG.COLORS.PADDLE_FLASH.r - PONG_3D_CONFIG.COLORS.LEFT_PADDLE.r) * flashIntensity,
          PONG_3D_CONFIG.COLORS.LEFT_PADDLE.g + (PONG_3D_CONFIG.COLORS.PADDLE_FLASH.g - PONG_3D_CONFIG.COLORS.LEFT_PADDLE.g) * flashIntensity,
          PONG_3D_CONFIG.COLORS.LEFT_PADDLE.b + (PONG_3D_CONFIG.COLORS.PADDLE_FLASH.b - PONG_3D_CONFIG.COLORS.LEFT_PADDLE.b) * flashIntensity
        );
      }

      if (paddle1Light) {
        paddle1Light.intensity = 1.5 + 2.0 * flashIntensity;
      }
    } else if (paddle1Mat) {
      paddle1Mat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.LEFT_PADDLE.r, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.g, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.b);
      if (paddle1Light) paddle1Light.intensity = 1.5;
    }

    if (paddleFlashTimes[1] > 0) {
      paddleFlashTimes[1] -= deltaTime;
      const flashIntensity = Math.max(0, paddleFlashTimes[1] / 1.0);

      if (paddle2Mat) {
        paddle2Mat.emissiveColor = new BABYLON.Color3(
          PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.r + (PONG_3D_CONFIG.COLORS.PADDLE_FLASH.r - PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.r) * flashIntensity,
          PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.g + (PONG_3D_CONFIG.COLORS.PADDLE_FLASH.g - PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.g) * flashIntensity,
          PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.b + (PONG_3D_CONFIG.COLORS.PADDLE_FLASH.b - PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.b) * flashIntensity
        );
      }

      if (paddle2Light) {
        paddle2Light.intensity = 1.5 + 2.0 * flashIntensity;
      }
    } else if (paddle2Mat) {
      paddle2Mat.emissiveColor = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.r, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.g, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.b);
      if (paddle2Light) paddle2Light.intensity = 1.5;
    }
  }

  function update3DGameState() {
    if (!gameState || !ball || !paddle1 || !paddle2) return;

    const ballX = ((gameState.ball.x / 800) - 0.5) * PONG_3D_CONFIG.TABLE.width * 0.9;
    const ballZ = ((gameState.ball.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;

    ball.position.x = ballX;
    ball.position.z = ballZ;
    ball.position.y = PONG_3D_CONFIG.BALL.radius;

    if (currentRoom?.players && currentRoom.players.length >= 2) {
      const paddle1Data = gameState.paddles[currentRoom.players[0]];
      if (paddle1Data) {
        const paddleZ = ((paddle1Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;
        const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
        paddle1.position.z = paddleZ + paddleOffset;
        paddle1.position.y = PONG_3D_CONFIG.PADDLE.height/2;
        paddle1.position.x = -PONG_3D_CONFIG.TABLE.width/2 + 0.5; // LEFT side (BLUE)
        console.log(`🎮 Left paddle (BLUE) - Player ${currentRoom.players[0]} at Z: ${paddleZ}`);
      }

      const paddle2Data = gameState.paddles[currentRoom.players[1]];
      if (paddle2Data) {
        const paddleZ = ((paddle2Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;
        const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
        paddle2.position.z = paddleZ + paddleOffset;
        paddle2.position.y = PONG_3D_CONFIG.PADDLE.height/2;
        paddle2.position.x = PONG_3D_CONFIG.TABLE.width/2 - 0.5; // RIGHT side (RED)
        console.log(`🎮 Right paddle (RED) - Player ${currentRoom.players[1]} at Z: ${paddleZ}`);
      }
    }

    checkCollisionEffects();
  }

  function checkCollisionEffects() {
    if (!flashEffectsEnabled || !gameState || !currentRoom?.players || currentRoom.players.length < 2) return;

    const ball = gameState.ball;
    const paddle1 = gameState.paddles[currentRoom.players[0]]; // LEFT paddle (BLUE)
    const paddle2 = gameState.paddles[currentRoom.players[1]]; // RIGHT paddle (RED)

    const ballRadius = 8;
    const paddleMargin = 8;
    const paddleLengthMargin = 5;

    if (ball.y <= ballRadius + 5) {
      borderFlashTimes[3] = 1.5;
      console.log('💥 Ball hit TOP border - flashing');
    } else if (ball.y >= 400 - ballRadius - 5) {
      borderFlashTimes[2] = 1.5;
      console.log('💥 Ball hit BOTTOM border - flashing');
    }

    if (paddle1 && ball.dx < 0) {
      if (ball.x <= paddle1.x + paddle1.width + paddleMargin &&
          ball.x >= paddle1.x - paddleMargin &&
          ball.y + ballRadius >= paddle1.y - paddleLengthMargin &&
          ball.y - ballRadius <= paddle1.y + paddle1.height + paddleLengthMargin) {

        paddleFlashTimes[0] = 1.0; // Flash LEFT paddle (BLUE)
        borderFlashTimes[0] = 0.8; // Flash left border briefly too
        triggerHitParticles(ball.x, ball.y);
        console.log(`💥 Ball hit LEFT paddle (BLUE) - Player ${currentRoom.players[0]} - FLASH TRIGGERED`);
      }
    }

    if (paddle2 && ball.dx > 0) {
      if (ball.x >= paddle2.x - paddleMargin &&
          ball.x <= paddle2.x + paddle2.width + paddleMargin &&
          ball.y + ballRadius >= paddle2.y - paddleLengthMargin &&
          ball.y - ballRadius <= paddle2.y + paddle2.height + paddleLengthMargin) {

        paddleFlashTimes[1] = 1.0; // Flash RIGHT paddle (RED)
        borderFlashTimes[1] = 0.8; // Flash right border briefly too
        triggerHitParticles(ball.x, ball.y);
        console.log(`💥 Ball hit RIGHT paddle (RED) - Player ${currentRoom.players[1]} - FLASH TRIGGERED`);
      }
    }

    if (ball.x < -ballRadius) {
      triggerScoreFlash(currentRoom.players[1]);
      borderFlashTimes[0] = 2.0;
      console.log(`� RIGHT player scored - LEFT border flash`);
    } else if (ball.x > 800 + ballRadius) {
      triggerScoreFlash(currentRoom.players[0]);
      borderFlashTimes[1] = 2.0;
      console.log(`🎯 LEFT player scored - RIGHT border flash`);
    }
  }

  function handleServerFlashEffect(flash: any) {
    if (!flashEffectsEnabled) return;

    console.log(`🎭 Server flash effect: ${flash.type} index ${flash.index} for ${flash.duration}s`);

    switch (flash.type) {
      case 'border':
        if (flash.index >= 0 && flash.index < borderFlashTimes.length) {
          borderFlashTimes[flash.index] = flash.duration;
          console.log(`💥 Border ${flash.index} flash triggered for ${flash.duration}s`);
        }
        break;

      case 'paddle':
        if (flash.index >= 0 && flash.index < paddleFlashTimes.length) {
          paddleFlashTimes[flash.index] = flash.duration;
          console.log(`🏓 Paddle ${flash.index} flash triggered for ${flash.duration}s`);
        }
        break;

      case 'score':
        const playerIndex = currentRoom?.players.indexOf(flash.index);
        if (playerIndex !== undefined && playerIndex >= 0 && playerIndex < paddleFlashTimes.length) {
          paddleFlashTimes[playerIndex] = flash.duration;
          console.log(`🎯 Score flash for player ${flash.index} (index ${playerIndex}) triggered for ${flash.duration}s`);
        }
        break;

      default:
        console.log(`⚠️ Unknown flash effect type: ${flash.type}`);
    }
  }  function triggerHitParticles(x: number, y: number) {
    if (!hitParticles || !scene) return;

    hitParticles.manualEmitCount = 20;
    hitParticles.emitter = new (window as any).BABYLON.Vector3(
      ((x / 800) - 0.5) * PONG_3D_CONFIG.TABLE.width * 0.9,
      PONG_3D_CONFIG.BALL.radius,
      ((y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9
    );
  }

  function triggerScoreFlash(scoringPlayerId: number) {
    const playerIndex = currentRoom?.players.indexOf(scoringPlayerId);
    if (playerIndex !== undefined && playerIndex >= 0) {
      paddleFlashTimes[playerIndex] = 2.0;

      if (scoreParticles && scene) {
        scoreParticles.manualEmitCount = 50;
        const paddleX = playerIndex === 0 ? -PONG_3D_CONFIG.TABLE.width/2 + 0.5 : PONG_3D_CONFIG.TABLE.width/2 - 0.5;
        scoreParticles.emitter = new (window as any).BABYLON.Vector3(paddleX, 1, 0);
      }
    }
  }

  function startCountdown() {
    let count = 3;
    controlsEnabled = false;
    flashEffectsEnabled = false;

    if (gameStatusEl) gameStatusEl.textContent = `⚡ BATTLE STARTS IN ${count}... ⚡`;
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = `⚡ ${count} ⚡`;

    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        if (gameStatusEl) gameStatusEl.textContent = `⚡ BATTLE STARTS IN ${count}... ⚡`;
        if (mobileGameStatusEl) mobileGameStatusEl.textContent = `⚡ ${count} ⚡`;
      } else {
        clearInterval(countdownInterval);

        controlsEnabled = true;
        flashEffectsEnabled = true;
        console.log('🎮 Controls enabled - Battle begins!');

        const isFirstPlayer = currentRoom && currentRoom.players[0] === myPlayerId;
        if (isFirstPlayer && currentRoom) {
          console.log('🎮 Starting game as first player...');
          if (gameStatusEl) gameStatusEl.textContent = '⚡ BATTLE ACTIVE ⚡';
          if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚡ FIGHT ⚡';
          gameService.startGame(currentRoom.roomId);
        } else {
          console.log('🎮 Waiting for game to start...');
          if (gameStatusEl) gameStatusEl.textContent = '⚡ BATTLE ACTIVE ⚡';
          if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚡ FIGHT ⚡';
        }

        setTimeout(() => {
          requestGameState();
        }, 500);
      }
    }, 1000);
  }

  function handleKeyPress() {
    if (!controlsEnabled || !currentRoom || !gameState || gameState.gameOver || myPlayerId === null) return;

    const myPaddle = gameState.paddles[myPlayerId];
    if (!myPaddle) return;

    let newY: number | null = null;
    const paddleHeight = 100;
    const gameHeight = 400;

    const isMovingUp = keysPressed['KeyW'] || keysPressed['ArrowUp'];
    const isMovingDown = keysPressed['KeyS'] || keysPressed['ArrowDown'];

    if (isMovingUp && !isMovingDown) {
      newY = Math.min(gameHeight - paddleHeight - 1, myPaddle.y + PADDLE_MOVE_SPEED);
    } else if (isMovingDown && !isMovingUp) {
      newY = Math.max(1, myPaddle.y - PADDLE_MOVE_SPEED);
    }

    // Only send move message if position actually changed and is different from last sent position
    if (newY !== null && newY !== myPaddle.y && newY !== lastPaddlePosition) {
      lastPaddlePosition = newY;
      gameService.movePlayer(currentRoom.roomId, newY);
      console.log(`🎮 PADDLE: Moving player ${myPlayerId} to Y: ${newY} (prev: ${myPaddle.y})`);
    }
  }

  function requestGameState() {
    if (currentRoom) {
      gameService.requestGameState(currentRoom.roomId);
    }
  }

  function setupKeyboardControls() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const handleWindowBlur = () => {
      console.log('🎮 WINDOW: Focus lost, clearing keys');
      keysPressed = {};
      lastPaddlePosition = null;
    };

    const handleWindowFocus = () => {
      console.log('🎮 WINDOW: Focus regained');
      keysPressed = {};
      lastPaddlePosition = null;
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    keyboardControlInterval = setInterval(() => {
      if (Object.keys(keysPressed).some(key => keysPressed[key])) {
        handleKeyPress();
      }
    }, 32) as any;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }

    if (!keysPressed[e.code]) {
      keysPressed[e.code] = true;
      console.log(`🎮 KEY: ${e.code} pressed`);
      handleKeyPress();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }

    if (keysPressed[e.code]) {
      keysPressed[e.code] = false;
      console.log(`🎮 KEY: ${e.code} released`);

      // Reset last position when key is released to allow immediate re-movement
      if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        lastPaddlePosition = null;
      }
    }
  }

  function setupMobileControls() {
    if (mobileUpBtn) {
      ['touchstart', 'mousedown'].forEach(event => {
        mobileUpBtn!.addEventListener(event, (e) => {
        e.preventDefault();
          mobileControlDirection = 'up';
          startMobileMovement();
      });
      });

      ['touchend', 'touchcancel', 'touchleave', 'mouseup', 'mouseleave'].forEach(event => {
        mobileUpBtn!.addEventListener(event, (e) => {
        e.preventDefault();
          stopMobileMovement();
        });
      });
    }

    if (mobileDownBtn) {
      ['touchstart', 'mousedown'].forEach(event => {
        mobileDownBtn!.addEventListener(event, (e) => {
        e.preventDefault();
          mobileControlDirection = 'down';
          startMobileMovement();
      });
      });

      ['touchend', 'touchcancel', 'touchleave', 'mouseup', 'mouseleave'].forEach(event => {
        mobileDownBtn!.addEventListener(event, (e) => {
        e.preventDefault();
          stopMobileMovement();
        });
      });
    }

    function startMobileMovement() {
      if (mobileControlInterval) return;

      handleMobileMovement();
      mobileControlInterval = setInterval(handleMobileMovement, 32) as any;
    }

    function stopMobileMovement() {
      if (mobileControlInterval) {
        clearInterval(mobileControlInterval);
        mobileControlInterval = null;
      }
      mobileControlDirection = null;
      lastPaddlePosition = null;
    }

    function handleMobileMovement() {
      if (!controlsEnabled || !currentRoom || !gameState || gameState.gameOver || !mobileControlDirection || myPlayerId === null) return;

      const myPaddle = gameState.paddles[myPlayerId];
      if (!myPaddle) return;

      let newY = myPaddle.y;
      const paddleHeight = 100;
      const gameHeight = 400;

      if (mobileControlDirection === 'down') {
        newY = Math.max(1, myPaddle.y - PADDLE_MOVE_SPEED);
      } else if (mobileControlDirection === 'up') {
        newY = Math.min(gameHeight - paddleHeight - 1, myPaddle.y + PADDLE_MOVE_SPEED);
      }

      if (newY !== myPaddle.y && newY !== lastPaddlePosition) {
        lastPaddlePosition = newY;
        gameService.movePlayer(currentRoom.roomId, newY);
        console.log(`🎮 MOBILE: Moving player ${myPlayerId} to Y: ${newY} (prev: ${myPaddle.y})`);
      }
    }

    document.addEventListener('touchmove', (e) => {
      if (e.target === mobileUpBtn || e.target === mobileDownBtn) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopMobileMovement();
      }
    });

    window.addEventListener('blur', () => {
      stopMobileMovement();
    });
  }

  function handleLeaveGame() {
    if (currentRoom) {
      gameService.leaveGame(currentRoom.roomId);
      currentAppState.clearCurrentRoom();
      cleanup3D();
      router.navigate('home');
    }
  }

  function showPauseMessage(message: string, countdownSeconds?: number) {
    if (pauseMessageEl) pauseMessageEl.classList.remove('hidden');
    if (pauseTextEl) pauseTextEl.textContent = message;

    if (mobilePauseMessageEl) mobilePauseMessageEl.classList.remove('hidden');
    if (mobilePauseTextEl) mobilePauseTextEl.textContent = '⏸️ PAUSED';

    if (countdownSeconds) {
      startPauseCountdown(countdownSeconds);
    }
  }

  function hidePauseMessage() {
    if (pauseMessageEl) pauseMessageEl.classList.add('hidden');
    if (mobilePauseMessageEl) mobilePauseMessageEl.classList.add('hidden');

    if (pauseCountdownTimer) {
      clearInterval(pauseCountdownTimer);
      pauseCountdownTimer = null;
    }
  }

  function startPauseCountdown(seconds: number) {
    if (pauseCountdownTimer) {
      clearInterval(pauseCountdownTimer);
    }

    let remaining = seconds;

    const updateCountdown = () => {
      const text = `Reconnecting in ${remaining}s...`;
      if (pauseCountdownEl) pauseCountdownEl.textContent = text;
      if (mobilePauseCountdownEl) mobilePauseCountdownEl.textContent = text;

      remaining--;

      if (remaining < 0) {
        clearInterval(pauseCountdownTimer!);
        pauseCountdownTimer = null;
      }
    };

    updateCountdown();
    pauseCountdownTimer = setInterval(updateCountdown, 1000) as any;
  }

  async function initPlayerInfo() {
    const currentUser = await userService.getCurrentUser();
    myPlayerId = currentUser?.id || null;

    if (myPlayerId && currentRoom?.players) {
      const myPosition = currentRoom.players.indexOf(myPlayerId);
      const side = myPosition === 0 ? 'LEFT (BLUE)' : myPosition === 1 ? 'RIGHT (RED)' : 'UNKNOWN';
      console.log(`🎮 My player ID: ${myPlayerId}, Position: ${side}, Room players order:`, currentRoom.players);
      console.log(`🎮 Player positions - Player 1 (LEFT/BLUE): ${currentRoom.players[0]}, Player 2 (RIGHT/RED): ${currentRoom.players[1]}`);
    }
  }

  async function updatePlayerNames() {
    if (!gameState?.score || !currentRoom?.players || currentRoom.players.length < 2) return;

    try {
      const [player1, player2] = await Promise.all([
        userService.getUserById(currentRoom.players[0]), // LEFT player (BLUE)
        userService.getUserById(currentRoom.players[1])  // RIGHT player (RED)
      ]);

      console.log(`🎮 Player order from room - LEFT (BLUE): ${player1?.username} (${currentRoom.players[0]}), RIGHT (RED): ${player2?.username} (${currentRoom.players[1]})`);

      player1Avatar = player1?.avatar || null;
      player2Avatar = player2?.avatar || null;

      if (player1NameEl) player1NameEl.textContent = player1?.username || `WARRIOR ${currentRoom.players[0]}`;
      if (player2NameEl) player2NameEl.textContent = player2?.username || `WARRIOR ${currentRoom.players[1]}`;

      const player1Initial = player1?.username?.[0]?.toUpperCase() || 'W1';
      const player2Initial = player2?.username?.[0]?.toUpperCase() || 'W2';
      displayPlayerAvatar('player1-avatar-container', player1Avatar, player1Initial, true);
      displayPlayerAvatar('player2-avatar-container', player2Avatar, player2Initial, false);

      if (mobilePlayer1NameEl) mobilePlayer1NameEl.textContent = player1?.username || `WARRIOR ${currentRoom.players[0]}`;
      if (mobilePlayer2NameEl) mobilePlayer2NameEl.textContent = player2?.username || `WARRIOR ${currentRoom.players[1]}`;

      displayPlayerAvatar('mobile-player1-avatar-container', player1Avatar, player1Initial, true);
      displayPlayerAvatar('mobile-player2-avatar-container', player2Avatar, player2Initial, false);
    } catch (e) {
      console.error('Error updating player names:', e);
    }
  }

  function updateScores() {
    if (!gameState?.score || !currentRoom?.players || currentRoom.players.length < 2) return;

    const score1 = gameState.score[currentRoom.players[0]] || 0; // LEFT player (BLUE)
    const score2 = gameState.score[currentRoom.players[1]] || 0; // RIGHT player (RED)

    console.log(`🎮 Score update - LEFT (BLUE): ${score1}, RIGHT (RED): ${score2}`);

    if (player1ScoreEl) player1ScoreEl.textContent = score1.toString();
    if (player2ScoreEl) player2ScoreEl.textContent = score2.toString();

    if (mobilePlayer1ScoreEl) mobilePlayer1ScoreEl.textContent = score1.toString();
    if (mobilePlayer2ScoreEl) mobilePlayer2ScoreEl.textContent = score2.toString();
  }

  async function initRoomPlayerNames() {
    if (!currentRoom?.players || currentRoom.players.length < 2) {
      console.log('⚠️ Not enough players in room for name display');
      return;
    }

    console.log('🎮 Initializing player names from room data - Player order:', currentRoom.players);
    console.log('🎮 POSITION ASSIGNMENT - LEFT (BLUE): Player', currentRoom.players[0], ', RIGHT (RED): Player', currentRoom.players[1]);

    try {
      const [player1, player2] = await Promise.all([
        userService.getUserById(currentRoom.players[0]), // LEFT player (BLUE)
        userService.getUserById(currentRoom.players[1])  // RIGHT player (RED)
      ]);

      player1Avatar = player1?.avatar || null;
      player2Avatar = player2?.avatar || null;

      const player1Name = player1?.username || `WARRIOR ${currentRoom.players[0]}`;
      const player2Name = player2?.username || `WARRIOR ${currentRoom.players[1]}`;
      const player1Initial = player1?.username?.[0]?.toUpperCase() || 'W1';
      const player2Initial = player2?.username?.[0]?.toUpperCase() || 'W2';

      if (player1NameEl) player1NameEl.textContent = player1Name;
      if (player2NameEl) player2NameEl.textContent = player2Name;

      displayPlayerAvatar('player1-avatar-container', player1Avatar, player1Initial, true);
      displayPlayerAvatar('player2-avatar-container', player2Avatar, player2Initial, false);

      if (mobilePlayer1NameEl) mobilePlayer1NameEl.textContent = player1Name;
      if (mobilePlayer2NameEl) mobilePlayer2NameEl.textContent = player2Name;

      displayPlayerAvatar('mobile-player1-avatar-container', player1Avatar, player1Initial, true);
      displayPlayerAvatar('mobile-player2-avatar-container', player2Avatar, player2Initial, false);

      [player1ScoreEl, player2ScoreEl, mobilePlayer1ScoreEl, mobilePlayer2ScoreEl].forEach(el => {
        if (el) el.textContent = '0';
      });

      console.log('🎮 Enhanced player names and avatars initialized:', {
        leftBlue: `${player1Name} (ID: ${currentRoom.players[0]}) - Avatar: ${player1Avatar ? 'loaded' : 'fallback'}`,
        rightRed: `${player2Name} (ID: ${currentRoom.players[1]}) - Avatar: ${player2Avatar ? 'loaded' : 'fallback'}`
      });
    } catch (e) {
      console.error('Error initializing player names:', e);
    }
  }

  function displayPlayerAvatar(containerId: string, avatarUrl: string | null, fallbackText: string, isPlayer1: boolean = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (avatarUrl && avatarUrl.trim() !== '') {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = `Player Avatar`;
      img.className = 'w-full h-full object-cover';

      img.onerror = () => {
        container.innerHTML = `<span class="text-white font-bold ${containerId.includes('mobile') ? 'text-sm' : 'text-2xl'}">${fallbackText}</span>`;
      };

      container.appendChild(img);
      console.log(`🖼️ Avatar loaded for ${containerId}:`, avatarUrl);
    } else {
      container.innerHTML = `<span class="text-white font-bold ${containerId.includes('mobile') ? 'text-sm' : 'text-2xl'}">${fallbackText}</span>`;
      console.log(`📝 Fallback text for ${containerId}:`, fallbackText);
    }
  }

  function cleanup3D() {
    try {
      console.log('🧹 Starting complete cleanup of remote-game page...');

      if (keyboardControlInterval) {
        clearInterval(keyboardControlInterval);
        keyboardControlInterval = null;
        console.log('✅ Keyboard control interval cleared');
      }

      if (mobileControlInterval) {
        clearInterval(mobileControlInterval);
        mobileControlInterval = null;
        console.log('✅ Mobile control interval cleared');
      }

      if (pauseCountdownTimer) {
        clearInterval(pauseCountdownTimer);
        pauseCountdownTimer = null;
        console.log('✅ Pause countdown timer cleared');
      }

      if (warmupTimer) {
        clearTimeout(warmupTimer);
        warmupTimer = null;
        console.log('✅ Warmup timer cleared');
      }

      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      console.log('✅ Keyboard event listeners removed');

      document.removeEventListener('touchmove', () => {});
      document.removeEventListener('visibilitychange', () => {});
      window.removeEventListener('blur', () => {});

      keysPressed = {};
      lastPaddlePosition = null;

      if (ballTrailParticles) {
        ballTrailParticles.dispose();
        ballTrailParticles = null;
      }

      if (hitParticles) {
        hitParticles.dispose();
        hitParticles = null;
      }

      if (scoreParticles) {
        scoreParticles.dispose();
        scoreParticles = null;
      }

      if (engine) {
        engine.stopRenderLoop();
        engine.dispose();
        engine = null;
      }

      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }

      scene = null;
      camera = null;
      glowLayer = null;

      table = null;
      borders = [];
      paddle1 = null;
      paddle2 = null;
      ball = null;
      ballTrail = null;

      tableMat = null;
      borderMats = [];
      paddle1Mat = null;
      paddle2Mat = null;
      ballMat = null;

      mainLight = null;
      paddle1Light = null;
      paddle2Light = null;
      ballLight = null;
      ambientLight = null;

      hitParticles = null;
      scoreParticles = null;
      ballTrailParticles = null;

      gameState = null;
      players = [];
      myPlayerId = null;
      mobileControlDirection = null;

      console.log('🧹 Enhanced 3D scene and controls cleaned up');
    } catch (e) {
      console.error('Error cleaning up enhanced 3D scene:', e);
    }
  }

  window.addEventListener('beforeunload', cleanup3D);

  (window as any).remoteGameCleanup = cleanup3D;

  return { cleanup: cleanup3D };
}

export function cleanup() {
  if ((window as any).remoteGameCleanup) {
    (window as any).remoteGameCleanup();
  }
}
