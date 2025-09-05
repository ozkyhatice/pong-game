import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";

declare global {
  var router: Router;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [userId: number]: { x: number; y: number; width: number; height: number } };
  score: { [userId: number]: number };
  gameOver: boolean;
}

const PADSPEED = 12;
const BALLSPEEDXDEFAULT = 3;
const BALLSPEEDZDEFAULT = 2;
const BALLSPEEDMULTI = 1.25;

function interpolateColors(color1: RGB, color2: RGB, factor: number): RGB {
  return {
    r: color1.r + (color2.r - color1.r) * factor,
    g: color1.g + (color2.g - color1.g) * factor,
    b: color1.b + (color2.b - color1.b) * factor
  };
}

const COLORS = {
  BORDER: { r: 0.2, g: 1, b: 0.2 },
  LEFT_PADDLE: { r: 0, g: 0.8, b: 1 },
  RIGHT_PADDLE: { r: 1, g: 0.2, b: 0.3 },
  BORDER_FLASH: { r: 1, g: 0, b: 1 },
  PADDLE_FLASH: { r: 1, g: 1, b: 0 },
  BALL_COLORS: [
    { r: 1, g: 1, b: 1 },
    { r: 1, g: 0, b: 1 },
    { r: 0, g: 1, b: 1 },
    { r: 1, g: 0.5, b: 0 },
    { r: 0.5, g: 0, b: 1 },
    { r: 1, g: 1, b: 0 },
    { r: 0, g: 1, b: 0.5 }
  ],
  TABLE: { r: 0.1, g: 0.2, b: 0.1 },
  PARTICLES: {
    TRAIL: { r: 0.5, g: 0.8, b: 1 }
  }
};

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
  }
};

let engine: any = null;
let scene: any = null;
let camera: any = null;
let glowLayer: any = null;

let table: any = null;
let borders: any[] = [];
let paddle1: any = null;
let paddle2: any = null;
let ball: any = null;

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

let ballTrailParticles: any = null;

let borderFlashTimes: number[] = [0, 0, 0, 0];
let paddleFlashTimes: number[] = [0, 0];

let localGameState: GameState = {
  ball: { x: 400, y: 200, dx: BALLSPEEDXDEFAULT, dy: BALLSPEEDZDEFAULT },
  paddles: {
    1: { x: -10, y: 150, width: 20, height: 100 },
    2: { x: 790, y: 150, width: 20, height: 100 }
  },
  score: { 1: 0, 2: 0 },
  gameOver: false
};

const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 400,
  PADDLE_SPEED: PADSPEED,
  BALL_SPEED_INCREMENT: BALLSPEEDMULTI,
  MAX_SCORE: 5,
  BALL_RADIUS: 10
};

let player1Keys = { up: false, down: false };
let player2Keys = { up: false, down: false };

let gameLoopInterval: number | null = null;
let gamePaused = false;
let mobileControlP1Direction: 'up' | 'down' | null = null;
let mobileControlP2Direction: 'up' | 'down' | null = null;
let mobileControlP1Interval: number | null = null;
let mobileControlP2Interval: number | null = null;

let resizeHandler: (() => void) | null = null;

