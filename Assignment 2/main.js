window.onload = function () {

  // Matrix utilities
  function createIdentityMatrix() {
    return [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
  }
  function multiplyMatrices(a, b) {
    let result = new Array(16).fill(0);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        for (let i = 0; i < 4; i++) {
          result[row * 4 + col] += a[row * 4 + i] * b[i * 4 + col];
        }
      }
    }
    return result;
  }
  function translationMatrix(tx, ty, tz) {
    let m = createIdentityMatrix();
    m[12] = tx; m[13] = ty; m[14] = tz;
    return m;
  }
  function scaleMatrix(sx, sy, sz) {
    let m = createIdentityMatrix();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
  }
  function rotationZMatrix(degrees) {
    let rad = degrees * Math.PI / 180;
    let c = Math.cos(rad), s = Math.sin(rad);
    let m = createIdentityMatrix();
    m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
    return m;
  }
  function rotationYMatrix(degrees) {
    let rad = degrees * Math.PI / 180;
    let c = Math.cos(rad), s = Math.sin(rad);
    let m = createIdentityMatrix();
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return m;
  }
  
  // WebGL setup
  let canvas = document.getElementById("webgl");
  let gl = canvas.getContext("webgl");
  if (!gl) console.log("Failed to get WebGL context.");
  gl.enable(gl.DEPTH_TEST);

  canvas.addEventListener("click", function(e) {
    if (e.shiftKey) {
      g_isEating = !g_isEating;
    }
  });
  
  canvas.addEventListener("mousedown", function(e) {
    g_isDragging = true;
    g_lastMouseX = e.clientX;
  });
  
  canvas.addEventListener("mousemove", function(e) {
    if (g_isDragging) {
      let deltaX = e.clientX - g_lastMouseX;
      gAnimalGlobalRotation += deltaX * 0.5;
      g_lastMouseX = e.clientX;
      document.getElementById("globalRotation").value = gAnimalGlobalRotation;
      renderScene();
    }
  });
  
  canvas.addEventListener("mouseup", function(e) {
    g_isDragging = false;
  });
  
  canvas.addEventListener("mouseleave", function(e) {
    g_isDragging = false;
  });
  
  
  
  
  // Global state
  let gAnimalGlobalRotation = 0;
  let gBackLeftAngle = 0, gFrontRightAngle = 0;
  let gFrontLeftAngle = 0, gBackRightAngle = 0;
  let gUpperLegAngleBL = 0, gLowerLegAngleBL = 0;
  let gUpperLegAngleBR = 0, gLowerLegAngleBR = 0;
  let g_jawAngle = 0, g_headBob = 0;
  let g_isAnimating = false;
  let g_isEating = false;
  let g_isMoving = false;
  let gBodyAngle = 0; // Angle that controls entire Body
  let gAdjustableBodyAngle = 0;
  let gTailBaseAngle = -25;
  let gTailMiddleAngle = -70;
  let gTailTipAngle = -5;
  let g_isDragging = false;
  let g_lastMouseX = 0;
  
  // Shaders
  let VSHADER_SOURCE = document.getElementById("vertex-shader").text;
  let FSHADER_SOURCE = document.getElementById("fragment-shader").text;
  function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  function createProgram(gl, vShaderSource, fShaderSource) {
    let vShader = createShader(gl, gl.VERTEX_SHADER, vShaderSource);
    let fShader = createShader(gl, gl.FRAGMENT_SHADER, fShaderSource);
    let program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }
  let program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  gl.useProgram(program);
  gl.program = program;
  
  let u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
  let uGlobalRotation = gl.getUniformLocation(program, 'uGlobalRotation');
  let u_Color = gl.getUniformLocation(program, 'u_Color');
  
  let a_Position = gl.getAttribLocation(program, 'a_Position');
  let vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  let vertices = new Float32Array([
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,
     0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,
     0.5,  0.5, -0.5, -0.5,  0.5, -0.5
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
  let indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    1, 5, 6, 1, 6, 2,
    5, 4, 7, 5, 7, 6,
    4, 0, 3, 4, 3, 7,
    3, 2, 6, 3, 6, 7,
    4, 5, 1, 4, 1, 0
  ]);
  let indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  
  // Wireframe edges
  let edgeIndices = new Uint16Array([
    0, 1, 1, 2, 2, 3, 3, 0,
    4, 5, 5, 6, 6, 7, 7, 4,
    0, 4, 1, 5, 2, 6, 3, 7
  ]);
  let edgeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, edgeIndices, gl.STATIC_DRAW);
  
  function drawCube(matrix, color) {
    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix);
    gl.uniform4fv(u_Color, color);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
  
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  
    gl.uniform4fv(u_Color, [0, 0, 0, 1]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
    gl.drawElements(gl.LINES, edgeIndices.length, gl.UNSIGNED_SHORT, 0);
  }

  // Triangle vertex buffer
  let triangleVertices = new Float32Array([
    0.0,  0.5, 0.0,  
    -0.5, -0.5, 0.0,  
    0.5, -0.5, 0.0  
  ]);

  let triangleVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

  // Triangle edge indices (lines)
  let triangleEdgeIndices = new Uint16Array([
    0, 1,  
    1, 2,  
    2, 0   
  ]);

  let triangleEdgeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleEdgeBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleEdgeIndices, gl.STATIC_DRAW);


  function drawTriangle(matrix, color) {

    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix);
    gl.uniform4fv(u_Color, color);
  
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
  
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  
    gl.uniform4fv(u_Color, [0, 0, 0, 1]); 
  
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleEdgeBuffer);
    gl.drawElements(gl.LINES, triangleEdgeIndices.length, gl.UNSIGNED_SHORT, 0);
  }
  
  
  function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uGlobalRotation, false, rotationYMatrix(gAnimalGlobalRotation));
  
    // Body rework
    let mainBodyMatrix = multiplyMatrices(translationMatrix(0, (g_isAnimating ? Math.sin(g_seconds * 5) * 0.02 : 0), 0), rotationZMatrix(gBodyAngle + gAdjustableBodyAngle));
    drawCube(multiplyMatrices(mainBodyMatrix, scaleMatrix(0.5, 0.5, 0.5)), [0.9, 0.5, 0.5, 1]);

    // Upper Jaw
    let upperJawMatrix = multiplyMatrices(mainBodyMatrix, translationMatrix(1, 0.4 + g_headBob * 0.01, 0.0));
    drawCube(multiplyMatrices(upperJawMatrix, scaleMatrix(0.3, 0.2, 0.2)), [1, 0.7, 0.7, 1]);
    
    // Actual Lower Jaw
    let lowerJawLocal = multiplyMatrices(
      scaleMatrix(0.25, 0.1, 0.18),   
      multiplyMatrices(
        rotationZMatrix(g_jawAngle),      
        translationMatrix(0.28, -0.053 + g_headBob * 0.01, 0)
      )
    );
    
    let lowerJawMatrix = multiplyMatrices(mainBodyMatrix, lowerJawLocal);
    
    drawCube(lowerJawMatrix, [0.9, 0.5, 0.5, 1]);

    // Back Left Leg
    // Back Left Upper Leg
    let backLeftUpperLegMatrix = multiplyMatrices(mainBodyMatrix, multiplyMatrices(translationMatrix(-0.75, -1, 0.7), rotationZMatrix(gBackLeftAngle)));
    drawCube(multiplyMatrices(backLeftUpperLegMatrix, scaleMatrix(0.1, 0.3, 0.1)), [1, 0.7, 0.7, 1]);
    // Back Left Lower Leg
    let backLeftLowerLegMatrix = multiplyMatrices(backLeftUpperLegMatrix, multiplyMatrices(rotationZMatrix(gBackLeftAngle), translationMatrix(0, -0.38, 0)));
    drawCube(multiplyMatrices(backLeftLowerLegMatrix, scaleMatrix(0.09, 0.4, 0.09)), [0.9, 0.5, 0.5, 1]);
  
    // Front Left Leg
    // Front Left Upper Leg
    let frontLeftUpperLegMatrix = multiplyMatrices(mainBodyMatrix, multiplyMatrices(translationMatrix(0.75, -1.0, 0.7), rotationZMatrix(gFrontLeftAngle)));
    drawCube(multiplyMatrices(frontLeftUpperLegMatrix, scaleMatrix(0.1, 0.3, 0.1)), [1, 0.7, 0.7, 1]);
    // Front Left Lower Leg
    let frontLeftLowerLegMatrix = multiplyMatrices(frontLeftUpperLegMatrix, multiplyMatrices(rotationZMatrix(gFrontLeftAngle), translationMatrix(0, -0.38, 0)));
    drawCube(multiplyMatrices(frontLeftLowerLegMatrix, scaleMatrix(0.09, 0.4, 0.09)), [0.9, 0.5, 0.5, 1]);

    // Back Right Leg
    // Back Right Upper Leg
    let backRightUpperLegMatrix = multiplyMatrices(mainBodyMatrix, multiplyMatrices(translationMatrix(-0.75, -1.0, -0.7), rotationZMatrix(gBackRightAngle)));
    drawCube(multiplyMatrices(backRightUpperLegMatrix, scaleMatrix(0.1, 0.3, 0.1)), [1, 0.7, 0.7, 1]);
    // Back Right Lower Leg
    let backRightLowerLegMatrix = multiplyMatrices(backRightUpperLegMatrix, multiplyMatrices(rotationZMatrix(gBackRightAngle), translationMatrix(0, -0.38, 0)));
    drawCube(multiplyMatrices(backRightLowerLegMatrix, scaleMatrix(0.09, 0.4, 0.09)), [0.9, 0.5, 0.5, 1]);

    // Front Right Leg
    // Front Right Upper Leg
    let frontRightUpperLegMatrix = multiplyMatrices(mainBodyMatrix, multiplyMatrices(translationMatrix(0.75, -1.0, -0.7), rotationZMatrix(gFrontRightAngle)));
    drawCube(multiplyMatrices(frontRightUpperLegMatrix, scaleMatrix(0.1, 0.3, 0.09)), [1, 0.7, 0.7, 1]);
    // Front Right Lower Leg
    let frontRightLowerLegMatrix = multiplyMatrices(frontRightUpperLegMatrix, multiplyMatrices(rotationZMatrix(gFrontRightAngle), translationMatrix(0, -0.38, 0)));
    drawCube(multiplyMatrices(frontRightLowerLegMatrix, scaleMatrix(0.09, 0.4, 0.09)), [0.9, 0.5, 0.5, 1]);

    // Pig Tail with 3 Parts
    // Tail Base
    let tailBase = multiplyMatrices(mainBodyMatrix, multiplyMatrices(translationMatrix(-2, 2, 0), rotationZMatrix(gTailBaseAngle)));
    drawCube(multiplyMatrices(tailBase, scaleMatrix(0.3, 0.01, 0.01)), [1, 0.7, 0.7, 1]);
    // Tail MidSection
    let tailMiddleLocal = multiplyMatrices(
      scaleMatrix(0.3, 0.01, 0.01),
      multiplyMatrices(
        rotationZMatrix(gTailMiddleAngle), 
        translationMatrix(-0.4, -0.2, 0) 
      )
    );
    let tailMiddleMatrix = multiplyMatrices(tailBase, tailMiddleLocal);
    drawCube(tailMiddleMatrix, [1, 0.7, 0.7, 1]);

    // Tail Tip
    let tailTipLocal = multiplyMatrices(
      scaleMatrix(0.2, 0.9, 1.2),
      multiplyMatrices(
        rotationZMatrix(gTailTipAngle),
        translationMatrix(-0.4, 0.2, 0)
      )
    );
    let tailTipMatrix = multiplyMatrices(tailMiddleMatrix, tailTipLocal);
    drawCube(tailTipMatrix, [1, 0.7, 0.7, 1]);
    
    //Triangle Ear Right
    let earRight = multiplyMatrices(mainBodyMatrix, multiplyMatrices(rotationYMatrix(90), translationMatrix(0.2, 2.9, 0.5)));
    drawTriangle(multiplyMatrices(earRight, scaleMatrix(1, 0.1, 0.3)), [1, 0.7, 0.7, 1]);

    //Triangle Ear Left
    let earLeft = multiplyMatrices(mainBodyMatrix, multiplyMatrices(rotationYMatrix(90), translationMatrix(0.2, 2.9, -0.5)));
    drawTriangle(multiplyMatrices(earLeft, scaleMatrix(1, 0.1, 0.3)), [1, 0.7, 0.7, 1]);

  }

  let g_seconds = 0;
  let g_lastTime = performance.now();
  let g_frameCount = 0;
  let g_fps = 0;
  let g_frameElapsed = 0;

  function tick() {
    let now = performance.now();
    let elapsed = now - g_lastTime;
    g_lastTime = now;
    
    g_seconds += elapsed / 1000.0;
    g_frameCount++;
    g_frameElapsed += elapsed

    if (g_frameElapsed >= 1000.0) { 
      g_fps = g_frameCount;
      g_frameCount = 0;
      g_frameElapsed = 0;
      document.getElementById('fpsCounter').innerText = `FPS: ${g_fps}`;
  }

    if (g_isAnimating) {
      if (g_isEating) {
        g_jawAngle = 25 * Math.sin(g_seconds * 6);
        g_headBob = 2 * Math.sin(g_seconds * 2);
      }

      if (g_isMoving) {
        gBodyAngle = 2 * Math.sin(g_seconds * 5);
      }
    }

    renderScene();
    requestAnimationFrame(tick);
  }

  
  document.getElementById("globalRotation").oninput = e => {
    if (!g_isDragging) { 
      gAnimalGlobalRotation = Number(e.target.value); 
      renderScene();
    }
  };
  
  document.getElementById("BackLeftAngle").oninput = e => { gBackLeftAngle = e.target.value; renderScene(); };
  document.getElementById("FrontRightAngle").oninput = e => { gFrontRightAngle = e.target.value; renderScene(); };
  document.getElementById("FrontLeftAngle").oninput = e => { gFrontLeftAngle = e.target.value; renderScene(); };
  document.getElementById("BackRightAngle").oninput = e => { gBackRightAngle = e.target.value; renderScene(); };
  document.getElementById("AdjustableBodyAngle").oninput = e=> { gAdjustableBodyAngle = e.target.value; renderScene(); };
  document.getElementById("TailBaseAngle").oninput = e => { gTailBaseAngle = e.target.value; renderScene(); };
  document.getElementById("TailMiddleAngle").oninput = e => { gTailMiddleAngle = e.target.value; renderScene(); };
  document.getElementById("TailTipAngle").oninput = e => { gTailTipAngle = e.target.value; renderScene(); };
  document.getElementById("MovingToggle").onclick = e => g_isMoving = !g_isMoving;
  document.getElementById("animateBtn").onclick = () => g_isAnimating = !g_isAnimating;
  
  
  tick();
  
};