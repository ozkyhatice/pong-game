import './crtShader.js';

const PADSPEED = 0.09;
const BALLSPEEDXDEFAULT = 0.09;
const BALLSPEEDZDEFAULT = 0.07;

// Color Configuration
const COLORS = {
  BORDER: { r: 0, g: 1, b: 0 }, // Green borders
  LEFT_PADDLE: { r: 1, g: 0, b: 0 }, // Red left paddle
  RIGHT_PADDLE: { r: 0, g: 0, b: 1 }, // Blue right paddle
  BORDER_FLASH: { r: 1, g: 0, b: 1 }, // Bright magenta border flash
  PADDLE_FLASH: { r: 1, g: 1, b: 0 }, // Yellow paddle flash
  BALL_COLORS: [
    { r: 1, g: 1, b: 1 }, // White
    { r: 1, g: 0, b: 1 }, // Magenta
    { r: 0, g: 1, b: 1 }, // Cyan
    { r: 1, g: 0.5, b: 0 }, // Orange
    { r: 0.5, g: 0, b: 1 }, // Purple
    { r: 1, g: 1, b: 0 }, // Yellow
    { r: 0, g: 1, b: 0.5 } // Green-cyan
  ],
  BACKGROUND: { r: 1, g: 1, b: 1 }, // white background
  TABLE: { r: 0, g: 0, b: 0 } // Gray table
};

let currentBallColorIndex = 0;

function startTypingEffect() {
  const typingElement = document.querySelector('.typing-text') as HTMLElement;
  if (!typingElement) return;

  const text = 'PONG';
  typingElement.textContent = '';
  let i = 0;

  function typeChar() {
    if (i < text.length && typingElement) {
      typingElement.textContent += text[i];
      i++;
      setTimeout(typeChar, 250);
    }
  }

  setTimeout(typeChar, 500);
}

