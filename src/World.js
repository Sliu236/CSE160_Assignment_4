var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_ViewMatrix;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize(a_Normal); 
    v_VertPos = u_ModelMatrix * a_Position;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;

  uniform vec4 u_FragColor;
  uniform vec3 u_cameraPos;
  uniform vec3 u_LightColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform sampler2D u_Sampler4;
  uniform int u_whichTexture;
  uniform vec3 u_LightPos;
  varying vec4 v_VertPos;
  uniform bool u_lightOn;
  
  uniform vec3 u_SpotlightDir;    
  uniform float u_SpotlightCutoff;     
  uniform float u_SpotlightOuterCutoff; 

  void main() {
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -3) {
      gl_FragColor = vec4((normalize(v_Normal) + 1.0) / 2.0, 1.0);
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 2) {
      gl_FragColor = texture2D(u_Sampler2, v_UV);
    } else if (u_whichTexture == 3) {
      gl_FragColor = texture2D(u_Sampler3, v_UV);
    } else if (u_whichTexture == 4) {
      gl_FragColor = texture2D(u_Sampler4, v_UV);
    } else {
      gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
    }

    if (!u_lightOn) { 
      gl_FragColor = vec4(vec3(gl_FragColor) * 0.2, 1.0);
      return;
    }
    
  //Spot light
  vec3 lightDir = normalize(u_LightPos - vec3(v_VertPos));
  vec3 spotDir = normalize(u_SpotlightDir);

  float theta = dot(lightDir, -spotDir);
  float epsilon = u_SpotlightCutoff - u_SpotlightOuterCutoff;
  float intensity = clamp((theta - u_SpotlightOuterCutoff) / epsilon, 0.0, 1.0);

  vec3 N = normalize(v_Normal);
  float nDotL = max(dot(N, lightDir), 0.0); 

  vec3 R = reflect(-lightDir, N);
  vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
  float specular = pow(max(dot(E, R), 0.0), 200.0) * 0.8;


  vec3 ambient = vec3(gl_FragColor) * 0.2;
  vec3 diffuse = u_LightColor * nDotL * 0.7 * intensity;
  vec3 specularColor = u_LightColor * specular * 4.0 * intensity;

  gl_FragColor = vec4(diffuse + ambient + specularColor, 1.0);
  }
