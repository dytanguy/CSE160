// Global variables
let canvas, gl;
let shaderProgram;
let shapesList = [];
let currentColor = [1.0, 0.0, 0.0];
let currentSize = 10;
let currentShapeType = 'point';
let currentSegments = 30;

let isAnimating = false;
let bounceShapes = [];
const SHAPES_PER_ROW = 10;
const ANIMATION_SPEED = 2;

const sceneObjects = [];

function setupWebGL() {
    canvas = document.getElementById('glCanvas');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
}

function connectVariablesToGLSL() {
    const vsSource = `
        attribute vec2 aPosition;
        attribute vec3 aColor;
        varying vec3 vColor;
        uniform float uPointSize;
        
        void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
            gl_PointSize = uPointSize;
            vColor = aColor;
        }
    `;
    
    const fsSource = `
        precision mediump float;
        varying vec3 vColor;
        
        void main() {
            gl_FragColor = vec4(vColor, 1.0);
        }
    `;
    
    const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
    
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return;
    }
    
    gl.useProgram(shaderProgram);
}

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

function renderAllShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    shapesList.forEach(shape => {
        shape.render(gl, shaderProgram);
    });
}

function handleClick(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) - canvas.width/2) / (canvas.width/2);
    const y = (canvas.height/2 - (ev.clientY - rect.top)) / (canvas.height/2);
    
    let newShape;
    
    if (currentShapeType === 'point') {
        newShape = new Point(x, y, currentColor, currentSize);
    } 
    else if (currentShapeType === 'triangle') {
        const size = currentSize / 100;
        newShape = new Triangle(
            x, y, 
            x - size, y - size, 
            x + size, y - size, 
            currentColor
        );
    } 
    else if (currentShapeType === 'circle') {
        const radius = currentSize / 100;
        newShape = new Circle(x, y, radius, currentColor, currentSegments);
    }
    
    shapesList.push(newShape);
    renderAllShapes();
}

function initEventListeners() {
    canvas.onmousedown = handleClick;
    canvas.onmousemove = (ev) => {
        if (ev.buttons === 1) { 
            handleClick(ev);
        }
    };
    
    document.getElementById('colorRed').addEventListener('input', (e) => {
        currentColor[0] = e.target.value / 100;
        document.getElementById('redValue').textContent = currentColor[0].toFixed(1);
    });
    
    document.getElementById('colorGreen').addEventListener('input', (e) => {
        currentColor[1] = e.target.value / 100;
        document.getElementById('greenValue').textContent = currentColor[1].toFixed(1);
    });
    
    document.getElementById('colorBlue').addEventListener('input', (e) => {
        currentColor[2] = e.target.value / 100;
        document.getElementById('blueValue').textContent = currentColor[2].toFixed(1);
    });
    
    document.getElementById('sizeSlider').addEventListener('input', (e) => {
        currentSize = parseInt(e.target.value);
        document.getElementById('sizeValue').textContent = currentSize;
    });
    
    document.getElementById('shapeType').addEventListener('change', (e) => {
        currentShapeType = e.target.value;
        document.getElementById('segmentsControl').style.display = 
            currentShapeType === 'circle' ? 'block' : 'none';
    });
    
    document.getElementById('segmentsSlider').addEventListener('input', (e) => {
        currentSegments = parseInt(e.target.value);
        document.getElementById('segmentsValue').textContent = currentSegments;
    });
    
    document.getElementById('clearButton').addEventListener('click', () => {
        shapesList = [];
        renderAllShapes();
    });

    document.getElementById('winButton').addEventListener('click', startBounceAnimation);

    document.getElementById('swordSceneButton').addEventListener('click', renderSwordScene);
}

function startBounceAnimation() {
    if (isAnimating) return;
    
    shapesList = [];
    bounceShapes = [];
    isAnimating = true;
    
    const ROWS = 3;
    const COLS = 10;
    
    for (let row = 0; row < ROWS; row++) {
        for (let i = 0; i < COLS; i++) {
            const type = ['point', 'triangle', 'circle'][Math.floor(Math.random() * 3)];
            const x = -0.9 + (i * 1.8 / COLS);
            const y = 0.8 - (row * 0.2);
            
            let shape;
            const color = [Math.random(), Math.random(), Math.random()];
            const size = 10 + Math.random() * 20;
            
            if (type === 'point') {
                shape = new Point(x, y, color, size);
            } else if (type === 'triangle') {
                const sizeVal = size / 100;
                shape = new Triangle(
                    x, y,
                    x - sizeVal, y - sizeVal,
                    x + sizeVal, y - sizeVal,
                    color
                );
            } else {
                shape = new Circle(x, y, size/100, color, 20 + Math.floor(Math.random() * 20));
            }
            
            shape.vx = (Math.random() - 0.5) * 0.02; 
            shape.vy = -0.01 - (Math.random() * 0.02); 
            shape.gravity = 0.001;
            shape.bounce = 0.6 + Math.random() * 0.2;
            
            bounceShapes.push(shape);
        }
    }
    
    requestAnimationFrame(animateBounce);
}

function animateBounce(timestamp) {
    if (!isAnimating) return;
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    let shapesStillMoving = false;
    
    bounceShapes.forEach(shape => {
        shape.vy -= shape.gravity;
        shape.y += shape.vy;
        shape.x += shape.vx;
        
        if (shape.y < -0.9) {
            shape.y = -0.9;
            shape.vy = -shape.vy * shape.bounce;
            shape.vx *= 0.8; 
        }
        
        if (shape.x < -1 || shape.x > 1) {
            shape.vx = -shape.vx * 0.5;
            shape.x = Math.max(-1, Math.min(1, shape.x));
        }
        
        if (Math.abs(shape.vy) > 0.001 || shape.y > -0.9) {
            shapesStillMoving = true;
        }
        
        shape.render(gl, shaderProgram);
    });
    
    if (shapesStillMoving) {
        requestAnimationFrame(animateBounce);
    } else {
        isAnimating = false;
        shapesList = [...bounceShapes];
    }
}

