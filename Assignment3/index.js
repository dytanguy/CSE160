'use strict';
var VSHADER_SOURCE =`#version 300 es
in vec4 a_Position;
in vec2 a_UV;
in vec3 a_Normal;
in ivec4 a_offset;

out vec2 v_UV;
out vec3 v_Normal;
out vec4 v_vertPos;
uniform mat4 u_ModelMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

uniform vec3 u_minAABB;
uniform vec3 u_maxAABB;

uniform vec3 u_lightPos;
out vec3 v_lightPos;
uniform vec4 u_illumination;
out vec4 v_illumination;

out vec4 v_diffuse;
flat out int v_tex;
out vec4 v_projVertPos;

uniform int u_doingInstances;
void main() {

  // if (u_doingInstances == 1 && 
  //  (any(lessThan(vec3(a_offset) + vec3(.5), u_minAABB)) || 
  //   any(greaterThan(vec3(a_offset) - vec3(.5), u_maxAABB)))){
  //    gl_Position = vec4(vec3(2.), 1);
  //    return;
  //  }

  v_vertPos = u_doingInstances == 1 ? (a_Position + vec4(a_offset.xyz, 0)) : u_ModelMatrix * a_Position;
  v_Normal = a_Normal;
  v_UV = vec2(a_UV.x, a_UV.y);
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * v_vertPos;
  v_projVertPos = gl_Position;
  v_tex = a_offset.w;

  vec3 lightVector = normalize(u_lightPos);
  v_diffuse =  u_illumination * max(0., dot(normalize(a_Normal), lightVector));
  v_illumination = u_illumination;
  v_lightPos = u_lightPos;
}`;

// Fragment shader program
var FSHADER_SOURCE =`#version 300 es
precision highp float;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
uniform sampler2D u_Sampler5;
uniform sampler2D u_Sampler6;

uniform highp sampler2DShadow u_depthTex;
uniform int u_colorSrc;

uniform bool u_isDepth;
uniform int u_shadingLevel;

in vec3 v_lightPos;
in vec4 v_illumination;
uniform vec3 u_cameraPos;

in vec2 v_UV;
in vec3 v_Normal;
in vec4 v_vertPos;
in vec4 v_projVertPos;

in vec4 v_diffuse;
flat in int v_tex;

uniform mat4 u_CamViewMatrix;
uniform mat4 u_CamProjectionMatrix;

uniform int u_depthTexSize;
uniform bool u_doingShadowMap;

vec4 k_ambient = vec4(.5, .5, .5, 1);
vec4 k_specular = vec4(1, 1, 1, 1);
float n_specular = 2.;

out vec4 fragColor;

float sampleShadow(vec3 p, vec2 offset){
  vec2 texelSize = 2.0 / vec2(textureSize(u_depthTex, 0));
  bool notInRange = p.x > 1. || p.x < 0. 
              || p.y > 1. || p.y < 0.;
  
  float inShadow = texture(u_depthTex, vec3(p.xy + offset * texelSize, p.z - 0.00001));
  
  return notInRange ? 0.0 : 1. - inShadow;
}

float shadowAmnt(vec3 p){
  float res = 0.0;
  float total = 0.0;
  for (float i = -2.5; i <= 2.5; i++){
    for (float j = -2.5; j <= 2.5; j++){
      res += float(sampleShadow( p, vec2(i, j)));
      total += 1.0;
    }
  }
  return res / total;
}

void main() {
  vec4 baseColor = vec4(1);
  if (u_colorSrc == 3){
      if (v_tex == 0){
        baseColor = texture(u_Sampler0, v_UV);
      } else if (v_tex == 1){
        baseColor = texture(u_Sampler1, v_UV);
      } else if (v_tex == 2){
        baseColor = texture(u_Sampler2, v_UV);
      } else if (v_tex == 3){
        baseColor = texture(u_Sampler3, v_UV);
      } else if (v_tex == 4){
        baseColor = texture(u_Sampler4, v_UV);
      } else if (v_tex == 5){
        baseColor = texture(u_Sampler5, v_UV);
      } else if (v_tex == 6) {
        baseColor = texture(u_Sampler6, v_UV);
      }
  } else if (u_colorSrc == 4){
    baseColor = texture(u_Sampler1, v_UV);
  }

  vec4 projPoint1 = u_CamProjectionMatrix * u_CamViewMatrix * v_vertPos;
  vec3 projPoint = projPoint1.xyz / projPoint1.w;
  projPoint.xy = projPoint.xy;

  vec3 lightVector = normalize(v_lightPos);
  vec3 cameraVector = normalize(u_cameraPos - vec3(v_vertPos));
  vec3 halfway = normalize(lightVector + cameraVector);
  fragColor = k_ambient;
  if (u_shadingLevel > 1){
    fragColor += (1. - shadowAmnt(projPoint.xyz)) * v_diffuse;
  } else {
    fragColor += v_diffuse;
  }
  // fragColor += v_diffuse;
  // fragColor += k_specular * v_illumination * pow(max(0., dot(normalize(v_Normal), halfway)), n_specular);
  if (u_shadingLevel != 0){
    fragColor *= baseColor;
  } else {
    fragColor = baseColor; 
  }
}`;