`;

let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_FragColor, u_ModelMatrix, u_ProjectionMatrix, u_GlobalRotateMatrix, u_ViewMatrix;
let u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4;


let camera;
let g_showNormal = false;  
let g_mouseDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let lastFrameTime = performance.now();
const MOUSE_SENSITIVITY = 0.002;

let g_lightPos = [0, 5, -2]; 
let g_lightOn = true;
let u_cameraPos;

let g_yellowAnimation = false;
let g_megentaAnimation = false;
let g_lightAnimation = false; 


let g_lightColor = [1.0, 0.8, 0.6];
let u_LightColor;

let g_spotlightDir = [0, -1, 0]; 
let g_spotlightCutoff = Math.cos(30 * Math.PI/180); 
let g_spotlightOuterCutoff = Math.cos(45 * Math.PI/180); 

let g_fishMoving = false;
let g_fishPosX = 0.0;
let g_fishPosY = 0.0;
let g_bodyBendAngle = 0.0;
let g_headSwing = 0.0;
let g_tailSwing = 0.0;
let g_fishAnimation = false;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get WebGL context');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');


  u_SpotlightDir = gl.getUniformLocation(gl.program, 'u_SpotlightDir');
  u_SpotlightCutoff = gl.getUniformLocation(gl.program, 'u_SpotlightCutoff');
  u_SpotlightOuterCutoff = gl.getUniformLocation(gl.program, 'u_SpotlightOuterCutoff');

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');

  let identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

  gl.uniform1i(u_lightOn, g_lightOn ? 1 : 0);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
}

function addActionForHtmlUI() {

  document.getElementById('lightSlide X').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[0] = this.value/100; renderAllShapes();}});
  document.getElementById('lightSlide Y').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[1] = this.value/100; renderAllShapes();}});
  document.getElementById('lightSlide Z').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[2] = this.value/100; renderAllShapes();}});

  document.getElementById('lightOn').onclick = function() {g_lightOn = true; renderScene();};
  document.getElementById('lightOff').onclick = function() {g_lightOn = false; renderScene();};

  document.getElementById('lightColorR').addEventListener('input', function(ev) {g_lightColor[0] = this.value / 100; renderScene();});
  document.getElementById('lightColorG').addEventListener('input', function(ev) {g_lightColor[1] = this.value / 100; renderScene();});
  document.getElementById('lightColorB').addEventListener('input', function(ev) {g_lightColor[2] = this.value / 100; renderScene();});

  document.getElementById('toggleLightAnimation').onclick = function() {g_lightAnimation = !g_lightAnimation; this.innerText = g_lightAnimation ? "Disable Light Animation" : "Enable Light Animation";};


  document.getElementById('spotlightCutoff').addEventListener('input', function () {let angle = parseFloat(this.value); g_spotlightCutoff = Math.cos(angle * Math.PI / 180); document.getElementById('cutoffValue').innerText = angle; renderScene();});
  document.getElementById('spotlightOuterCutoff').addEventListener('input', function () {let angle = parseFloat(this.value); g_spotlightOuterCutoff = Math.cos(angle * Math.PI / 180); document.getElementById('outerCutoffValue').innerText = angle; renderScene();});

  let angleSlider = document.getElementById('cameraRotateSlider');
  if (angleSlider) {
    angleSlider.addEventListener('input', function () {
      let angle = parseFloat(this.value);
      camera.setYaw(angle);
      renderScene();
    });
  }

  canvas.addEventListener("mousedown", function (ev) {
    g_mouseDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });
  canvas.addEventListener("mousemove", function (ev) {
    if (g_mouseDragging) {
      let dx = ev.clientX - g_lastMouseX;
      camera.panLeft(dx * 0.05);
      g_lastMouseX = ev.clientX;
      renderScene();
    }
  });
  canvas.addEventListener("mouseup", function () {
    g_mouseDragging = false;
  });

}

function toggleNormal() {
  g_showNormal = !g_showNormal;
  console.log("Normal mode:", g_showNormal);
  renderScene();
}

function setupPointerLock() {
  canvas.addEventListener("click", function () {
    canvas.requestPointerLock();
  });
  document.addEventListener("pointerlockchange", function () {
    if (document.pointerLockElement === canvas) {
      console.log("Pointer locked");
    } else {
      console.log("Pointer unlocked");
    }
  });
  document.addEventListener("mousemove", function (ev) {
    if (document.pointerLockElement !== canvas) return;
    camera.yaw += ev.movementX * MOUSE_SENSITIVITY;
    camera.pitch -= ev.movementY * MOUSE_SENSITIVITY;
    camera.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.pitch));
    camera.updateDirection();
    camera.updateViewMatrix();
    renderScene();
  });
}

function initTextures() {
  let image0 = new Image();
  let image3 = new Image();
  let image4 = new Image();
  if (!image0 || !image3 || !image4) {
    console.log('Failed to create image objects');
    return false;
  }

  image0.onload = function() { sendTextureToGLSL(image0, gl.TEXTURE0, u_Sampler0); };
  image3.onload = function() { sendTextureToGLSL(image3, gl.TEXTURE3, u_Sampler3); };
  image4.onload = function() { sendTextureToGLSL(image4, gl.TEXTURE4, u_Sampler4); };

  image0.src = 'brick.webp';
  image3.src = 'sky2.jpg';
  image4.src = 'grass2.jpg';
  return true;
}

function sendTextureToGLSL(image, texUnit, samplerUniform) {
  let texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(texUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.uniform1i(samplerUniform, texUnit - gl.TEXTURE0);
  console.log("Texture loaded into unit", texUnit - gl.TEXTURE0);
}

function keydown(ev) {
  if (camera.handleKeyDown(ev.key)) {
    renderScene();
    return;
  }
  renderScene();
}
document.onkeydown = keydown;


function drawFloor() {
  let floor = new Cube();
  floor.textureNum = 4; 
  floor.matrix.translate(0, -0.75, 0);
  floor.matrix.scale(32, 0, 32);
  floor.matrix.translate(-0.5, 0, -0.5);
  floor.render();
}

function drawSky() {
  let sky = new Cube();
  sky.textureNum = g_showNormal ? -3 : 3; 
  sky.matrix.scale(-10, -20, -20);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();
}

function drawCenterCube() {
  let cube = new Cube();
  cube.color = [1, 0.6, 0.3, 0];
  cube.textureNum = g_showNormal ? -3 : -2;
  cube.matrix.translate(0, -0.2, -3);
  cube.matrix.setTranslate(0, 0, -1);
  cube.matrix.scale(1, 1, 1);
  cube.render();
}

function drawCenterSphere() {
  let sphere = new Sphere();
  sphere.color = [1.0, 0.5, 0.5, 1.0];
  sphere.textureNum = g_showNormal ? -3 : 2;
  sphere.matrix.translate(-1.5, 0.5, -3);
  sphere.matrix.scale(1, 1, 1);
  sphere.render();
}

function drawLight() {
  var light = new Cube();
  light.color = [1, 1, 0, 1];
  light.textureNum = -2;
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-.1, -.1, -.1);
  light.matrix.translate(-0.5, -0.5, -0.5);
  light.render();
}


function renderFishBody(x, y, z) {
  let fishMatrix = new Matrix4();
  fishMatrix.setTranslate(x, y, z);  
  fishMatrix.scale(4, 4, 5);  

  let fishHeights = [1, 2, 2.5, 3.5, 5.2, 4.3, 3.5, 2.5, 4.0, 5];
  let fishColors = [
      [1.0, 0.5, 0.0, 1.0], [1.0, 0.5, 0.0, 1.0], [1.0, 1.0, 1.0, 1.0],
      [1.0, 0.5, 0.0, 1.0], [0.0, 0.0, 0.0, 1.0], [1.0, 1.0, 1.0, 1.0],
      [1.0, 0.5, 0.0, 1.0], [1.0, 1.0, 1.0, 1.0], [1.0, 0.5, 0.0, 1.0],
      [0.0, 0.0, 0.0, 1.0]
  ];
  
  let baseWidth = 0.08, baseDepth = 0.1, heightFactor = 0.1;
  let eyeSize = 0.05, eyeOffsetZ = baseDepth / 2;
  let gap = 0.01, totalWidth = fishHeights.length * (baseWidth + gap);
  let startX = -totalWidth / 2;
  let yOffsets = [0, -0.1, -0.15, -0.25, -0.38, -0.30, -0.25, -0.15, -0.3, -0.4];
  let centerX = startX + 4 * (baseWidth + gap) + baseWidth / 2;
  let decayFactor = 0.6;
  
  for (let i = 0; i < fishHeights.length; i++) {
      let part = new Cube();
      part.color = fishColors[i] || [0.0, 0.5, 1.0, 1.0];
      part.textureNum = -2;
  
      let currentHeight = fishHeights[i] * heightFactor;
      let xPos = startX + i * (baseWidth + gap) + baseWidth / 2;
      let yPos = (g_bodyBendAngle > 0) ? yOffsets[4] + fishHeights[4] * heightFactor - currentHeight + 0.3 :
                 (g_bodyBendAngle < 0) ? yOffsets[4] + 0.2 :
                 yOffsets[i] + currentHeight / 2;
  
      part.matrix = new Matrix4(fishMatrix);
      part.matrix.translate(xPos, yPos, 0);

      if (i < 5) {
          let swingAngle = g_headSwing * Math.pow(decayFactor, i);
          part.matrix.translate(centerX - xPos, 0, 0);
          part.matrix.rotate(swingAngle, 0, 1, 0);
          part.matrix.translate(-(centerX - xPos), 0, 0);
      }
      if (i > 4) {
          let swingAngle = -g_tailSwing * Math.pow(decayFactor, 9 - i);
          part.matrix.translate(centerX - xPos, 0, 0);
          part.matrix.rotate(swingAngle, 0, 1, 0);
          part.matrix.translate(-(centerX - xPos), 0, 0);
      }
    
      part.matrix.scale(baseWidth, currentHeight, baseDepth);
      part.render();

      if (i === 1) {
          let leftEye = new Cube(), rightEye = new Cube();
          leftEye.color = [0.0, 0.0, 0.0, 1.0];
          rightEye.color = [0.0, 0.0, 0.0, 1.0];
  
          let eyeX = xPos, eyeY = yPos + 0.07;
          let eyeZFront = eyeOffsetZ + 0.04, eyeZBack = -eyeOffsetZ + 0.03;
          let swingAngle = g_headSwing * Math.pow(decayFactor, 1);
  
          leftEye.matrix = new Matrix4(fishMatrix);
          leftEye.matrix.translate(eyeX, eyeY, eyeZFront);
          leftEye.matrix.translate(centerX - eyeX, 0, 0);
          leftEye.matrix.rotate(swingAngle, 0, 1, 0);
          leftEye.matrix.translate(-(centerX - eyeX), 0, 0);
          leftEye.matrix.scale(eyeSize, eyeSize, eyeSize * 0.5);
          leftEye.textureNum = -2;
          leftEye.render();
  
          rightEye.matrix = new Matrix4(fishMatrix);
          rightEye.matrix.translate(eyeX, eyeY, eyeZBack);
          rightEye.matrix.translate(centerX - eyeX, 0, 0);
          rightEye.matrix.rotate(swingAngle, 0, 1, 0);
          rightEye.matrix.translate(-(centerX - eyeX), 0, 0);
          rightEye.matrix.scale(eyeSize, eyeSize, eyeSize * 0.5);
          rightEye.textureNum = -2;
          rightEye.render();
      }
  }
}



function renderScene() {
  let identity = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, identity.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  gl.uniform3fv(u_SpotlightDir, g_spotlightDir);
  gl.uniform1f(u_SpotlightCutoff, g_spotlightCutoff);
  gl.uniform1f(u_SpotlightOuterCutoff, g_spotlightOuterCutoff);

  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_cameraPos, camera.eye.x, camera.eye.y, camera.eye.z);
  gl.uniform1i(u_lightOn, g_lightOn ? 1 : 0);

  drawFloor();
  drawLight();

  renderFishBody(0, 2, -0.5);  
  
  drawCenterCube();

  drawCenterSphere();

  drawSky();
}


function tick() {
  let now = performance.now();
  let dt = now - lastFrameTime;
  let g_seconds = (performance.now() / 1000) % 360;
  lastFrameTime = now;
  let fps = 1000 / dt;
  document.getElementById("numdot").innerText = "FPS: " + fps.toFixed(1);

  let fishX = Math.sin(performance.now() / 1000) * 2; 
  renderFishBody(fishX, 1, -3);

  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  let time = performance.now() / 1000; 

  if (g_yellowAnimation) {
      g_yellowAngle = 45 * Math.sin(time);
  }
  if (g_megentaAnimation) {
      g_megentaAngle = 45 * Math.sin(3 * time);
  }


  if (g_lightAnimation) {
      let radius = 2.5;  
      g_lightPos[0] = Math.cos(time) * radius;
      g_lightPos[2] = Math.sin(time) * radius - 2; 
  }
}



function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionForHtmlUI();
  setupPointerLock();

  camera = new Camera();

  initTextures();

  gl.clearColor(0, 0, 0, 1.0);
  requestAnimationFrame(tick);
}
main();