export async function init() {
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

  const mobilePlayer1NameEl = document.getElementById('mobile-player1_name');
  const mobilePlayer2NameEl = document.getElementById('mobile-player2_name');
  const mobilePlayer1InitialEl = document.getElementById('mobile-player1-initial');
  const mobilePlayer2InitialEl = document.getElementById('mobile-player2-initial');
  const mobilePlayer1ScoreEl = document.getElementById('mobile-player1-score');
  const mobilePlayer2ScoreEl = document.getElementById('mobile-player2-score');
  const mobileGameStatusEl = document.getElementById('mobile-game-status');
  const mobileLeaveBtn = document.getElementById('mobile-leave-btn');
  const mobileUpBtnP1 = document.getElementById('mobile-up-btn-p1');
  const mobileDownBtnP1 = document.getElementById('mobile-down-btn-p1');
  const mobileUpBtnP2 = document.getElementById('mobile-up-btn-p2');
  const mobileDownBtnP2 = document.getElementById('mobile-down-btn-p2');

  if (roomIdEl) roomIdEl.textContent = 'LOCAL GAME';
  if (leaveGameBtn) leaveGameBtn.addEventListener('click', handleLeaveGame);
  if (mobileLeaveBtn) mobileLeaveBtn.addEventListener('click', handleLeaveGame);

  init3DScene();

  setupLocalKeyboardControls();

  setupMobileControls();

  setupPauseOnTabSwitch();

  initLocalPlayerNames();

  updateLocalScores();

  startLocalGame();

  function initLocalPlayerNames() {
    // CONSISTENT PLAYER ORDER for local game too
    // Player 1 = LEFT side = BLUE paddle
    // Player 2 = RIGHT side = RED paddle
    if (player1NameEl) player1NameEl.textContent = 'PLAYER 1 (BLUE)';
    if (player2NameEl) player2NameEl.textContent = 'PLAYER 2 (RED)';
    if (player1InitialEl) player1InitialEl.textContent = 'P1';
    if (player2InitialEl) player2InitialEl.textContent = 'P2';

    if (mobilePlayer1NameEl) mobilePlayer1NameEl.textContent = 'PLAYER 1 (BLUE)';
    if (mobilePlayer2NameEl) mobilePlayer2NameEl.textContent = 'PLAYER 2 (RED)';
    if (mobilePlayer1InitialEl) mobilePlayer1InitialEl.textContent = 'P1';
    if (mobilePlayer2InitialEl) mobilePlayer2InitialEl.textContent = 'P2';

    console.log('🎮 Local player names initialized - LEFT (BLUE): PLAYER 1, RIGHT (RED): PLAYER 2');
  }

  function updateLocalScores() {
    const score1 = localGameState.score[1] || 0;
    const score2 = localGameState.score[2] || 0;

    if (player1ScoreEl) player1ScoreEl.textContent = score1.toString();
    if (player2ScoreEl) player2ScoreEl.textContent = score2.toString();

    if (mobilePlayer1ScoreEl) mobilePlayer1ScoreEl.textContent = score1.toString();
    if (mobilePlayer2ScoreEl) mobilePlayer2ScoreEl.textContent = score2.toString();
  }

  function startLocalGame() {
    if (gameStatusEl) gameStatusEl.textContent = 'LOCAL BATTLE';
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = 'BATTLE';

    gameLoopInterval = setInterval(updateLocalGame, 16) as any;
    console.log('🎮 Local game started');
  }

  function updateLocalGame() {
    if (gamePaused) return;

    updatePaddles();

    updateBall();

    update3DGameState();

    updateLocalScores();

    checkGameOver();
  }

  function updatePaddles() {
    const paddleSpeed = GAME_CONFIG.PADDLE_SPEED;

    if (player1Keys.down) {
      localGameState.paddles[1].y = Math.max(-5, localGameState.paddles[1].y - paddleSpeed);
    }
    if (player1Keys.up) {
      localGameState.paddles[1].y = Math.min(GAME_CONFIG.CANVAS_HEIGHT - localGameState.paddles[1].height + 5, localGameState.paddles[1].y + paddleSpeed);
    }

    if (player2Keys.down) {
      localGameState.paddles[2].y = Math.max(-5, localGameState.paddles[2].y - paddleSpeed);
    }
    if (player2Keys.up) {
      localGameState.paddles[2].y = Math.min(GAME_CONFIG.CANVAS_HEIGHT - localGameState.paddles[2].height + 5, localGameState.paddles[2].y + paddleSpeed);
    }
  }

  function updateBall() {
    localGameState.ball.x += localGameState.ball.dx;
    localGameState.ball.y += localGameState.ball.dy;

    const ballRadius = GAME_CONFIG.BALL_RADIUS;

    if (localGameState.ball.y - ballRadius <= 0 || localGameState.ball.y + ballRadius >= GAME_CONFIG.CANVAS_HEIGHT) {
      localGameState.ball.dy = -localGameState.ball.dy;
      borderFlashTimes[localGameState.ball.y - ballRadius <= 0 ? 3 : 2] = 1.5;
    }

    const ball = localGameState.ball;
    const paddle1 = localGameState.paddles[1];
    const paddle2 = localGameState.paddles[2];

    const paddleMargin = 8;
    const paddleLengthMargin = 5;

    if (ball.x < paddle1.x + paddle1.width + paddleMargin &&
        ball.x > paddle1.x - paddleMargin &&
        ball.y + paddleLengthMargin > paddle1.y &&
        ball.y - paddleLengthMargin < paddle1.y + paddle1.height &&
        ball.dx < 0) {

      ball.x = paddle1.x + paddle1.width + paddleMargin;

      ball.dx = -ball.dx * BALLSPEEDMULTI;
      ball.dy = ball.dy * BALLSPEEDMULTI;

      paddleFlashTimes[0] = 1.0;
    }

    if (ball.x > paddle2.x - paddleMargin &&
        ball.x < paddle2.x + paddle2.width + paddleMargin &&
        ball.y + paddleLengthMargin > paddle2.y &&
        ball.y - paddleLengthMargin < paddle2.y + paddle2.height &&
        ball.dx > 0) {

      ball.x = paddle2.x - paddleMargin;

      ball.dx = -ball.dx * BALLSPEEDMULTI;
      ball.dy = ball.dy * BALLSPEEDMULTI;

      paddleFlashTimes[1] = 1.0;
    }

    if (ball.x + ballRadius <= 0) {
      borderFlashTimes[0] = 1.5;
      localGameState.score[2]++;
      resetBall();
    } else if (ball.x - ballRadius >= GAME_CONFIG.CANVAS_WIDTH) {
      borderFlashTimes[1] = 1.5;
      localGameState.score[1]++;
      resetBall();
    }
  }

  function resetBall() {
    localGameState.ball.x = GAME_CONFIG.CANVAS_WIDTH / 2;
    localGameState.ball.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
    localGameState.ball.dx = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDXDEFAULT;
    localGameState.ball.dy = (Math.random() > 0.5 ? 1 : -1) * (BALLSPEEDZDEFAULT * (0.5 + Math.random() * 0.5));
  }

  function checkGameOver() {
    if (localGameState.score[1] >= GAME_CONFIG.MAX_SCORE || localGameState.score[2] >= GAME_CONFIG.MAX_SCORE) {
      const winner = localGameState.score[1] >= GAME_CONFIG.MAX_SCORE ? 'Player 1' : 'Player 2';

      if (gameStatusEl) gameStatusEl.textContent = `🏆 ${winner} WINS! 🏆`;
      if (mobileGameStatusEl) mobileGameStatusEl.textContent = `🏆 ${winner} WINS! 🏆`;

      localGameState.gameOver = true;

      if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
      }

      notify(`${winner} wins the game!`, 'green');

      setTimeout(() => {
        resetLocalGame();
      }, 3000);
    }
  }

  function resetLocalGame() {
    localGameState = {
      ball: { x: 400, y: 200, dx: 3, dy: 2 },
      paddles: {
        1: { x: -10, y: 150, width: 20, height: 100 },
        2: { x: 790, y: 150, width: 20, height: 100 }
      },
      score: { 1: 0, 2: 0 },
      gameOver: false
    };

    updateLocalScores();
    startLocalGame();
  }

  function setupLocalKeyboardControls() {
    document.addEventListener('keydown', handleLocalKeyDown);
    document.addEventListener('keyup', handleLocalKeyUp);
    console.log('🎮 Local keyboard controls set up');
  }

  function setupMobileControls() {
    // Player 1 Up Button
    if (mobileUpBtnP1) {
      ['touchstart', 'mousedown'].forEach(event => {
        mobileUpBtnP1!.addEventListener(event, (e: any) => {
          e.preventDefault();
          mobileControlP1Direction = 'up';
          startMobileMovementP1();
        });
      });

      ['touchend', 'touchcancel', 'touchleave', 'mouseup', 'mouseleave'].forEach(event => {
        mobileUpBtnP1!.addEventListener(event, (e: any) => {
          e.preventDefault();
          stopMobileMovementP1();
        });
      });
    }

    // Player 1 Down Button
    if (mobileDownBtnP1) {
      ['touchstart', 'mousedown'].forEach(event => {
        mobileDownBtnP1!.addEventListener(event, (e: any) => {
          e.preventDefault();
          mobileControlP1Direction = 'down';
          startMobileMovementP1();
        });
      });

      ['touchend', 'touchcancel', 'touchleave', 'mouseup', 'mouseleave'].forEach(event => {
        mobileDownBtnP1!.addEventListener(event, (e: any) => {
          e.preventDefault();
          stopMobileMovementP1();
        });
      });
    }

    // Player 2 Up Button
    if (mobileUpBtnP2) {
      ['touchstart', 'mousedown'].forEach(event => {
        mobileUpBtnP2!.addEventListener(event, (e: any) => {
          e.preventDefault();
          mobileControlP2Direction = 'up';
          startMobileMovementP2();
        });
      });

      ['touchend', 'touchcancel', 'touchleave', 'mouseup', 'mouseleave'].forEach(event => {
        mobileUpBtnP2!.addEventListener(event, (e: any) => {
          e.preventDefault();
          stopMobileMovementP2();
        });
      });
    }

    // Player 2 Down Button
    if (mobileDownBtnP2) {
      ['touchstart', 'mousedown'].forEach(event => {
        mobileDownBtnP2!.addEventListener(event, (e: any) => {
          e.preventDefault();
          mobileControlP2Direction = 'down';
          startMobileMovementP2();
        });
      });

      ['touchend', 'touchcancel', 'touchleave', 'mouseup', 'mouseleave'].forEach(event => {
        mobileDownBtnP2!.addEventListener(event, (e: any) => {
          e.preventDefault();
          stopMobileMovementP2();
        });
      });
    }

    function startMobileMovementP1() {
      if (mobileControlP1Interval) return;

      handleMobileMovementP1();
      mobileControlP1Interval = setInterval(handleMobileMovementP1, 16) as any;
    }

    function stopMobileMovementP1() {
      if (mobileControlP1Interval) {
        clearInterval(mobileControlP1Interval);
        mobileControlP1Interval = null;
      }
      mobileControlP1Direction = null;
      // Reset Player 1 keys when stopping mobile movement
      player1Keys.up = false;
      player1Keys.down = false;
    }

    function startMobileMovementP2() {
      if (mobileControlP2Interval) return;

      handleMobileMovementP2();
      mobileControlP2Interval = setInterval(handleMobileMovementP2, 16) as any;
    }

    function stopMobileMovementP2() {
      if (mobileControlP2Interval) {
        clearInterval(mobileControlP2Interval);
        mobileControlP2Interval = null;
      }
      mobileControlP2Direction = null;
      // Reset Player 2 keys when stopping mobile movement
      player2Keys.up = false;
      player2Keys.down = false;
    }

    function handleMobileMovementP1() {
      if (!mobileControlP1Direction || localGameState.gameOver) return;

      // Reset all Player 1 keys first
      player1Keys.up = false;
      player1Keys.down = false;

      if (mobileControlP1Direction === 'up') {
        player1Keys.up = true;
      } else if (mobileControlP1Direction === 'down') {
        player1Keys.down = true;
      }
    }

    function handleMobileMovementP2() {
      if (!mobileControlP2Direction || localGameState.gameOver) return;

      // Reset all Player 2 keys first
      player2Keys.up = false;
      player2Keys.down = false;

      if (mobileControlP2Direction === 'up') {
        player2Keys.up = true;
      } else if (mobileControlP2Direction === 'down') {
        player2Keys.down = true;
      }
    }

    // Prevent scrolling when touching game controls
    document.addEventListener('touchmove', (e) => {
      if (e.target === mobileUpBtnP1 || e.target === mobileDownBtnP1 ||
          e.target === mobileUpBtnP2 || e.target === mobileDownBtnP2) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopMobileMovementP1();
        stopMobileMovementP2();
      }
    });

    window.addEventListener('blur', () => {
      stopMobileMovementP1();
      stopMobileMovementP2();
    });

    console.log('🎮 Mobile controls set up for both players');
  }

  function setupPauseOnTabSwitch() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        gamePaused = true;
        if (gameStatusEl) gameStatusEl.textContent = '⏸️ GAME PAUSED ⏸️';
        if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⏸️ PAUSED ⏸️';
        if (ballTrailParticles) ballTrailParticles.stop();
        console.log('🎮 Game paused - tab hidden');
      } else {
        if (!localGameState.gameOver) {
          gamePaused = false;
          if (gameStatusEl) gameStatusEl.textContent = 'LOCAL BATTLE';
          if (mobileGameStatusEl) mobileGameStatusEl.textContent = 'BATTLE';
          if (ballTrailParticles) ballTrailParticles.start();
          console.log('🎮 Game resumed - tab visible');
        }
      }
    });
    console.log('🎮 Pause on tab switch set up');
  }

  function handleLocalKeyDown(e: KeyboardEvent) {
    switch(e.code) {
      case 'KeyW':
        player1Keys.up = true;
        break;
      case 'KeyS':
        player1Keys.down = true;
        break;
      case 'ArrowUp':
        e.preventDefault();
        player2Keys.up = true;
        break;
      case 'ArrowDown':
        e.preventDefault();
        player2Keys.down = true;
        break;
    }
  }

  function handleLocalKeyUp(e: KeyboardEvent) {
    switch(e.code) {
      case 'KeyW':
        player1Keys.up = false;
        break;
      case 'KeyS':
        player1Keys.down = false;
        break;
      case 'ArrowUp':
        e.preventDefault();
        player2Keys.up = false;
        break;
      case 'ArrowDown':
        e.preventDefault();
        player2Keys.down = false;
        break;
    }
  }

  function handleLeaveGame() {
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
      gameLoopInterval = null;
    }
    cleanup3D();
    router.navigate('landing');
  }

  function init3DScene() {
    console.log('🎮 Initializing Enhanced 3D Pong Arena...');

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

    engine = new BABYLON.Engine(targetCanvas, true, {
      antialias: true,
      adaptToDeviceRatio: true,
      powerPreference: "high-performance",
      stencil: true
    });

    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    camera = new BABYLON.ArcRotateCamera('camera',
      -Math.PI / 2,
      Math.PI / 4,
      12,
      BABYLON.Vector3.Zero(),
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
    tableMat.diffuseColor = new BABYLON.Color3(COLORS.TABLE.r, COLORS.TABLE.g, COLORS.TABLE.b);
    tableMat.emissiveColor = new BABYLON.Color3(COLORS.TABLE.r, COLORS.TABLE.g, COLORS.TABLE.b);
    tableMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    tableMat.roughness = 0.8;
    tableMat.alpha = 0.3;
    table.material = tableMat;
    table.position.y = -PONG_3D_CONFIG.TABLE.height / 2;

    const centerLine = BABYLON.MeshBuilder.CreateBox('centerLine', {
      width: 0.05,
      height: 0.02,
      depth: PONG_3D_CONFIG.TABLE.depth * 0.8
    }, scene);

    const centerLineMat = new BABYLON.StandardMaterial('centerLineMat', scene);
    centerLineMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
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
      borderMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      borderMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      borderMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
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
    paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
    paddle1Mat.specularColor = new BABYLON.Color3(1, 1, 1);
    paddle1Mat.specularPower = 64;
    paddle1Mat.alpha = 0.9;
    paddle1.material = paddle1Mat;

    paddle1.position.x = -PONG_3D_CONFIG.TABLE.width/2 + 9;
    paddle1.position.y = paddleConfig.height/2;
    paddle1.position.z = paddleConfig.depth;
    glowLayer.addIncludedOnlyMesh(paddle1);

    paddle2 = BABYLON.MeshBuilder.CreateBox('paddle2', {
      width: paddleConfig.width,
      height: paddleConfig.height,
      depth: paddleConfig.depth
    }, scene);

    paddle2Mat = new BABYLON.StandardMaterial('paddle2Mat', scene);
    paddle2Mat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
    paddle2Mat.specularColor = new BABYLON.Color3(1, 1, 1);
    paddle2Mat.specularPower = 64;
    paddle2Mat.alpha = 0.9;
    paddle2.material = paddle2Mat;

    paddle2.position.x = PONG_3D_CONFIG.TABLE.width/2 - 9;
    paddle2.position.y = paddleConfig.height/2;
    paddle2.position.z = paddleConfig.depth;
    glowLayer.addIncludedOnlyMesh(paddle2);
  }

  function createEnhancedBall() {
    ball = BABYLON.MeshBuilder.CreateSphere('pongBall', {
      diameter: PONG_3D_CONFIG.BALL.radius * 2,
      segments: 16
    }, scene);

    ballMat = new BABYLON.StandardMaterial('ballMat', scene);
    ballMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ballMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    ballMat.specularColor = new BABYLON.Color3(1, 1, 1);
    ballMat.specularPower = 128;
    ball.material = ballMat;
    ball.position.y = PONG_3D_CONFIG.BALL.radius;
    glowLayer.addIncludedOnlyMesh(ball);
  }

  function createEnhancedLighting() {
    mainLight = new BABYLON.DirectionalLight("mainLight", new BABYLON.Vector3(-0.5, -1, -0.5), scene);
    mainLight.diffuse = new BABYLON.Color3(0.8, 0.9, 1);
    mainLight.intensity = 0.5;

    ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.diffuse = new BABYLON.Color3(0.2, 0.3, 0.4);
    ambientLight.intensity = 0.3;

    paddle1Light = new BABYLON.PointLight("paddle1Light", new BABYLON.Vector3(-5, 2, 0), scene);
    paddle1Light.diffuse = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
    paddle1Light.intensity = 0.8;
    paddle1Light.range = 3;

    paddle2Light = new BABYLON.PointLight("paddle2Light", new BABYLON.Vector3(5, 2, 0), scene);
    paddle2Light.diffuse = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
    paddle2Light.intensity = 0.8;
    paddle2Light.range = 3;

    ballLight = new BABYLON.PointLight("ballLight", new BABYLON.Vector3(0, 1, 0), scene);
    ballLight.diffuse = new BABYLON.Color3(1, 1, 1);
    ballLight.intensity = 1.0;
    ballLight.range = 2;
  }

  function createParticleSystems() {
    if (!ball) {
      console.error('Ball not created yet, cannot create particle system');
      return;
    }

    ballTrailParticles = new BABYLON.ParticleSystem("ballTrail", 50, scene);
    ballTrailParticles.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", scene);

    ballTrailParticles.emitter = ball;
    ballTrailParticles.minEmitBox = new BABYLON.Vector3(-0.02, -0.02, -0.02);
    ballTrailParticles.maxEmitBox = new BABYLON.Vector3(0.02, 0.02, 0.02);

    ballTrailParticles.color1 = new BABYLON.Color4(1, 1, 1, 1);
    ballTrailParticles.color2 = new BABYLON.Color4(1, 1, 1, 0);
    ballTrailParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);

    ballTrailParticles.minSize = 0.02;
    ballTrailParticles.maxSize = 0.08;
    ballTrailParticles.minLifeTime = 0.1;
    ballTrailParticles.maxLifeTime = 0.3;
    ballTrailParticles.emitRate = 150;
    ballTrailParticles.minEmitPower = 0.2;
    ballTrailParticles.maxEmitPower = 0.5;
    ballTrailParticles.updateSpeed = 0.005;

    ballTrailParticles.start();
    console.log('✅ Ball trail particles created and started');
  }

  function setupResponsiveCanvas(targetCanvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 1024;

    if (isMobile && mobileCanvas) {
      const maxWidth = Math.min(window.innerWidth - 32, 400);
      const aspectRatio = 0.75;
      mobileCanvas.width = maxWidth;
      mobileCanvas.height = maxWidth * aspectRatio;

      console.log(`📱 Enhanced 3D Mobile canvas: ${mobileCanvas.width}x${mobileCanvas.height}`);
    } else if (desktopCanvas) {
      desktopCanvas.width = 1000;
      desktopCanvas.height = 600;

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

    if (ball && localGameState && !gamePaused) {
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
          const interpolated = interpolateColors(COLORS.BORDER, COLORS.BORDER_FLASH, flashIntensity);
          borderMats[index].emissiveColor = new BABYLON.Color3(interpolated.r, interpolated.g, interpolated.b);
        }
      } else if (borderMats[index]) {
        borderMats[index].emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      }
    });
  }

  function handlePaddleFlashes(deltaTime: number) {
    if (paddleFlashTimes[0] > 0) {
      paddleFlashTimes[0] -= deltaTime;
      const flashIntensity = Math.max(0, paddleFlashTimes[0] / 1.0);

      if (paddle1Mat) {
        const interpolated = interpolateColors(COLORS.LEFT_PADDLE, COLORS.PADDLE_FLASH, flashIntensity);
        paddle1Mat.emissiveColor = new BABYLON.Color3(interpolated.r, interpolated.g, interpolated.b);
      }

      if (paddle1Light) {
        paddle1Light.intensity = 1.5 + 2.0 * flashIntensity;
      }
    } else if (paddle1Mat) {
      paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
      if (paddle1Light) paddle1Light.intensity = 1.5;
    }

    if (paddleFlashTimes[1] > 0) {
      paddleFlashTimes[1] -= deltaTime;
      const flashIntensity = Math.max(0, paddleFlashTimes[1] / 1.0);

      if (paddle2Mat) {
        const interpolated = interpolateColors(COLORS.RIGHT_PADDLE, COLORS.PADDLE_FLASH, flashIntensity);
        paddle2Mat.emissiveColor = new BABYLON.Color3(interpolated.r, interpolated.g, interpolated.b);
      }

      if (paddle2Light) {
        paddle2Light.intensity = 1.5 + 2.0 * flashIntensity;
      }
    } else if (paddle2Mat) {
      paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
      if (paddle2Light) paddle2Light.intensity = 1.5;
    }
  }

  function update3DGameState() {
    if (!localGameState || !ball || !paddle1 || !paddle2) return;

    const ballX = ((localGameState.ball.x / 800) - 0.5) * PONG_3D_CONFIG.TABLE.width * 0.9;
    const ballZ = ((localGameState.ball.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;

    ball.position.x = ballX;
    ball.position.z = ballZ;
    ball.position.y = PONG_3D_CONFIG.BALL.radius;

    const paddle1Data = localGameState.paddles[1];
    if (paddle1Data) {
      const paddleZ = ((paddle1Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;

      const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
      paddle1.position.z = paddleZ + paddleOffset;
      paddle1.position.y = PONG_3D_CONFIG.PADDLE.height/2;
      paddle1.position.x = -PONG_3D_CONFIG.TABLE.width/2 + 0.5;
    }

    const paddle2Data = localGameState.paddles[2];
    if (paddle2Data) {
      const paddleZ = ((paddle2Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;

      const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
      paddle2.position.z = paddleZ + paddleOffset;
      paddle2.position.y = PONG_3D_CONFIG.PADDLE.height/2;
      paddle2.position.x = PONG_3D_CONFIG.TABLE.width/2 - 0.5;
    }
  }

  function cleanup3D() {
    try {
      console.log('🧹 Starting complete cleanup of local game page...');

      if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
        console.log('✅ Game loop interval cleared');
      }

      // Clear mobile control intervals
      if (mobileControlP1Interval) {
        clearInterval(mobileControlP1Interval);
        mobileControlP1Interval = null;
      }
      if (mobileControlP2Interval) {
        clearInterval(mobileControlP2Interval);
        mobileControlP2Interval = null;
      }
      console.log('✅ Mobile control intervals cleared');

      document.removeEventListener('keydown', handleLocalKeyDown);
      document.removeEventListener('keyup', handleLocalKeyUp);
      console.log('✅ Keyboard event listeners removed');

      document.removeEventListener('visibilitychange', setupPauseOnTabSwitch);

      player1Keys = { up: false, down: false };
      player2Keys = { up: false, down: false };
      mobileControlP1Direction = null;
      mobileControlP2Direction = null;

      if (ballTrailParticles) {
        ballTrailParticles.dispose();
        ballTrailParticles = null;
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

      ballTrailParticles = null;

      localGameState = {
        ball: { x: 400, y: 200, dx: 3, dy: 2 },
        paddles: {
          1: { x: -10, y: 150, width: 20, height: 100 },
          2: { x: 790, y: 150, width: 20, height: 100 }
        },
        score: { 1: 0, 2: 0 },
        gameOver: false
      };

      console.log('🧹 Local game cleanup completed');
    } catch (e) {
      console.error('Error cleaning up local game:', e);
    }
  }

  window.addEventListener('beforeunload', cleanup3D);

  (window as any).localGameCleanup = cleanup3D;

  return { cleanup: cleanup3D };
}

export function cleanup() {
  if ((window as any).localGameCleanup) {
    (window as any).localGameCleanup();
  }
}