var shadowShaders = [
  `#version 300 es
  precision highp float;
  in vec4 a_Position;
  in vec2 a_UV;
  in vec3 a_Normal;
  in ivec4 a_offset;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  uniform vec3 u_minAABB;
  uniform vec3 u_maxAABB;

  uniform vec3 u_lightPos;
  uniform vec4 u_illumination;

  uniform int u_doingInstances;
  void main() {
    gl_Position = u_doingInstances == 1 ? (a_Position + vec4(a_offset.xyz, 0)) : u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * gl_Position;
  }
  `,
  `#version 300 es
  precision highp float;
  out vec4 fragColor;
  void main(){fragColor = vec4(1);}
  `
]


let gld = {
  a_Position: null,
  a_UV: null,
  a_offset: null,
  a_Normal: null,
  // a_UVoffset: null,
  u_lightPos: null,
  u_cameraPos: null,
  u_illumination: null,
  u_ModelMatrix: null,
  u_FragColor: null, 
  u_ViewMatrix: null, 
  u_ProjectionMatrix: null, 
  u_Sampler0: null,
  u_Sampler1: null,
  u_Sampler2: null,
  u_Sampler3: null,
  u_Sampler4: null,
  u_Sampler5: null,
  u_Sampler6: null,
  u_colorSrc: null, 
  u_doingInstances: null, 
  u_minAABB: null, 
  u_maxAABB: null,
  u_NormalMatrix: null,
  u_depthTex: null,
  u_CamProjectionMatrix: null,
  u_CamViewMatrix: null,
  u_depthTexSize: null,
  u_doingShadowMap: null,
  u_shadingLevel: null,
};

/** @type {Camera} */
let camera;

let mainShader, shadowShader;

const moveSpeed = .5;
const panSpeed = 5;