function renderSwordScene() {
    shapesList = [];
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    shapesList.push(new Triangle(-1, 1, 1, 1, -1, 0, [0.53, 0.81, 0.92]));
    shapesList.push(new Triangle(1, 1, -1, 0, 1, 0, [0.53, 0.81, 0.92]));
    
    shapesList.push(new Triangle(-1, 0, 1, 0, -1, -1, [0.47, 0.33, 0.22]));
    shapesList.push(new Triangle(1, 0, -1, -1, 1, -1, [0.47, 0.33, 0.22]));
    
    const treeBases = [-0.7, -0.2, 0.4];
    treeBases.forEach(x => {
        shapesList.push(new Triangle(
            x-0.03, -0.3,
            x+0.03, -0.3,
            x, -0.6,
            [0.4, 0.3, 0.2]
        ));
        
        shapesList.push(new Triangle(
            x-0.2, -0.3,
            x+0.2, -0.3,
            x, 0.1,
            [0.13, 0.55, 0.13]
        ));
        shapesList.push(new Triangle(
            x-0.15, -0.1,
            x+0.15, -0.1,
            x, 0.3,
            [0.13, 0.55, 0.13]
        ));
    });
    
    const stoneSize = 0.3;
    const stoneX = 0;
    const stoneY = -0.7;
    shapesList.push(new Triangle(
        stoneX - stoneSize/2, stoneY + stoneSize/2,
        stoneX + stoneSize/2, stoneY + stoneSize/2,
        stoneX - stoneSize/2, stoneY - stoneSize/2,
        [0.4, 0.4, 0.4]
    ));
    shapesList.push(new Triangle(
        stoneX + stoneSize/2, stoneY + stoneSize/2,
        stoneX - stoneSize/2, stoneY - stoneSize/2,
        stoneX + stoneSize/2, stoneY - stoneSize/2,
        [0.4, 0.4, 0.4]
    ));
    
    const bladeWidth = 0.02;
    const bladeTop = -0.1;
    const bladeBottom = stoneY + stoneSize/2;
    
    shapesList.push(new Triangle(
        0 - bladeWidth/2, bladeTop,
        0 + bladeWidth/2, bladeTop,
        0 - bladeWidth/2, bladeBottom,
        [0.8, 0.8, 0.85]
    ));
    shapesList.push(new Triangle(
        0 + bladeWidth/2, bladeTop,
        0 - bladeWidth/2, bladeBottom,
        0 + bladeWidth/2, bladeBottom,
        [0.8, 0.8, 0.85]
    ));
    
    const crossWidth = 0.1;
    const crossHeight = 0.05;
    const crossY = bladeBottom + 0.15;
    shapesList.push(new Triangle(
        0 - crossWidth/2, crossY,
        0 + crossWidth/2, crossY,
        0 - crossWidth/2, crossY + crossHeight,
        [0.6, 0.6, 0.6]
    ));
    shapesList.push(new Triangle(
        0 + crossWidth/2, crossY,
        0 - crossWidth/2, crossY + crossHeight,
        0 + crossWidth/2, crossY + crossHeight,
        [0.6, 0.6, 0.6]
    ));
    
    drawPolygon(0, crossY + 0.08, 0.03, 8, [0.9, 0.8, 0.1]);
    
    const stoneTopY = stoneY + stoneSize/2;
    const holderY = stoneTopY + 0.0; 
    const holderWidth = 0.2;
    const holderHeight = 0.05;

    shapesList.push(new Triangle(
        -0.1, holderY,          
        0.0, holderY,           
        -0.05, holderY + holderHeight, 
        [0.2, 0.2, 0.2]
    ));

    shapesList.push(new Triangle(
        0.0, holderY,           
        0.1, holderY,           
        0.05, holderY + holderHeight, 
        [0.2, 0.2, 0.2]
    ));

    shapesList.push(new Triangle(
        -0.05, holderY + holderHeight,  
        0.05, holderY + holderHeight,  
        0.0, holderY + holderHeight * -1.8, 
        [0.2, 0.2, 0.2]
    ));
    
    renderAllShapes();
}

function drawPolygon(centerX, centerY, radius, sides, color, rotation = 0) {
    const vertices = [];
    for (let i = 0; i < sides; i++) {
        const angle1 = rotation + (i * 2 * Math.PI / sides);
        const angle2 = rotation + ((i + 1) * 2 * Math.PI / sides);
        
        vertices.push(
            centerX, centerY,
            centerX + Math.cos(angle1) * radius, centerY + Math.sin(angle1) * radius,
            centerX + Math.cos(angle2) * radius, centerY + Math.sin(angle2) * radius
        );
    }
    
    for (let i = 0; i < vertices.length; i += 6) {
        shapesList.push(new Triangle(
            vertices[i], vertices[i+1],
            vertices[i+2], vertices[i+3],
            vertices[i+4], vertices[i+5],
            color
        ));
    }
}

function drawTriangleRect(x, y, width, height, color) {
    shapesList.push(new Triangle(
        x, y,
        x, y - height,
        x + width, y - height,
        color
    ));
    
    shapesList.push(new Triangle(
        x, y,
        x + width, y - height,
        x + width, y,
        color
    ));
}

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    initEventListeners();
    renderAllShapes();
}

window.onload = main;