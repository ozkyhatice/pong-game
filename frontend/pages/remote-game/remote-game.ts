import { AppState, RoomInfo } from "../../core/AppState.js";
import { GameService } from "../../services/GameService.js";
import { UserService } from "../../services/UserService.js";
import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";
import { WebSocketManager } from "../../core/WebSocketManager.js";

declare global {
  var router: Router;
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [userId: number]: { x: number; y: number; width: number; height: number } };
  score: { [userId: number]: number };
  gameOver: boolean;
}

// Enhanced 3D Game constants
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
    // Enhanced neon color scheme
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

// 3D Game variables
let engine: any = null;
let scene: any = null;
let camera: any = null;
let glowLayer: any = null;
// CRT post-process removed for cleaner look

// 3D Game objects
let table: any = null;
let borders: any[] = [];
let paddle1: any = null;
let paddle2: any = null;
let ball: any = null;
let ballTrail: any = null;

// Materials
let tableMat: any = null;
let borderMats: any[] = [];
let paddle1Mat: any = null;
let paddle2Mat: any = null;
let ballMat: any = null;

// Lights and effects
let mainLight: any = null;
let paddle1Light: any = null;
let paddle2Light: any = null;
let ballLight: any = null;
let ambientLight: any = null;

// Particle systems
let hitParticles: any = null;
let scoreParticles: any = null;
let ballTrailParticles: any = null;

// Animation tracking
let borderFlashTimes: number[] = [0, 0, 0, 0]; // left, right, top, bottom
let paddleFlashTimes: number[] = [0, 0]; // paddle1, paddle2
let ballColorIndex = 0;
let lastBallPosition = { x: 0, y: 0, z: 0 };

// Camera controls
let cameraControlsEnabled = true;
let lastPointerPosition = { x: 0, y: 0 };
let isPointerDown = false;

// Game state
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
let keyboardControlInterval: number | null = null; // Add this for keyboard controls

// Global resize handler
let resizeHandler: (() => void) | null = null;