var world = [
  [19,19,19,19,19,19,19,19,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [19,21,21,21,21,21,21,19,17,19,21,23,25,25,23,21,19,17,17,17,35,35,33,33,31,31,29,29,27,27,27,17],
  [19,21,23,23,23,23,21,19,17,21,18,17,17,17,17,18,21,17,17,17,35,35,33,33,31,31,29,29,27,27,27,17],
  [19,21,23,25,25,23,21,19,17,23,17,19,17,17,19,17,23,17,17,17,35,35,33,33,31,31,29,29,27,27,27,17],
  [19,21,23,25,25,23,21,19,17,25,17,17,17,17,17,17,25,17,17,17,37,37,39,41,41,43,43,43,25,25,25,17],
  [19,21,23,23,23,23,21,19,17,25,17,17,17,17,17,17,25,17,17,17,37,37,39,41,41,43,43,43,25,25,25,17],
  [19,21,21,21,21,21,21,19,17,23,17,19,17,17,19,17,23,17,17,17,17,17,19,19,21,21,23,23,23,23,23,17],
  [19,19,19,19,19,19,19,19,17,21,18,17,17,17,17,18,21,17,17,17,17,17,19,19,21,21,23,23,23,23,23,17],
  [17,17,17,17,17,17,17,17,17,19,21,23,25,25,23,21,19,17,17,17,17,17,19,19,21,21,23,23,23,23,23,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,21,21,21,21,21,21,21,21,21,21,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,21,17,17,21,17,17,17,17,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,17,17,21,21,17,21,21,21,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,17,21,21,21,17,21,17,17,17,17,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,17,17,17,21,17,17,17,21,21,21,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,21,21,17,21,17,21,17,21,21,17,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,17,21,17,21,17,21,21,21,21,17,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,17,21,17,21,17,17,17,17,17,17,21,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
  [17,21,17,17,17,21,17,21,21,21,21,21,21,17,17,17,17,17,17,17,17,17,23,23,23,17,23,23,23,17,17,17],
  [17,21,21,21,17,21,17,21,21,21,21,17,21,17,17,17,17,17,17,17,21,21,23,40,40,25,40,40,23,21,21,17],
  [17,21,17,17,17,17,17,17,17,17,17,17,21,17,17,17,17,17,17,17,21,21,25,40,50,50,50,40,25,21,21,17],
  [17,21,21,21,17,21,21,21,21,21,21,17,21,17,17,17,17,17,17,17,21,21,25,40,50,70,50,40,25,21,21,17],
  [17,21,21,21,17,17,17,21,17,21,21,17,21,17,17,17,17,17,17,17,21,21,25,40,50,50,50,40,25,21,21,17],
  [17,21,17,17,17,21,17,21,17,17,17,17,21,17,17,17,17,17,17,17,21,21,23,40,40,25,40,40,23,21,21,17],
  [17,21,17,21,21,21,21,21,21,21,21,21,21,17,17,17,17,17,17,17,17,17,23,23,23,17,23,23,23,17,17,17],
  [17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17],
];

/** @type {World} */
var wObj = null;
const cubeSize = .5;
var mouseSensitivity = 0.5;

const fpsText = document.getElementById("fps");

var ext, ext2;

let ground = new TexCube(new Matrix4().translate(0, -5, 0).scale(10, 1, 10), null, [1, 1, 1]);


let acc_frame_time = 0;

var lightSize = 1 << 11;

/** @type {Light} */
let light = new Light(new Vector4([.6, .6, .6, 1]), new Camera(1, true, 200));
light.camera.move(100, 50, 100);
light.camera.panUp(45);
light.camera.panRight(45);


var fullWorldSize = 75;

let depthTex, depthFrameBuffer;

let cmPos = new TexCube(new Matrix4(light.camera.viewMatrix).invert(), null, [.1, .1, .5]);

var last_time = 0;
var frameNumber = 0;

let shadow_gld = {
  a_Position: null,
  a_offset: null,
  u_ModelMatrix: null,
  u_ProjectionMatrix: null,
  u_ViewMatrix: null,
  u_doingInstances: null,
}


/**

 * @returns {[WebGL2RenderingContext, HTMLCanvasElement]} 
 */
function setupWebGL(){
  var canvas = document.getElementById('webgl');

  var gl = canvas.getContext("webgl2", {preserveDrawingBuffer: false});
  if (!gl) {
    throw new Error('Failed to get the rendering context for WebGL');
  }

  return [gl, canvas];
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {string[]} attrs
 * @param {string[]} unifs
 * @returns {[GLint[], WebGLUniformLocation[]]}
 */
function connectVariablesToGLSL(gl, attrs, unifs){
  var out = [[], []];

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    throw new Error('Couldnt initialize the shaders :c');
  }

  for (var i = 0; i < attrs.length; i++){
    var attr = gl.getAttribLocation(gl.program, attrs[i]);
    if (attr < 0) {
      throw new Error(`Couldn't get the attribute's storage location ${attrs[i]}`);
    }
    out[0].push(attr);
  }

  for (var i = 0; i < unifs.length; i++){
    var unif = gl.getUniformLocation(gl.program, unifs[i]);
    if (unif < 0) {
      throw new Error(`Couldn't get the attribute's storage location ${unifs[i]}`);
    }
    out[1].push(unif);
  }

  return out;
}

function connectDataToGLSL(gl, prog, gld){

  for (var k in gld){
    let attr;
    if (k[0] === 'a'){
      attr = gl.getAttribLocation(prog, k);
    } else if (k[0] == 'u'){
      attr = gl.getUniformLocation(prog, k);
    }

    if (attr < 0) {
      throw new Error(`Couldn't get the attribute's storage location ${k}`);
    }
    gld[k] = attr;
  }
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLTexture} texture 
 * @param {WebGLUniformLocation} u_Sampler 
 * @param {HTMLImageElement} image 
 */
function loadTexture(gl, texture, u_Sampler, image, num) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0 + num);
  gl.bindTexture(gl.TEXTURE_2D, texture);
 
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, !num ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.uniform1i(u_Sampler, num);
}

