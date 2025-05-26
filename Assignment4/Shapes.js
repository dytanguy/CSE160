'use strict';

/**
 * @param {WebGL2RenderingContext} gl
 * @param {Number} drawType
 * @param {Number} n 
 * @param {Matrix4} matrix 
 * @param {Number[]} color 
 * @param {GLint} a_Position 
 * @param {WebGLUniformLocation} u_FragColor 
 * @param {WebGLUniformLocation} u_Matrix 
 */
function drawPrimitive(gl, drawType, n, matrix, color, 
    a_Position, a_Normal, u_FragColor, u_Matrix, vertBuffer, normalBuffer){

    gl.uniform4f(u_FragColor, ...color, 1);
    gl.uniformMatrix4fv(u_Matrix, false, matrix.elements);

    if(!vertBuffer){
        throw new Error('No vert buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    if(!normalBuffer){
        throw new Error('No vert buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(drawType, 0, n);
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {Number} drawType
 * @param {Number} n 
 * @param {Float32Array} vertices 
 * @param {Float32Array} uvs
 * @param {Matrix4} matrix 
 * @param {GLint} a_Position 
 * @param {GLint} a_UV 
 * @param {WebGLUniformLocation} u_Matrix 
 */
function drawPrimitiveUV(gl, drawType, n, matrix, 
    a_Position, a_UV, a_Normal, u_Matrix, vertBuffer, uvBuffer, normalBuffer){
    gl.uniformMatrix4fv(u_Matrix, false, matrix.elements);
    if(!vertBuffer){
        throw new Error('Could not create vert buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    if(!uvBuffer){
        throw new Error('Could not create UV buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);
    if(!normalBuffer){
        throw new Error('No normal buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
    gl.drawArrays(drawType, 0, n);
}

class Cube {
    baseVerts = [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 0],
        [0, 1, 1],
        [1, 0, 0],
        [1, 0, 1],
        [1, 1, 0],
        [1, 1, 1],
    ];
    baseNormals = [
         0,  1,  0,
         0, -1,  0,
         0,  0, -1,
         0,  0,  1,
        -1,  0,  0,
         1,  0,  0,
    ]
    baseIndVerts = [
        2, 7, 6,
        2, 3, 7,
        0, 4, 5,
        0, 5, 1,
        0, 2, 6,
        0, 6, 4,
        1, 7, 3,
        1, 5, 7,
        0, 3, 2,
        0, 1, 3,
        4, 6, 7,
        4, 7, 5
    ];

    /**
     * @param {Matrix4} matrix 
     * @param {Number[][] | Number[]} face_colors 
     * @param {Number[]} scale 
     */
    constructor (matrix, face_colors, scale) {
        this.vertices = [];
        for (var i = 0; i < this.baseIndVerts.length; i++){
            var [x, y, z] = this.baseVerts[this.baseIndVerts[i]];
            this.vertices.push(
                (x - 0.5) * 2 * scale[0],
                (y - 0.5) * 2 * scale[1],
                (z - 0.5) * 2 * scale[2],
            );
        }
        this.vertices = new Float32Array(this.vertices);
        this.normals = [];
        for (let i = 0; i < this.baseNormals.length; i += 3){
            for (let j = 0; j < 6; j++){
                this.normals.push(this.baseNormals[i + 0],
                                  this.baseNormals[i + 1],
                                  this.baseNormals[i + 2]);
            }
        }
        this.normals = new Float32Array(this.normals);
        if (!(face_colors[0] instanceof Array) && (face_colors instanceof Array)){
            this.face_colors = [];
            for (var i = 0; i < 8; i++){
                this.face_colors.push(face_colors);
            }
        } else {
            this.face_colors = face_colors;
        }
        this.matrix = matrix;
        this.vertBuffer = null;
        this.normalBuffer = null;
    }
    /**
     * @param {WebGL2RenderingContext} gl
     * @param {GLint} a_Position 
     * @param {WebGLUniformLocation} u_FragColor 
     * @param {WebGLUniformLocation} u_Matrix 
     */
    render(gl, a_Position, a_Normal, u_FragColor, u_Matrix, u_NormalMatrix){
        gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4(this.matrix).invert().transpose().elements);
        if (this.vertBuffer == null){
            this.vertBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
        }
        if (this.normalBuffer == null){
            this.normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW);
        }
        drawPrimitive(gl, gl.TRIANGLES, this.vertices.length / 3, 
            this.matrix, this.face_colors[0], a_Position, a_Normal, u_FragColor, u_Matrix,
            this.vertBuffer, this.normalBuffer
        );
    }
}

class TexCube extends Cube {
    uvs = [ 
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,

        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,

        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
    ];
    /**
     * @param {Matrix4} matrix 
     * @param {String | String[]} face_texs 
     * @param {[Number, Number, Number]} scale 
     */
    constructor(matrix, face_texs, scale){
        super(matrix, [0, 0, 0], scale);
        this.face_texs = this.face_texs instanceof Array ? face_texs : Array(8).fill(face_texs);
        this.uvs = new Float32Array(this.uvs);
        this.uvBuffer = null;
        this.normalBuffer = null;
        this.vertBuffer = null;
    }
    render(gl, a_Position, a_Normal, a_UV, u_Matrix, u_NormalMatrix){
        if (this.vertBuffer == null){
            this.vertBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        }
        if (this.uvBuffer == null){
            this.uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
        }
        if (this.normalBuffer == null){
            this.normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW);
        }
        drawPrimitiveUV(gl, gl.TRIANGLES, this.vertices.length / 3, this.matrix, 
            a_Position, a_UV, a_Normal, u_Matrix, this.vertBuffer, this.uvBuffer, this.normalBuffer
        );
    }
}

let sphereData = null;
let sphereBuffers = null;

function generateSphereIndexed(radius = 1, latBands = 20, longBands = 20) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let lat = 0; lat <= latBands; ++lat) {
    const theta = lat * Math.PI / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= longBands; ++lon) {
      const phi = lon * 2 * Math.PI / longBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      positions.push(radius * x, radius * y, radius * z);
      normals.push(x, y, z);
    }
  }

  for (let lat = 0; lat < latBands; ++lat) {
    for (let lon = 0; lon < longBands; ++lon) {
      const first = lat * (longBands + 1) + lon;
      const second = first + longBands + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices)
  };
}


let icosphereData = null;
let icosphereBuffers = null;

function drawSphere(gl, matrix, color, attribs, uniforms) {
  if (!icosphereData) {
    icosphereData = generateFinalUnsharedIcosphere(2, 1.0);
  }

  if (!icosphereBuffers) {
    icosphereBuffers = {
      vertBuffer: gl.createBuffer(),
      normalBuffer: gl.createBuffer(),
    };


    gl.bindBuffer(gl.ARRAY_BUFFER, icosphereBuffers.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, icosphereData.vertices, gl.STATIC_DRAW);


    gl.bindBuffer(gl.ARRAY_BUFFER, icosphereBuffers.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, icosphereData.normals, gl.STATIC_DRAW);

  }

  gl.uniform4f(uniforms.u_FragColor, ...color, 1.0);
  gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, matrix.elements);

  gl.bindBuffer(gl.ARRAY_BUFFER, icosphereBuffers.vertBuffer);
  gl.vertexAttribPointer(attribs.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, icosphereBuffers.normalBuffer);
  gl.vertexAttribPointer(attribs.a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Normal);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, icosphereBuffers.indexBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, icosphereData.vertices.length / 3);


}