export async function init() {
  // Check if this is a page reload (no WebSocket connection)
  const wsManager = WebSocketManager.getInstance();
  if (!wsManager.isConnected()) {
    console.log('🔄 Remote-game: Page reloaded, redirecting to home for proper initialization');
    window.router.navigate('home');
    return;
  }

  // Check for BabylonJS
  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    notify('3D engine not available. Please refresh the page.');
    return;
  }

  // Get canvas elements
  const desktopCanvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const mobileCanvas = document.getElementById('mobile-game-canvas') as HTMLCanvasElement | null;

  if (!desktopCanvas && !mobileCanvas) {
    console.error('No canvas found');
    notify('Game canvas not found!');
    return;
  }

  // Get UI elements
  const player1NameEl = document.getElementById('player1-name');
  const player2NameEl = document.getElementById('player2-name');
  const player1InitialEl = document.getElementById('player1-initial');
  const player2InitialEl = document.getElementById('player2-initial');
  const player1ScoreEl = document.getElementById('player1-score');
  const player2ScoreEl = document.getElementById('player2-score');
  const roomIdEl = document.getElementById('room-id');
  const gameStatusEl = document.getElementById('game-status');
  const leaveGameBtn = document.getElementById('leave-game-btn');

  // Pause elements
  const pauseMessageEl = document.getElementById('pause-message');
  const pauseTextEl = document.getElementById('pause-text');
  const pauseCountdownEl = document.getElementById('pause-countdown');

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

  // Mobile pause elements
  const mobilePauseMessageEl = document.getElementById('mobile-pause-message');
  const mobilePauseTextEl = document.getElementById('mobile-pause-text');
  const mobilePauseCountdownEl = document.getElementById('mobile-pause-countdown');

  const appState = AppState.getInstance();
  const gameService = new GameService();
  const userService = new UserService();
  const currentRoom = appState.getCurrentRoom();

  if (!currentRoom) {
    notify('No room found!');
    router.navigate('home');
    return;
  }

  if (roomIdEl) roomIdEl.textContent = `ROOM: ${currentRoom.roomId}`;
  if (leaveGameBtn) leaveGameBtn.addEventListener('click', handleLeaveGame);
  if (mobileLeaveBtn) mobileLeaveBtn.addEventListener('click', handleLeaveGame);

  // Initialize 3D scene
  init3DScene();

  // Setup controls
  setupMobileControls();
  setupKeyboardControls();

  initPlayerInfo();
  initRoomPlayerNames();

  // Game Service Events
  gameService.onStateUpdate((data) => {
    if (gameStatusEl) gameStatusEl.textContent = '⚔️ CYBER BATTLE ⚔️';
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚔️ BATTLE ⚔️';

    gameState = data.state;
    update3DGameState();
    updateScores();
    updatePlayerNames();
  });

  gameService.onGameStarted((data) => {
    if (gameStatusEl) gameStatusEl.textContent = '⚔️ CYBER BATTLE ⚔️';
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚔️ BATTLE ⚔️';
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
      appState.updateTournamentStatus('active', data.round);
      appState.clearCurrentRoom();
      cleanup3D();
      router.navigate('tournament');
    } else {
      notify(`Player ${data.leftPlayer} left the game.`);
      appState.clearCurrentRoom();
      cleanup3D();
      router.navigate('home');
    }
  });

  gameService.onGameOver((data: any) => {
    if (data.isTournamentMatch && data.tournamentId) {
      console.log('🏆 Tournament match completed:', data);
      notify(data.message + ' Returning to tournament...');
      appState.updateTournamentStatus('active', data.round);
      appState.clearCurrentRoom();
      cleanup3D();
      router.navigate('tournament');
    } else {
      localStorage.setItem('gameResult', JSON.stringify({
        winner: data.winner,
        finalScore: data.finalScore,
        message: data.message,
        timestamp: Date.now()
      }));
      appState.clearCurrentRoom();
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

  // Tournament ended event listener
  const tournamentService = new (await import('../../services/TournamentService.js')).TournamentService();
  tournamentService.onTournamentEnded((data: any) => {
    console.log('🏆 Tournament ended during game:', data);
    const isWinner = data.winnerId === myPlayerId;
    const message = isWinner
      ? '🎉 Congratulations! You won the tournament!'
      : `🏆 Tournament ended. Winner: ${data.winnerUsername}`;

    notify(message);

    // Immediately stop the game and clean up
    gameState = null;
    players = [];
    myPlayerId = null;

    // Clear mobile control intervals
    if (mobileControlInterval) {
      clearInterval(mobileControlInterval);
      mobileControlInterval = null;
    }

    // Clear pause countdown
    if (pauseCountdownTimer) {
      clearTimeout(pauseCountdownTimer);
      pauseCountdownTimer = null;
    }

    // Show tournament end result
    setTimeout(() => {
      appState.clearCurrentRoom();
      appState.clearCurrentTournament();
      cleanup3D();

      // Store tournament result for end-game page
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

  // Start countdown
  startCountdown();

  function init3DScene() {
    console.log('🎮 Initializing Enhanced 3D Pong Arena...');

    // If engine already exists, clean it up first
    if (engine) {
      console.log('🧹 Cleaning up existing engine...');
      cleanup3D();
    }

    const isMobile = window.innerWidth < 1024;
    const targetCanvas = (isMobile && mobileCanvas) ? mobileCanvas : desktopCanvas;

    if (!targetCanvas) {
      console.error('No target canvas available');
      return;
    }

    // Initialize Babylon.js engine with enhanced settings
    engine = new BABYLON.Engine(targetCanvas, true, {
      antialias: true,
      adaptToDeviceRatio: true,
      powerPreference: "high-performance",
      stencil: true
    });

    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    // Setup fixed camera - 45 degree view from the other side
    camera = new BABYLON.ArcRotateCamera('camera',
      -Math.PI / 2,          // Alpha: -90 degrees (opposite side view)
      Math.PI / 4,           // Beta: 45 degrees (45 degree angle from top)
      12,                    // Radius: distance from target
      BABYLON.Vector3.Zero(), // Target: center of the table
      scene
    );

    // Lock camera - no user controls
    camera.inputs.clear(); // Remove all camera inputs (mouse, keyboard, etc.)

    // Set camera target to center of game area
    camera.setTarget(BABYLON.Vector3.Zero());

    console.log('🎮 Fixed camera setup: 45° view from opposite side');

    // Skip CRT post-processing for cleaner look
    // setupPostProcessing(targetCanvas);

    // Setup glow layer - reduced intensity for better visibility
    glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.8;
    glowLayer.blurKernelSize = 64;

    // Create scene objects
    createEnhancedTable();
    createEnhancedBorders();
    createEnhancedPaddles();
    createEnhancedBall();
    createEnhancedLighting();
    createParticleSystems();

    // Setup responsive canvas
    setupResponsiveCanvas(targetCanvas);

    // Start render loop with enhanced animations
    engine.runRenderLoop(() => {
      handleEnhancedAnimations();
      scene.render();
    });

    // Handle window resize
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }

    resizeHandler = () => {
      if (engine) {
        engine.resize();
        setupResponsiveCanvas(targetCanvas);
      }
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

    // Add center line
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

    // Left paddle (Player 1) - Enhanced design
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

    // Right paddle (Player 2) - Enhanced design
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

    // Store initial position for trail calculation
    lastBallPosition = { x: 0, y: PONG_3D_CONFIG.BALL.radius, z: 0 };
  }

  function createEnhancedLighting() {
    // Main directional light
    mainLight = new BABYLON.DirectionalLight("mainLight", new BABYLON.Vector3(-0.5, -1, -0.5), scene);
    mainLight.diffuse = new BABYLON.Color3(0.8, 0.9, 1);
    mainLight.intensity = 0.5;

    // Ambient light for overall illumination
    ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.diffuse = new BABYLON.Color3(0.2, 0.3, 0.4);
    ambientLight.intensity = 0.3;

    // Paddle lights - reduced intensity for better visibility
    paddle1Light = new BABYLON.PointLight("paddle1Light", new BABYLON.Vector3(-5, 2, 0), scene);
    paddle1Light.diffuse = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.LEFT_PADDLE.r, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.g, PONG_3D_CONFIG.COLORS.LEFT_PADDLE.b);
    paddle1Light.intensity = 0.8;
    paddle1Light.range = 3;

    paddle2Light = new BABYLON.PointLight("paddle2Light", new BABYLON.Vector3(5, 2, 0), scene);
    paddle2Light.diffuse = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.r, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.g, PONG_3D_CONFIG.COLORS.RIGHT_PADDLE.b);
    paddle2Light.intensity = 0.8;
    paddle2Light.range = 3;

    // Ball light - reduced intensity
    ballLight = new BABYLON.PointLight("ballLight", new BABYLON.Vector3(0, 1, 0), scene);
    ballLight.diffuse = new BABYLON.Color3(PONG_3D_CONFIG.COLORS.BALL.r, PONG_3D_CONFIG.COLORS.BALL.g, PONG_3D_CONFIG.COLORS.BALL.b);
    ballLight.intensity = 1.0;
    ballLight.range = 2;
  }

  function createParticleSystems() {
    // Ball trail particles
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
  }

  function setupResponsiveCanvas(targetCanvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 1024;

    if (isMobile && mobileCanvas) {
      const maxWidth = Math.min(window.innerWidth - 32, 400);
      const aspectRatio = 0.75; // Better aspect ratio for 3D view
      mobileCanvas.width = maxWidth;
      mobileCanvas.height = maxWidth * aspectRatio;

      console.log(`📱 Enhanced 3D Mobile canvas: ${mobileCanvas.width}x${mobileCanvas.height}`);
    } else if (desktopCanvas) {
      desktopCanvas.width = 1000;
      desktopCanvas.height = 600; // Enhanced resolution for desktop

      console.log(`🖥️ Enhanced 3D Desktop canvas: ${desktopCanvas.width}x${desktopCanvas.height}`);
    }

    if (engine) {
      engine.resize();
    }
  }

  function handleEnhancedAnimations() {
    if (!scene || !engine) return;

    const deltaTime = engine.getDeltaTime() / 1000;

    // Handle flash animations
    handleBorderFlashes(deltaTime);
    handlePaddleFlashes(deltaTime);

    // Update light positions
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

    // Animate ball rotation for visual effect
    if (ball && gameState) {
      ball.rotation.x += deltaTime * 5;
      ball.rotation.z += deltaTime * 3;
    }
  }

  function handleBorderFlashes(deltaTime: number) {
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
    // Paddle 1 flash
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

    // Paddle 2 flash
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

    // Update ball position - direct coordinate mapping for 45° view
    // Game coordinates: x: 0-800, y: 0-400
    // 3D coordinates: x: -4 to 4, z: -2 to 2 (table bounds)
    const ballX = ((gameState.ball.x / 800) - 0.5) * PONG_3D_CONFIG.TABLE.width * 0.9; // Scale to table width
    const ballZ = ((gameState.ball.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9; // Scale to table depth

    ball.position.x = ballX;
    ball.position.z = ballZ;
    ball.position.y = PONG_3D_CONFIG.BALL.radius;

    // Update paddle positions - proper coordinate mapping
    const playerIds = Object.keys(gameState.paddles).map(id => parseInt(id)).sort();

    if (playerIds.length >= 2) {
      // Left paddle (Player 1)
      const paddle1Data = gameState.paddles[playerIds[0]];
      if (paddle1Data) {
        const paddleZ = ((paddle1Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;
        const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
        paddle1.position.z = paddleZ + paddleOffset;
        paddle1.position.y = PONG_3D_CONFIG.PADDLE.height/2;
        paddle1.position.x = -PONG_3D_CONFIG.TABLE.width/2 + 0.5;
      }

      // Right paddle (Player 2)
      const paddle2Data = gameState.paddles[playerIds[1]];
      if (paddle2Data) {
        const paddleZ = ((paddle2Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;
        const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
        paddle2.position.z = paddleZ + paddleOffset;
        paddle2.position.y = PONG_3D_CONFIG.PADDLE.height/2;
        paddle2.position.x = PONG_3D_CONFIG.TABLE.width/2 - 0.5;
      }
    }

    // Check for collisions and trigger effects
    checkCollisionEffects();
  }

  function checkCollisionEffects() {
    if (!gameState) return;

    if (gameState.ball.y <= 30 || gameState.ball.y >= 770) {
      gameState.ball.dy = -gameState.ball.dy;
      borderFlashTimes[gameState.ball.y <= 0 ? 3 : 2] = 1.5;
    }

    const ball = gameState.ball;
    const paddle1 = gameState.paddles[1];
    const paddle2 = gameState.paddles[2];

    const paddleMargin = 8;
    const paddleLengthMargin = 5;

    if (ball.x < paddle1.x + paddle1.width + paddleMargin &&
        ball.x > paddle1.x - paddleMargin &&
        ball.y + paddleLengthMargin > paddle1.y &&
        ball.y - paddleLengthMargin < paddle1.y + paddle1.height &&
        ball.dx < 0) {

      ball.x = paddle1.x + paddle1.width + paddleMargin;

      ball.dx = -ball.dx * 1.10;
      ball.dy = ball.dy * 1.10;

      paddleFlashTimes[0] = 1.0;
    }

    if (ball.x > paddle2.x - paddleMargin &&
        ball.x < paddle2.x + paddle2.width + paddleMargin &&
        ball.y + paddleLengthMargin > paddle2.y &&
        ball.y - paddleLengthMargin < paddle2.y + paddle2.height &&
        ball.dx > 0) {

      ball.x = paddle2.x - paddleMargin;

      ball.dx = -ball.dx * 1.10;
      ball.dy = ball.dy * 1.10;

      paddleFlashTimes[1] = 1.0;
    }

    // Trigger border flash on collision
    if (gameState.ball.y < 30) { // Top border
      borderFlashTimes[2] = 1.5;
    } else if (gameState.ball.y > 370) { // Bottom border
      borderFlashTimes[3] = 1.5;
    }
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
    const paddleSpeed = 18; // Enhanced speed for better responsiveness
    const paddleHeight = 100;
    const gameHeight = 400;

    if (keysPressed['KeyW'] || keysPressed['ArrowUp']) {
      newY = Math.min(gameHeight - paddleHeight - 1, myPaddle.y + paddleSpeed);
    } else if (keysPressed['KeyS'] || keysPressed['ArrowDown']) {
      newY = Math.max(1, myPaddle.y - paddleSpeed);
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

  function setupKeyboardControls() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Continuous keyboard movement - store interval for cleanup
    keyboardControlInterval = setInterval(() => {
      if (Object.keys(keysPressed).some(key => keysPressed[key])) {
        handleKeyPress();
      }
    }, 16) as any; // 60 FPS
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!keysPressed[e.code]) {
      keysPressed[e.code] = true;
      handleKeyPress();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    keysPressed[e.code] = false;
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
      mobileControlInterval = setInterval(handleMobileMovement, 16) as any;
    }

    function stopMobileMovement() {
      if (mobileControlInterval) {
        clearInterval(mobileControlInterval);
        mobileControlInterval = null;
      }
      mobileControlDirection = null;
    }

    function handleMobileMovement() {
      if (!currentRoom || !gameState || gameState.gameOver || !mobileControlDirection || myPlayerId === null) return;

      const myPaddle = gameState.paddles[myPlayerId];
      if (!myPaddle) return;

      const moveSpeed = 25; // Enhanced mobile movement speed
      let newY = myPaddle.y;

      if (mobileControlDirection === 'up') {
        newY = Math.max(0, myPaddle.y - moveSpeed);
      } else if (mobileControlDirection === 'down') {
        newY = Math.min(400 - 100, myPaddle.y + moveSpeed);
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
      appState.clearCurrentRoom();
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

      // Update all player name elements
      const player1Name = player1?.username || `WARRIOR ${currentRoom.players[0]}`;
      const player2Name = player2?.username || `WARRIOR ${currentRoom.players[1]}`;
      const player1Initial = player1?.username?.[0]?.toUpperCase() || 'W1';
      const player2Initial = player2?.username?.[0]?.toUpperCase() || 'W2';

      // Desktop elements
      if (player1NameEl) player1NameEl.textContent = player1Name;
      if (player2NameEl) player2NameEl.textContent = player2Name;
      if (player1InitialEl) player1InitialEl.textContent = player1Initial;
      if (player2InitialEl) player2InitialEl.textContent = player2Initial;

      // Mobile elements
      if (mobilePlayer1NameEl) mobilePlayer1NameEl.textContent = player1Name;
      if (mobilePlayer2NameEl) mobilePlayer2NameEl.textContent = player2Name;
      if (mobilePlayer1InitialEl) mobilePlayer1InitialEl.textContent = player1Initial;
      if (mobilePlayer2InitialEl) mobilePlayer2InitialEl.textContent = player2Initial;

      // Initialize scores
      [player1ScoreEl, player2ScoreEl, mobilePlayer1ScoreEl, mobilePlayer2ScoreEl].forEach(el => {
        if (el) el.textContent = '0';
      });

      console.log('🎮 Enhanced player names initialized:', {
        player1: player1Name,
        player2: player2Name
      });
    } catch (e) {
      console.error('Error initializing player names:', e);
    }
  }

  function cleanup3D() {
    try {
      console.log('🧹 Starting complete cleanup of remote-game page...');

      // Clear keyboard controls interval
      if (keyboardControlInterval) {
        clearInterval(keyboardControlInterval);
        keyboardControlInterval = null;
        console.log('✅ Keyboard control interval cleared');
      }

      // Clear mobile control interval
      if (mobileControlInterval) {
        clearInterval(mobileControlInterval);
        mobileControlInterval = null;
        console.log('✅ Mobile control interval cleared');
      }

      // Clear pause countdown timer
      if (pauseCountdownTimer) {
        clearInterval(pauseCountdownTimer);
        pauseCountdownTimer = null;
        console.log('✅ Pause countdown timer cleared');
      }

      // Remove keyboard event listeners
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      console.log('✅ Keyboard event listeners removed');

      // Remove other document event listeners
      document.removeEventListener('touchmove', () => {});
      document.removeEventListener('visibilitychange', () => {});
      window.removeEventListener('blur', () => {});

      // Clear keys pressed state
      keysPressed = {};

      // Clean up 3D scene
      if (ballTrailParticles) {
        ballTrailParticles.dispose();
        ballTrailParticles = null;
      }

      if (engine) {
        engine.stopRenderLoop();
        engine.dispose();
        engine = null;
      }

      // Remove window event listeners
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }

      // Reset all variables
      scene = null;
      camera = null;
      glowLayer = null;
      // CRT post-process removed

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

      // Clear game state
      gameState = null;
      players = [];
      myPlayerId = null;
      mobileControlDirection = null;

      console.log('🧹 Enhanced 3D scene and controls cleaned up');
    } catch (e) {
      console.error('Error cleaning up enhanced 3D scene:', e);
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup3D);

  // Store cleanup function globally for external access
  (window as any).remoteGameCleanup = cleanup3D;

  // Export cleanup function for external use
  return { cleanup: cleanup3D };
}

// Export cleanup function globally
export function cleanup() {
  if ((window as any).remoteGameCleanup) {
    (window as any).remoteGameCleanup();
  }
}