/**
 * @param {WebGL2RenderingContext} gl 
 */
function clearCanvas(gl){
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLUniformLocation} u_Sampler 
 */
function initTextures(gl, src, u_Sampler, num){

  var texture = gl.createTexture();
  if (!texture) {
    throw new Error("Could not create texture!");
  }

  var image = new Image();
  if (!image){
    throw new Error("Could not create image");
  }
  image.onload = () => loadTexture(gl, texture, u_Sampler, image, num);
  image.src = src;

}

function main() {
  var [gl, canvas] = setupWebGL();

  lightSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  init_world();

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0.53, 0.81, 0.92, 1.0);

  mainShader = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  if (!mainShader){
    throw new Error("Could not create main shader!");
  }

  shadowShader = createProgram(gl, ...shadowShaders);
  if(!shadowShader){
    throw new Error("Could not create shadow shader!");
  }

  connectDataToGLSL(gl, mainShader, gld);
  connectDataToGLSL(gl, shadowShader, shadow_gld);
  gl.program = mainShader;
  gl.useProgram(mainShader);

  camera = new Camera(canvas.width/canvas.height);
  camera.move(0, 0, 40 * cubeSize);
  gl.uniformMatrix4fv(gld.u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  initTextures(gl, "tex/stone_bricks.png", gld.u_Sampler0, 0);
  initTextures(gl, "tex/grass.png", gld.u_Sampler1, 1);
  initTextures(gl, "tex/dirt.png", gld.u_Sampler2, 2);
  initTextures(gl, "tex/stone_bricks2.png", gld.u_Sampler3, 3);
  initTextures(gl, "tex/clay.png", gld.u_Sampler4, 4);
  initTextures(gl, "tex/stone.png", gld.u_Sampler5, 5);
  initTextures(gl, "tex/oak_planks.png", gld.u_Sampler6, 6);

  clearCanvas(gl);
  const shadingSelector = document.getElementById("shading");
  gl.uniform1i(gld.u_shadingLevel, ~~shadingSelector.value);
  shadingSelector.onchange = (e) => {
    gl.uniform1i(gld.u_shadingLevel, ~~e.target.value);
  }

  document.onkeydown = function(ev){
    switch (ev.key){
      case "w":
        camera.moveForwards(moveSpeed);
        break;
      case "s":
        camera.moveBackwards(moveSpeed);
        break;
      case "a":
        camera.moveLeft(moveSpeed);
        break;
      case "d":
        camera.moveRight(moveSpeed);
        break;
      case "q":
        camera.panLeft(panSpeed);
        break;
      case "e":
        camera.panRight(panSpeed);
        break;
      case "k":
        break;
    }
    wObj.cull(camera);

  }

  canvas.onmousedown = function(ev){
    const blockStep = 2 * cubeSize;
    let dir = new Vector3(camera.at.elements).sub(camera.eye).normalize();
    let target = new Vector3(camera.eye.elements).add(dir.mul(blockStep * 1.5));
    for (let i = 0; i < 3; i++) {
      target.elements[i] = Math.round(target.elements[i] / blockStep) * blockStep;
    }

    if (ev.button === 0) {
      wObj.changePoint(...target.elements, 0);
    } else if (ev.button === 2) {
      wObj.changePoint(...target.elements, 6); 
    }

    getShadowMap(gl);
    wObj.cull(camera);
  };
  canvas.onclick = async (ev) => {
    await canvas.requestPointerLock();
  }

  let camPan = (xDiff, yDiff) => {
    camera.panRight(xDiff * mouseSensitivity);
    yPan += yDiff * mouseSensitivity;
    if (Math.abs(yPan) > MAX_Y_PAN){
      yPan = Math.sign(yPan) * MAX_Y_PAN;
    } else {
      camera.panUp(yDiff * mouseSensitivity);
    }
    wObj.cull(camera);
  }

  let yPan = 0;
  const MAX_Y_PAN = 85;
  canvas.onmousemove = (ev) => {

    if (document.pointerLockElement != canvas) return;
    camPan(ev.movementX, ev.movementY);
  }

  /**
   * 
   * @param {Event} ev 
   */
  function buttonPressed (id) {
    switch (id){
      case "Up":
        document.dispatchEvent(new KeyboardEvent("keydown", {key: "w"}));
        break;
      case "Down":
        document.dispatchEvent(new KeyboardEvent("keydown", {key: "s"}));
        break;
      case "Left":
        document.dispatchEvent(new KeyboardEvent("keydown", {key: "a"}));
        break;
      case "Right":
        document.dispatchEvent(new KeyboardEvent("keydown", {key: "d"}));
        break;
    }
  }

  gl.uniform1i(gld.u_depthTexSize, lightSize);
  gl.uniform1i(gld.u_depthTex, 31);
  wObj.cull(camera);
  wObj.fillOffsetCache();
  getShadowMap(gl);
  tick(gl);

}