function generateFinalUnsharedIcosphere(subdivisions = 2, radius = 1.0) {
  const t = (1 + Math.sqrt(5)) / 2;

  const normalize = (v) => {
    const len = Math.hypot(...v);
    return v.map((x) => x / len);
  };

  let vertices = [
    [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
    [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
    [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1],
  ].map(normalize);

  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  const midpoint = (v1, v2) => {
    return normalize([
      (v1[0] + v2[0]) / 2,
      (v1[1] + v2[1]) / 2,
      (v1[2] + v2[2]) / 2,
    ]);
  };

  for (let s = 0; s < subdivisions; s++) {
    const newFaces = [];
    const newVertices = [...vertices];
    for (const [a, b, c] of faces) {
      const v1 = vertices[a], v2 = vertices[b], v3 = vertices[c];
      const ab = midpoint(v1, v2);
      const bc = midpoint(v2, v3);
      const ca = midpoint(v3, v1);
      const abIdx = newVertices.length; newVertices.push(ab);
      const bcIdx = newVertices.length; newVertices.push(bc);
      const caIdx = newVertices.length; newVertices.push(ca);
      newFaces.push(
        [a, abIdx, caIdx],
        [b, bcIdx, abIdx],
        [c, caIdx, bcIdx],
        [abIdx, bcIdx, caIdx]
      );
    }
    vertices = newVertices;
    faces = newFaces;
  }


  const positions = [];
  const normals = [];
  for (const [a, b, c] of faces) {
    for (const idx of [a, b, c]) {
      const v = normalize(vertices[idx]).map(n => n * radius);
      positions.push(...v);
      normals.push(...normalize(v));
    }
  }

  return {
    vertices: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: null 
  };
}


function drawSphereDepth(gl, matrix, attribs, uniforms) {
  if (!icosphereData) {
    icosphereData = generateFinalUnsharedIcosphere(2, 1.0);
  }

  if (!icosphereBuffers) {
    icosphereBuffers = {
      vertBuffer: gl.createBuffer()
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, icosphereBuffers.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, icosphereData.vertices, gl.STATIC_DRAW);
  }

  gl.uniformMatrix4fv(uniforms.u_ModelMatrix, false, matrix.elements);
  gl.bindBuffer(gl.ARRAY_BUFFER, icosphereBuffers.vertBuffer);
  gl.vertexAttribPointer(attribs.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, icosphereData.vertices.length / 3);
}

window.drawSphereDepth = drawSphereDepth;
window.drawSphere = drawSphere;