export function init() {
  console.log('Landing page loaded');

  startTypingEffect();

  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    return;
  }

  let canvas = document.getElementById('babylon-canvas');
  let realCanvas: HTMLCanvasElement;
  if (canvas instanceof HTMLCanvasElement)
    realCanvas = canvas;
  else {
    const createdCanvas = document.createElement('canvas');
    createdCanvas.id = 'babylon-canvas';
    createdCanvas.style.position = 'fixed';
    createdCanvas.style.top = '0';
    createdCanvas.style.left = '0';
    createdCanvas.style.width = '100vw';
    createdCanvas.style.height = '100vh';
    createdCanvas.style.zIndex = '-1';
    createdCanvas.style.pointerEvents = 'none';
    createdCanvas.style.display = 'block';
    createdCanvas.style.background = 'black';

    const appDiv = document.getElementById('app');
    if (appDiv) {
      appDiv.appendChild(createdCanvas);
    } else {
      document.body.appendChild(createdCanvas);
    }

    realCanvas = createdCanvas;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
  }

  (window as any).closeBabylonGame = function() {
    try {
      engine.stopRenderLoop();
      engine.dispose();
    } catch (e) {}
    if (realCanvas && realCanvas.parentNode)
      realCanvas.parentNode.removeChild(realCanvas);
  };

  const engine = new BABYLON.Engine(realCanvas, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 0.5);

  function resizeCanvas() {
    realCanvas.width = window.innerWidth;
    realCanvas.height = window.innerHeight;
    realCanvas.style.width = '100vw';
    realCanvas.style.height = '100vh';
    engine.resize();
  }
  resizeCanvas();

  const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, 0, 8, BABYLON.Vector3.Zero(), scene);
  camera.setPosition(new BABYLON.Vector3(0, 6, 0));
  camera.setTarget(BABYLON.Vector3.Zero());

  const crtFragmentShader = (window as any).crtFragmentShader;
  BABYLON.Effect.ShadersStore["crtFragmentShader"] = crtFragmentShader;

  const crtPostProcess = new BABYLON.PostProcess(
    "CRTShaderPostProcess", "crt", ["curvature", "screenResolution", "scanLineOpacity", "vignetteOpacity", "brightness", "vignetteRoundness"],
    null,
    1.0,
    camera
  );
  crtPostProcess.onApply = function (effect: any) {
    effect.setFloat2("curvature", 2.5, 2.5);
    effect.setFloat2("screenResolution", realCanvas.width, realCanvas.height);
    effect.setFloat2("scanLineOpacity", 1, 1);
    effect.setFloat("vignetteOpacity", 1);
    effect.setFloat("brightness", 1.2);
    effect.setFloat("vignetteRoundness", 1.5);
  };

  const glowLayer = new BABYLON.GlowLayer("glow", scene);
  glowLayer.intensity = 1.5;
  glowLayer.blurKernelSize = 64;

  const table = BABYLON.MeshBuilder.CreateBox('table', { width: 8, height: 0.1, depth: 4 }, scene);
  const tableMat = new BABYLON.StandardMaterial('tableMat', scene);
  tableMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  tableMat.emissiveColor = new BABYLON.Color3(COLORS.TABLE.r, COLORS.TABLE.g, COLORS.TABLE.b);
  tableMat.specularColor = new BABYLON.Color3(0,0,0);
  table.material = tableMat;
  table.position.y = -0.05;

  const borderThickness = 0.12;
  const leftBorder = BABYLON.MeshBuilder.CreateBox('leftBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  leftBorder.position.x = -4 + borderThickness/2;
  leftBorder.position.y = 0.01;
  const leftMat = new BABYLON.StandardMaterial('leftMat', scene);
  leftMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftMat.alpha = 0.8;
  leftBorder.material = leftMat;
  glowLayer.addIncludedOnlyMesh(leftBorder);

  const rightBorder = BABYLON.MeshBuilder.CreateBox('rightBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  rightBorder.position.x = 4 - borderThickness/2;
  rightBorder.position.y = 0.01;
  const rightMat = new BABYLON.StandardMaterial('rightMat', scene);
  rightMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightMat.alpha = 0.8;
  rightBorder.material = rightMat;
  glowLayer.addIncludedOnlyMesh(rightBorder);
  const topBorder = BABYLON.MeshBuilder.CreateBox('topBorder', { width: 7.6, height: 0.13, depth: borderThickness }, scene);
  topBorder.position.z = 2 - borderThickness/2;
  topBorder.position.y = 0.01;
  const topMat = new BABYLON.StandardMaterial('topMat', scene);
  topMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  topMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  topMat.alpha = 0.8;
  topMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  topBorder.material = topMat;
  glowLayer.addIncludedOnlyMesh(topBorder);

  const bottomBorder = BABYLON.MeshBuilder.CreateBox('bottomBorder', { width: 7.6, height: 0.13, depth: borderThickness }, scene);
  bottomBorder.position.z = -2 + borderThickness/2;
  bottomBorder.position.y = 0.01;
  const bottomMat = new BABYLON.StandardMaterial('bottomMat', scene);
  bottomMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  bottomMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  bottomMat.alpha = 0.8;
  bottomMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  bottomBorder.material = bottomMat;
  glowLayer.addIncludedOnlyMesh(bottomBorder);

  const paddleWidth = 0.1, paddleHeight = 0.3, paddleDepth = 0.9;
  const paddle1 = BABYLON.MeshBuilder.CreateBox('paddle1', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle2 = BABYLON.MeshBuilder.CreateBox('paddle2', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle1Mat = new BABYLON.StandardMaterial('paddle1Mat', scene);
  paddle1Mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
  paddle1Mat.specularColor = new BABYLON.Color3(0, 0, 0);
  paddle1Mat.alpha = 0.7;
  paddle1.material = paddle1Mat;
  const paddle2Mat = new BABYLON.StandardMaterial('paddle2Mat', scene);
  paddle2Mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
  paddle2Mat.specularColor = new BABYLON.Color3(0, 0, 0);
  paddle2Mat.alpha = 0.7;
  paddle2.material = paddle2Mat;
  // Add paddles to glow layer
  glowLayer.addIncludedOnlyMesh(paddle1);
  glowLayer.addIncludedOnlyMesh(paddle2);
  paddle1.position.x = -3.6;
  paddle2.position.x = 3.6;
  paddle1.position.y = paddle2.position.y = paddleHeight/2 + 0.02;

  // Compute safe Z clamp so paddles don't overlap with top/bottom borders
  const fieldHalfDepth = 2; // half of table depth is 2
  const borderHalf = borderThickness / 2;
  const safetyGap = 0.02; // small visual gap from border
  const paddleHalfDepth = paddleDepth / 2;
  const paddleZClamp = fieldHalfDepth - borderHalf - paddleHalfDepth - safetyGap; // e.g., ~1.43

  const leftBorderLight = new BABYLON.PointLight("leftBorderLight", new BABYLON.Vector3(-3.8, 0.5, 0), scene);
  leftBorderLight.diffuse = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftBorderLight.intensity = 0.8;
  leftBorderLight.range = 3.0;

  const rightBorderLight = new BABYLON.PointLight("rightBorderLight", new BABYLON.Vector3(3.8, 0.5, 0), scene);
  rightBorderLight.diffuse = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightBorderLight.intensity = 0.8;
  rightBorderLight.range = 3.0;

  const paddle1Light = new BABYLON.PointLight("paddle1Light", new BABYLON.Vector3(-3.6, 0.5, 0), scene);
  paddle1Light.diffuse = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
  paddle1Light.intensity = 1.2;
  paddle1Light.range = 2.5;

  const paddle2Light = new BABYLON.PointLight("paddle2Light", new BABYLON.Vector3(3.6, 0.5, 0), scene);
  paddle2Light.diffuse = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
  paddle2Light.intensity = 1.2;
  paddle2Light.range = 2.5;

  const ball = BABYLON.MeshBuilder.CreateSphere('pongBall', { diameter: 0.3 }, scene);
  const ballMat = new BABYLON.StandardMaterial('ballMat', scene);
  ballMat.diffuseColor = new BABYLON.Color3(COLORS.BALL_COLORS[currentBallColorIndex].r, COLORS.BALL_COLORS[currentBallColorIndex].g, COLORS.BALL_COLORS[currentBallColorIndex].b);
  ballMat.emissiveColor = new BABYLON.Color3(COLORS.BALL_COLORS[currentBallColorIndex].r, COLORS.BALL_COLORS[currentBallColorIndex].g, COLORS.BALL_COLORS[currentBallColorIndex].b);
  ball.material = ballMat;
  ball.position.y = paddleHeight/2;
  glowLayer.addIncludedOnlyMesh(ball);

  let BALLSPEEDX = BALLSPEEDXDEFAULT;
  let BALLSPEEDZ = BALLSPEEDZDEFAULT;
  let ballDirX = BALLSPEEDX, ballDirZ = BALLSPEEDZ;
  let paddle1ToCorner: number | null = null;
  let paddle2ToCorner: number | null = null;

  // Border flash animation tracking
  let leftBorderFlashTime = 0;
  let rightBorderFlashTime = 0;
  let topBorderFlashTime = 0;
  let bottomBorderFlashTime = 0;

  // Paddle flash animation tracking
  let paddle1FlashTime = 0;
  let paddle2FlashTime = 0;

  const keys = {
    up: false,
    down: false
  };

  let userControlling = false;
  let uiFaded = false;

  function fadeOutLandingUIOnce() {
    if (uiFaded) return;
    uiFaded = true;
    const ui = document.getElementById('landing-ui');
    if (ui) ui.classList.add('fade-out');
  }

  window.addEventListener('keydown', (event) => {
    switch(event.code) {
      case 'ArrowUp':
        keys.up = true;
        userControlling = true;
  fadeOutLandingUIOnce();
        event.preventDefault();
        break;
      case 'ArrowDown':
        keys.down = true;
        userControlling = true;
  fadeOutLandingUIOnce();
        event.preventDefault();
        break;
      case 'KeyG':
        (window as any).closeBabylonGame && (window as any).closeBabylonGame();
        (window as any).router && (window as any).router.navigate('login');
        event.preventDefault();
        break;
    }
  });

  window.addEventListener('keyup', (event) => {
    switch(event.code) {
      case 'ArrowUp':
        keys.up = false;
        event.preventDefault();
        break;
      case 'ArrowDown':
        keys.down = false;
        event.preventDefault();
        break;
    }
  });

  engine.runRenderLoop(() => {
    const deltaTime = engine.getDeltaTime() / 1000; // Convert to seconds

    // Handle border flash animations
    if (leftBorderFlashTime > 0) {
      leftBorderFlashTime -= deltaTime;
      const flashIntensity = leftBorderFlashTime / 2.0; // 2 second duration
      if (flashIntensity > 0) {
        leftMat.emissiveColor = new BABYLON.Color3(
          COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flashIntensity,
          COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flashIntensity,
          COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flashIntensity
        );
        leftBorderLight.intensity = 0.8 + 3.0 * flashIntensity; // Brighter flash
        leftBorderLight.diffuse = new BABYLON.Color3(
          COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flashIntensity,
          COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flashIntensity,
          COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flashIntensity
        );
      } else {
        leftMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
        leftBorderLight.intensity = 0.8;
        leftBorderLight.diffuse = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      }
    } else {
      leftMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      leftBorderLight.intensity = 0.8;
    }

    if (rightBorderFlashTime > 0) {
      rightBorderFlashTime -= deltaTime;
      const flashIntensity = rightBorderFlashTime / 2.0; // 2 second duration
      if (flashIntensity > 0) {
        rightMat.emissiveColor = new BABYLON.Color3(
          COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flashIntensity,
          COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flashIntensity,
          COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flashIntensity
        );
        rightBorderLight.intensity = 0.8 + 3.0 * flashIntensity; // Brighter flash
        rightBorderLight.diffuse = new BABYLON.Color3(
          COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flashIntensity,
          COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flashIntensity,
          COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flashIntensity
        );
      } else {
        rightMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
        rightBorderLight.intensity = 0.8;
        rightBorderLight.diffuse = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      }
    } else {
      rightMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      rightBorderLight.intensity = 0.8;
    }

    // Handle paddle flash animations
    if (paddle1FlashTime > 0) {
      paddle1FlashTime -= deltaTime;
      const flashIntensity = paddle1FlashTime / 1.0; // 1 second duration
      if (flashIntensity > 0) {
        paddle1Mat.emissiveColor = new BABYLON.Color3(
          COLORS.LEFT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.LEFT_PADDLE.r) * flashIntensity,
          COLORS.LEFT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.LEFT_PADDLE.g) * flashIntensity,
          COLORS.LEFT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.LEFT_PADDLE.b) * flashIntensity
        );
        paddle1Light.intensity = 1.2 + 2.0 * flashIntensity;
        paddle1Light.diffuse = new BABYLON.Color3(
          COLORS.LEFT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.LEFT_PADDLE.r) * flashIntensity,
          COLORS.LEFT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.LEFT_PADDLE.g) * flashIntensity,
          COLORS.LEFT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.LEFT_PADDLE.b) * flashIntensity
        );
      } else {
        paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
        paddle1Light.intensity = 1.2;
        paddle1Light.diffuse = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
      }
    } else {
      paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
      paddle1Light.intensity = 1.2;
      paddle1Light.diffuse = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
    }

    if (paddle2FlashTime > 0) {
      paddle2FlashTime -= deltaTime;
      const flashIntensity = paddle2FlashTime / 1.0; // 1 second duration
      if (flashIntensity > 0) {
        paddle2Mat.emissiveColor = new BABYLON.Color3(
          COLORS.RIGHT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.RIGHT_PADDLE.r) * flashIntensity,
          COLORS.RIGHT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.RIGHT_PADDLE.g) * flashIntensity,
          COLORS.RIGHT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.RIGHT_PADDLE.b) * flashIntensity
        );
        paddle2Light.intensity = 1.2 + 2.0 * flashIntensity;
        paddle2Light.diffuse = new BABYLON.Color3(
          COLORS.RIGHT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.RIGHT_PADDLE.r) * flashIntensity,
          COLORS.RIGHT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.RIGHT_PADDLE.g) * flashIntensity,
          COLORS.RIGHT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.RIGHT_PADDLE.b) * flashIntensity
        );
      } else {
        paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
        paddle2Light.intensity = 1.2;
        paddle2Light.diffuse = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
      }
    } else {
      paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
      paddle2Light.intensity = 1.2;
      paddle2Light.diffuse = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
    }

    // if (topBorderFlashTime > 0) {
    //   topBorderFlashTime -= deltaTime;
    //   const flashIntensity = topBorderFlashTime / 1.0; // 1 second duration
    //   if (flashIntensity > 0) {
    //     topMat.emissiveColor = new BABYLON.Color3(
    //       COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flashIntensity,
    //       COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flashIntensity,
    //       COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flashIntensity
    //     );
    //   } else {
    //     topMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
    //   }
    // } else {
    //   topMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
    // }

    // if (bottomBorderFlashTime > 0) {
    //   bottomBorderFlashTime -= deltaTime;
    //   const flashIntensity = bottomBorderFlashTime / 1.0; // 1 second duration
    //   if (flashIntensity > 0) {
    //     bottomMat.emissiveColor = new BABYLON.Color3(
    //       COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flashIntensity,
    //       COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flashIntensity,
    //       COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flashIntensity
    //     );
    //   } else {
    //     bottomMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
    //   }
    // } else {
    //   bottomMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
    // }

    paddle1Light.position.z = paddle1.position.z;
    paddle2Light.position.z = paddle2.position.z;

  if (!userControlling && paddle1ToCorner !== null) {
      const dz = paddle1ToCorner - paddle1.position.z;
      if (Math.abs(dz) < 0.1) {
        paddle1.position.z = paddle1ToCorner;
        paddle1ToCorner = null;
      } else
        paddle1.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else if (userControlling) {
      if (keys.up) {
        paddle1.position.z -= PADSPEED;
      }
      if (keys.down) {
        paddle1.position.z += PADSPEED;
      }
    } else {
      paddle1.position.z += Math.sign(ball.position.z - paddle1.position.z) * PADSPEED;
    }

  if (paddle2ToCorner !== null) {
      const dz = paddle2ToCorner - paddle2.position.z;
      if (Math.abs(dz) < 0.1) {
        paddle2.position.z = paddle2ToCorner;
        paddle2ToCorner = null;
      } else
        paddle2.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else
      paddle2.position.z += Math.sign(ball.position.z - paddle2.position.z) * PADSPEED;

  // Clamp paddles so they don't intersect top/bottom borders
  paddle1.position.z = Math.max(Math.min(paddle1.position.z, paddleZClamp), -paddleZClamp);
  paddle2.position.z = Math.max(Math.min(paddle2.position.z, paddleZClamp), -paddleZClamp);

    ball.position.x += ballDirX;
    ball.position.z += ballDirZ;

    if (ball.position.z > 1.85) {
      ball.position.z = 1.85;
      ballDirZ *= -1;
      // Trigger top border flash
      topBorderFlashTime = 1.0;
    }
    if (ball.position.z < -1.85) {
      ball.position.z = -1.85;
      ballDirZ *= -1;
      // Trigger bottom border flash
      bottomBorderFlashTime = 1.0;
    }

    let paddleHit = false;
    const paddleMargin = 0.2;
    const paddleLengthMargin = 0.1;

    if (ball.position.x < paddle1.position.x + paddleWidth/2 + paddleMargin &&
        ball.position.x > paddle1.position.x - paddleMargin &&
        Math.abs(ball.position.z - paddle1.position.z) < paddleDepth/2 + paddleLengthMargin
    ) {
      ball.position.x = paddle1.position.x + paddleWidth/2 + paddleMargin;
      BALLSPEEDX += 0.01;
      BALLSPEEDZ += 0.01;
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      paddle1FlashTime = 1.0; // Trigger 1 second yellow flash
      if (!userControlling) {
        paddle1ToCorner = -paddleZClamp;
      }
    }

    if (ball.position.x > paddle2.position.x - paddleWidth/2 - paddleMargin &&
        ball.position.x < paddle2.position.x + paddleMargin &&
        Math.abs(ball.position.z - paddle2.position.z) < paddleDepth/2 + paddleLengthMargin
    ) {
      ball.position.x = paddle2.position.x - paddleWidth/2 - paddleMargin;
      BALLSPEEDX += 0.01;
      BALLSPEEDZ += 0.01;
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = -Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      paddle2FlashTime = 1.0; // Trigger 1 second yellow flash
  paddle2ToCorner = paddleZClamp;
    }

    const leftOut = ball.position.x < -3.85 && !(ball.position.x > paddle1.position.x - paddleMargin && ball.position.x < paddle1.position.x + paddleWidth/2 + paddleMargin && Math.abs(ball.position.z - paddle1.position.z) < paddleDepth/2 + paddleLengthMargin);
    const rightOut = ball.position.x > 3.85 && !(ball.position.x > paddle2.position.x - paddleWidth/2 - paddleMargin && ball.position.x < paddle2.position.x + paddleMargin && Math.abs(ball.position.z - paddle2.position.z) < paddleDepth/2 + paddleLengthMargin);
    if (!paddleHit && (leftOut || rightOut)) {
      // Trigger border flash for left or right border
      if (leftOut) {
        leftBorderFlashTime = 2.0; // 2 second flash
      } else {
        rightBorderFlashTime = 2.0; // 2 second flash
      }

      // Cycle through ball colors
      currentBallColorIndex = (currentBallColorIndex + 1) % COLORS.BALL_COLORS.length;

      ball.position.x = 0;
      ball.position.z = 0;
      BALLSPEEDX = BALLSPEEDXDEFAULT;
      BALLSPEEDZ = BALLSPEEDZDEFAULT;
      ballDirX = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDX;
      ballDirZ = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDZ;

      // Update ball color
      ballMat.diffuseColor = new BABYLON.Color3(
        COLORS.BALL_COLORS[currentBallColorIndex].r,
        COLORS.BALL_COLORS[currentBallColorIndex].g,
        COLORS.BALL_COLORS[currentBallColorIndex].b
      );
      ballMat.emissiveColor = new BABYLON.Color3(
        COLORS.BALL_COLORS[currentBallColorIndex].r,
        COLORS.BALL_COLORS[currentBallColorIndex].g,
        COLORS.BALL_COLORS[currentBallColorIndex].b
      );

      return scene.render();
    }

    scene.render();
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
  });
}