function terrainHeight(x, y){
  let n = 0;
  for (let iter = 1; iter <= 1; iter++){
    let height = 5 / (1 << (iter));
    if (height < 2) break;
    n += Math.round(Math.sin(y * 0.1 + iter * 2.6) * height + height) + 
          Math.round(Math.sin(x * 0.2 + iter * 2.3) * height + height);
  }

  n += 10;
  return Math.max(0, n);
}

function setLightPos(){
  let worldBounds = wObj.getAABBPoints();

  light.camera.goTo(fullWorldSize / 2, fullWorldSize / 4, fullWorldSize / 2);

  let lightAABB = [[1000, 0], [1000, 0], [1000, 0]];
  for (let i = 0; i < worldBounds.length; i++){
    let bound = worldBounds[i];
    let transBound = light.camera.viewMatrix.multiplyVector3(bound).elements;
    for (let j = 0; j < lightAABB.length; j++){
      lightAABB[j][0] = Math.min(transBound[j], lightAABB[j][0]);
      lightAABB[j][1] = Math.max(transBound[j], lightAABB[j][1])
    }
  }
  light.camera.projectionMatrix.setOrtho(...lightAABB[0], ...lightAABB[1], lightAABB[2][0], lightAABB[2][1] - lightAABB[2][0]);
}

