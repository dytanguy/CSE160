class Point {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color.slice();
        this.size = size;
        this.positionBuffer = null;
        this.colorBuffer = null;
    }
    
    render(gl, shaderProgram) {
        if (!this.positionBuffer) {
            this.positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([this.x, this.y]), gl.STATIC_DRAW);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([this.x, this.y]));
        }
        
        const aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
        
        if (!this.colorBuffer) {
            this.colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.color), gl.STATIC_DRAW);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        const aColor = gl.getAttribLocation(shaderProgram, 'aColor');
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
        
        const uPointSize = gl.getUniformLocation(shaderProgram, 'uPointSize');
        gl.uniform1f(uPointSize, this.size);
        
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}