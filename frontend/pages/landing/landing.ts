import './crtShader.js';

const PADSPEED = 0.09;
const BALLSPEEDXDEFAULT = 0.09;
const BALLSPEEDZDEFAULT = 0.07;

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

  // Typing efekti başlat
  startTypingEffect();

  // Use Babylon.js from window (CDN loaded in index.html)
  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    return;
  }

  // Create a fullscreen background canvas for Babylon.js
  let canvas = document.getElementById('babylon-canvas');
  let realCanvas: HTMLCanvasElement;
  if (canvas instanceof HTMLCanvasElement)
    realCanvas = canvas;
  else {
    const createdCanvas = document.createElement('canvas');
    createdCanvas.id = 'babylon-canvas';
    // Fullscreen, fixed, background
    createdCanvas.style.position = 'fixed';
    createdCanvas.style.top = '0';
    createdCanvas.style.left = '0';
    createdCanvas.style.width = '100vw';
    createdCanvas.style.height = '100vh';
    createdCanvas.style.zIndex = '-1';
    createdCanvas.style.pointerEvents = 'none';
    createdCanvas.style.display = 'block';
    createdCanvas.style.background = 'black';
    
    // Canvas'ı app div'ine ekle (body yerine)
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

  // Expose a function to close the Babylon game
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
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  function resizeCanvas() {
    realCanvas.width = window.innerWidth;
    realCanvas.height = window.innerHeight;
    realCanvas.style.width = '100vw';
    realCanvas.style.height = '100vh';
    engine.resize();
  }
  resizeCanvas();

  // Camera (top-down)
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
    effect.setFloat2("curvature", 3.0, 3.0);
    effect.setFloat2("screenResolution", realCanvas.width, realCanvas.height);
    effect.setFloat2("scanLineOpacity", 1, 1);
    effect.setFloat("vignetteOpacity", 1);
    effect.setFloat("brightness", 1.2);
    effect.setFloat("vignetteRoundness", 2.0);
  };

  // Light
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);

  // Table
  const table = BABYLON.MeshBuilder.CreateBox('table', { width: 8, height: 0.1, depth: 4 }, scene);
  const tableMat = new BABYLON.StandardMaterial('tableMat', scene);
  tableMat.diffuseColor = new BABYLON.Color3(0, 0, 0); // pitch black
  tableMat.emissiveColor = new BABYLON.Color3(0.08, 0.08, 0.08); // subtle glow
  tableMat.specularColor = new BABYLON.Color3(0,0,0);
  table.material = tableMat;
  table.position.y = -0.05;

  const borderThickness = 0.12;
  // Left border (neon green)
  const leftBorder = BABYLON.MeshBuilder.CreateBox('leftBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  leftBorder.position.x = -4 + borderThickness/2;
  leftBorder.position.y = 0.01;
  const leftMat = new BABYLON.StandardMaterial('leftMat', scene);
  leftMat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08); // neon green
  leftMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.02);
  leftMat.specularColor = new BABYLON.Color3(0.22, 1, 0.08);
  leftMat.alpha = 0.85;
  leftBorder.material = leftMat;
  // Right border (neon green)
  const rightBorder = BABYLON.MeshBuilder.CreateBox('rightBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  rightBorder.position.x = 4 - borderThickness/2;
  rightBorder.position.y = 0.01;
  const rightMat = new BABYLON.StandardMaterial('rightMat', scene);
  rightMat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08); // neon green
  rightMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.02);
  rightMat.specularColor = new BABYLON.Color3(0.22, 1, 0.08);
  rightMat.alpha = 0.85;
  rightBorder.material = rightMat;
  // Top border (white neon)
  const topBorder = BABYLON.MeshBuilder.CreateBox('topBorder', { width: 8, height: 0.13, depth: borderThickness }, scene);
  topBorder.position.z = 2 - borderThickness/2;
  topBorder.position.y = 0.01;
  const topMat = new BABYLON.StandardMaterial('topMat', scene);
  topMat.emissiveColor = new BABYLON.Color3(0.7, 0.7, 1);
  topMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.2);
  topMat.alpha = 0.7;
  topBorder.material = topMat;
  // Bottom border (white neon)
  const bottomBorder = BABYLON.MeshBuilder.CreateBox('bottomBorder', { width: 8, height: 0.13, depth: borderThickness }, scene);
  bottomBorder.position.z = -2 + borderThickness/2;
  bottomBorder.position.y = 0.01;
  const bottomMat = new BABYLON.StandardMaterial('bottomMat', scene);
  bottomMat.emissiveColor = new BABYLON.Color3(0.7, 0.7, 1);
  bottomMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.2);
  bottomMat.alpha = 0.7;
  bottomBorder.material = bottomMat;

  // Paddles (neon green)
  const paddleWidth = 0.2, paddleHeight = 0.5, paddleDepth = 0.9;
  const paddle1 = BABYLON.MeshBuilder.CreateBox('paddle1', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle2 = BABYLON.MeshBuilder.CreateBox('paddle2', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle1Mat = new BABYLON.StandardMaterial('paddle1Mat', scene);
  paddle1Mat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.02);
  paddle1Mat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08); // neon green
  paddle1Mat.specularColor = new BABYLON.Color3(0.22, 1, 0.08);
  paddle1Mat.alpha = 0.95;
  paddle1.material = paddle1Mat;
  const paddle2Mat = new BABYLON.StandardMaterial('paddle2Mat', scene);
  paddle2Mat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.02);
  paddle2Mat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08); // neon green
  paddle2Mat.specularColor = new BABYLON.Color3(0.22, 1, 0.08);
  paddle2Mat.alpha = 0.95;
  paddle2.material = paddle2Mat;
  paddle1.position.x = -3.7;
  paddle2.position.x = 3.7;
  paddle1.position.y = paddle2.position.y = paddleHeight/2 - 0.05;

  // Ball (white)
  const ball = BABYLON.MeshBuilder.CreateSphere('pongBall', { diameter: 0.3 }, scene);
  const ballMat = new BABYLON.StandardMaterial('ballMat', scene);
  ballMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // beyaz
  ballMat.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.9); // hafif glow
  ball.material = ballMat;
  ball.position.y = paddleHeight/2;

  function randomColor3() {
    return new BABYLON.Color3(Math.random(), Math.random(), Math.random());
  }

  let BALLSPEEDX = BALLSPEEDXDEFAULT;
  let BALLSPEEDZ = BALLSPEEDZDEFAULT;
  let ballDirX = BALLSPEEDX, ballDirZ = BALLSPEEDZ;
  let paddle1ToCorner: number | null = null;
  let paddle2ToCorner: number | null = null;

  // Animation loop
  engine.runRenderLoop(() => {
    // Paddle 1
    if (paddle1ToCorner !== null) {
      const dz = paddle1ToCorner - paddle1.position.z;
      if (Math.abs(dz) < 0.1) {
        paddle1.position.z = paddle1ToCorner;
        paddle1ToCorner = null;
      } else
        paddle1.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else
      paddle1.position.z += Math.sign(ball.position.z - paddle1.position.z) * PADSPEED;
    // Paddle 2
    if (paddle2ToCorner !== null) {
      const dz = paddle2ToCorner - paddle2.position.z;
      if (Math.abs(dz) < 0.1) {
        paddle2.position.z = paddle2ToCorner;
        paddle2ToCorner = null;
      } else
        paddle2.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else
      paddle2.position.z += Math.sign(ball.position.z - paddle2.position.z) * PADSPEED;
    // Clamp paddles to table bounds
    paddle1.position.z = Math.max(Math.min(paddle1.position.z, 1.5), -1.5);
    paddle2.position.z = Math.max(Math.min(paddle2.position.z, 1.5), -1.5);

    // Move ball
    ball.position.x += ballDirX;
    ball.position.z += ballDirZ;

    // Ball collision with top/bottom (bouncy)
    if (ball.position.z > 1.85) {
      ball.position.z = 1.85;
      ballDirZ *= -1;
    }
    if (ball.position.z < -1.85) {
      ball.position.z = -1.85;
      ballDirZ *= -1;
    }

    // Ball collision with paddles (expanded margin)
    let paddleHit = false;
    const paddleMargin = 0.28;
    // Left paddle
    if (ball.position.x < paddle1.position.x + paddleWidth/2 + paddleMargin &&
        ball.position.x > paddle1.position.x - paddleMargin &&
        Math.abs(ball.position.z - paddle1.position.z) < paddleHeight/2
    ) {
      ball.position.x = paddle1.position.x + paddleWidth/2 + paddleMargin; // prevent tunneling
      // Increment ball speed X and Z after paddle bounce
      BALLSPEEDX += 0.01;
      BALLSPEEDZ += 0.01;
      // Recalculate direction with new speed
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      paddle1ToCorner = -1.5;
    }
    // Right paddle
    if (ball.position.x > paddle2.position.x - paddleWidth/2 - paddleMargin &&
        ball.position.x < paddle2.position.x + paddleMargin &&
        Math.abs(ball.position.z - paddle2.position.z) < paddleHeight/2
    ) {
      ball.position.x = paddle2.position.x - paddleWidth/2 - paddleMargin; // prevent tunneling
      // Increment ball speed X and Z after paddle bounce
      BALLSPEEDX += 0.01;
      BALLSPEEDZ += 0.01;
      // Recalculate direction with new speed
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = -Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      paddle2ToCorner = 1.5;
    }

    // Ball out of bounds - only if not within paddle collision margin
    const leftOut = ball.position.x < -3.85 && !(ball.position.x > paddle1.position.x - paddleMargin && ball.position.x < paddle1.position.x + paddleWidth/2 + paddleMargin && Math.abs(ball.position.z - paddle1.position.z) < paddleHeight/2);
    const rightOut = ball.position.x > 3.85 && !(ball.position.x > paddle2.position.x - paddleWidth/2 - paddleMargin && ball.position.x < paddle2.position.x + paddleMargin && Math.abs(ball.position.z - paddle2.position.z) < paddleHeight/2);
    if (!paddleHit && (leftOut || rightOut)) {
      const borderX = ball.position.x < 0 ? -3.85 : 3.85;
      const particleSystem = new BABYLON.ParticleSystem("borderHit", 80, scene); // daha az partikül
      particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
      particleSystem.emitter = new BABYLON.Vector3(borderX, ball.position.y, ball.position.z);
      particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.2); // küçük alan
      particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.2); // küçük alan
      particleSystem.color1 = borderX < 0 ? new BABYLON.Color4(1, 0.2, 0.2, 1) : new BABYLON.Color4(0.2, 0.6, 1, 1);
      particleSystem.color2 = borderX < 0 ? new BABYLON.Color4(1, 0.5, 0.5, 1) : new BABYLON.Color4(0.5, 0.8, 1, 1);
      particleSystem.minSize = 0.1; // küçük partikül
      particleSystem.maxSize = 0.3; // küçük partikül
      particleSystem.minLifeTime = 0.3; // kısa süre
      particleSystem.maxLifeTime = 0.6; // kısa süre
      particleSystem.emitRate = 120; // daha az yoğunluk
      particleSystem.direction1 = new BABYLON.Vector3(borderX < 0 ? 1 : -1, 0.3, 0.3); // daha yumuşak
      particleSystem.direction2 = new BABYLON.Vector3(borderX < 0 ? 1 : -1, -0.3, -0.3); // daha yumuşak
      particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0); // daha hafif
      particleSystem.targetStopDuration = 0.4; // daha kısa
      particleSystem.start();
      // Neon flash light
      const flash = new BABYLON.PointLight("borderFlash", new BABYLON.Vector3(borderX, 1, ball.position.z), scene);
      flash.diffuse = borderX < 0 ? new BABYLON.Color3(1, 0.2, 0.2) : new BABYLON.Color3(0.2, 0.6, 1);
      flash.intensity = 5.0;
      flash.range = 5.0;
      setTimeout(() => { flash.dispose(); }, 500);

      // Reset ball to center and randomize color
      ball.position.x = 0;
      ball.position.z = 0;
      BALLSPEEDX = BALLSPEEDXDEFAULT;
      BALLSPEEDZ = BALLSPEEDZDEFAULT;
      ballDirX = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDX;
      ballDirZ = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDZ;
      ball.material.diffuseColor = randomColor3();
      return scene.render();
    }

    scene.render();
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
  });
}