function init_world(){

  const wallHeight = 17;
  world[0] = Array(32).fill(wallHeight);
  world[31] = Array(32).fill(wallHeight);
  for (var y = 0; y < world.length; y++){
    world[y][0] = wallHeight;
    world[y][31] = wallHeight;
  }

  let padding = Math.floor((fullWorldSize - world.length) / 2);
  while (world.length < fullWorldSize - 2 * padding) {
    world.push(Array(world[0].length).fill(0));
  }
  for (let i = 0; i < world.length; i++) {
    while (world[i].length < fullWorldSize - 2 * padding) {
      world[i].push(0);
    }
  }

  let newWorld = [];
  for (let y = 0; y < fullWorldSize; y++){
    newWorld.push([])
    for (let x = 0; x < fullWorldSize; x++){
      if (padding <= y && y < fullWorldSize - padding && padding <= x && x < fullWorldSize - padding){
        newWorld[y].push(world[y - padding][x - padding]);
      } else {
        newWorld[y].push(terrainHeight(x, y));
      }
    }
  }
  wObj = new World(newWorld, cubeSize, padding);

  setLightPos();
}

/**
 * @param {WebGL2RenderingContext} gl 
 */
function getShadowMap(gl){
  gl.program = shadowShader;
  gl.useProgram(shadowShader);
  gl.cullFace(gl.FRONT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFrameBuffer);
  gl.uniformMatrix4fv(shadow_gld.u_ProjectionMatrix, false, light.camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(shadow_gld.u_ViewMatrix, false, light.camera.viewMatrix.elements);
  gl.viewport(0, 0, lightSize, lightSize);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  wObj.renderFast(gl, ext, shadow_gld, true);
  gl.program = mainShader;
  gl.useProgram(mainShader);
  gl.cullFace(gl.BACK);
  gl.uniform1i(gld.u_doingShadowMap, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(gld.u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(gld.u_ViewMatrix, false, camera.viewMatrix.elements);
}

let firstRun = true;
/**
 * @param {WebGL2RenderingContext} gl 
 */
function renderScene(gl){

  let start = performance.now();

  if (!depthTex || !depthFrameBuffer){
    gl.activeTexture(gl.TEXTURE31);
    depthTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT32F,
      lightSize,
      lightSize,
      0,
      gl.DEPTH_COMPONENT,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);

    depthFrameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFrameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
  }

  gl.uniformMatrix4fv(gld.u_CamProjectionMatrix, false, 
    new Matrix4().translate(0.5, 0.5, 0.5).scale(0.5, 0.5, 0.5).multiply(light.camera.projectionMatrix).elements);
  gl.uniformMatrix4fv(gld.u_CamViewMatrix, false, new Matrix4(light.camera.viewMatrix).elements);
  
  if (firstRun) {
    getShadowMap(gl);
    firstRun = false;
  }

  clearCanvas(gl);
  gl.uniform1i(gld.u_colorSrc, 3);

  let [minPt, maxPt] = camera.getAABB();
  gl.uniform3fv(gld.u_maxAABB, maxPt.elements);
  gl.uniform3fv(gld.u_minAABB, minPt.elements);
  wObj.renderFast(gl, ext, gld);

  let curr_frame_time = performance.now() - start
  acc_frame_time += curr_frame_time;

  gl.uniform3f(gld.u_cameraPos, ...camera.eye.elements);
  gl.uniformMatrix4fv(gld.u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniform3f(gld.u_lightPos, ...new Vector3(light.camera.eye.elements).sub(light.camera.at).elements);
  gl.uniform4f(gld.u_illumination, ...light.illum.elements);

}

function tick(gl) {
  function do_frame(ts){
    renderScene(gl);
    frameNumber++;
    requestAnimationFrame(do_frame);
  }
  requestAnimationFrame(do_frame);
}

setInterval(()=>{
  let frameTime = 1000 / frameNumber;
  fpsText.innerText = Math.round(1000 / frameTime);
  frameNumber = 0;
  acc_frame_time = 0;
}, 1000);