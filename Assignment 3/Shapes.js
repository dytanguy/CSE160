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