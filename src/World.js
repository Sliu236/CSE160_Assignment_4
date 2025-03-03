// 顶点着色器
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
    v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
  }
`;

// 片元着色器
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;

  uniform vec4 u_FragColor;
  uniform vec3 u_cameraPos;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform sampler2D u_Sampler4;
  uniform int u_whichTexture;
  uniform vec3 u_LightPos;
  varying vec4 v_VertPos;
  uniform bool u_lightOn;
  

  void main() {
    if (u_whichTexture == -2) {
      // 固定颜色模式
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -3) {
      // 法线可视化模式
      // 这里用 vec4(v_Normal, 1.0) 或 vec4((v_Normal+1.0)/2.0, 1.0) 都行
      gl_FragColor = vec4((normalize(v_Normal) + 1.0) / 2.0, 1.0);
    } else if (u_whichTexture == -1) {
      // UV 可视化
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
      // 默认红色
      gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
    }

    vec3 lightVector =u_LightPos - vec3(v_VertPos);
    float r=length(lightVector);

    // N dot L
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N, L), 0.0);

    // Reflection
    vec3 R = reflect(-L, N);

    // eye
    vec3 E = normalize(u_cameraPos-vec3(v_VertPos));

    // specular
    float specular = pow(max(dot(E, R), 0.0), 50.0) * 0.8;
    

    vec3 lightColor = vec3(1.0, 0.8, 0.6);

    vec3 diffuse = lightColor * nDotL * 0.7;
    vec3 ambient = vec3(gl_FragColor) * 0.2;
    vec3 specularColor = lightColor * specular * 1.5;
    gl_FragColor = vec4(diffuse + ambient + specularColor, 1.0);
  }
`;

let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_FragColor, u_ModelMatrix, u_ProjectionMatrix, u_GlobalRotateMatrix, u_ViewMatrix;
let u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4;


let camera;
let g_showNormal = false;  // 是否开启法线可视化
let g_mouseDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let lastFrameTime = performance.now();
const MOUSE_SENSITIVITY = 0.002;

let g_lightPos = [0, 1, -2]; // 光源位置
let u_cameraPos;

let g_yellowAnimation = false;
let g_megentaAnimation = false;

// 初始化 WebGL
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get WebGL context');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

// 初始化着色器变量
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

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');

  let identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// 绑定事件
function addActionForHtmlUI() {

  document.getElementById('lightSlide X').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[0] = this.value/100; renderAllShapes();}});
  document.getElementById('lightSlide Y').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[1] = this.value/100; renderAllShapes();}});
  document.getElementById('lightSlide Z').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) { g_lightPos[2] = this.value/100; renderAllShapes();}});


  // 示例：若有摄像机旋转滑块
  let angleSlider = document.getElementById('cameraRotateSlider');
  if (angleSlider) {
    angleSlider.addEventListener('input', function () {
      let angle = parseFloat(this.value);
      camera.setYaw(angle);
      renderScene();
    });
  }

  // 监听鼠标拖拽
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

// 切换法线可视化
function toggleNormal() {
  g_showNormal = !g_showNormal;
  console.log("Normal mode:", g_showNormal);
  renderScene();
}

// 摄像机移动相关
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

// 初始化纹理
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

  // 示例：0=brick, 3=sky2, 4=grass2
  image0.src = 'brick.webp';
  image3.src = 'sky2.jpg';
  image4.src = 'grass2.jpg';
  return true;
}

// 将纹理传给 GLSL
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

// 处理键盘事件
function keydown(ev) {
  if (camera.handleKeyDown(ev.key)) {
    renderScene();
    return;
  }
  renderScene();
}
document.onkeydown = keydown;

// =============== 仅保留 Floor & Sky ===============

// 绘制地板
function drawFloor() {
  let floor = new Cube();
  floor.textureNum = 4; // grass2.jpg (示例)
  floor.matrix.translate(0, -0.75, 0);
  floor.matrix.scale(32, 0, 32);
  floor.matrix.translate(-0.5, 0, -0.5);
  floor.render();
}

// 绘制天空盒
function drawSky() {
  let sky = new Cube();
  sky.textureNum = g_showNormal ? -3 : -2; // -3=法线可视化, 3=sky2.jpg
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

function renderScene() {
  let identity = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, identity.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_cameraPos, camera.eye.x, camera.eye.y, camera.eye.z);

  drawFloor();
  drawLight();
  drawCenterCube();
  drawCenterSphere();
  drawSky();
}


// 动画循环
function tick() {
  let now = performance.now();
  let dt = now - lastFrameTime;
  let g_seconds = (performance.now() / 1000) % 360;
  lastFrameTime = now;
  let fps = 1000 / dt;
  document.getElementById("numdot").innerText = "FPS: " + fps.toFixed(1);

  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  let time = performance.now() / 1000; // 获取当前时间（秒）
  
  if (g_yellowAnimation) {
    g_yellowAngle = 45 * Math.sin(time);
  }
  if (g_megentaAnimation) {
    g_megentaAngle = 45 * Math.sin(3 * time);
  }

  // 让光源围绕 (0,1,-2) 旋转
  let radius = 2.15;  // 旋转半径
  g_lightPos[0] = Math.cos(time) * radius;
  g_lightPos[2] = Math.sin(time) * radius - 2; // 保持在 -2 附近
}


// 主函数
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionForHtmlUI();
  setupPointerLock();

  // 创建摄像机
  camera = new Camera();

  // 初始化纹理
  initTextures();

  gl.clearColor(0, 0, 0, 1.0);
  requestAnimationFrame(tick);
}
main();

