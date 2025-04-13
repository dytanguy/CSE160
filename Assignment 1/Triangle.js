class Triangle {
    constructor(x1, y1, x2, y2, x3, y3, color) {
        this.centerX = (x1 + x2 + x3) / 3;
        this.centerY = (y1 + y2 + y3) / 3;
        this.relativeVertices = [
            x1 - this.centerX, y1 - this.centerY,
            x2 - this.centerX, y2 - this.centerY,
            x3 - this.centerX, y3 - this.centerY
        ];
        
        this.color = color.slice(); 
        
        this.x = this.centerX;
        this.y = this.centerY;
        this.vx = 0;
        this.vy = 0;
        this.gravity = 0;
        this.bounce = 0;
    }

    getCurrentVertices() {
        return [
            this.x + this.relativeVertices[0], this.y + this.relativeVertices[1],
            this.x + this.relativeVertices[2], this.y + this.relativeVertices[3],
            this.x + this.relativeVertices[4], this.y + this.relativeVertices[5]
        ];
    }

    render(gl, shaderProgram) {
        const vertices = this.getCurrentVertices();
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        const aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        const colors = [];
        for (let i = 0; i < 3; i++) {
            colors.push(...this.color);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        const aColor = gl.getAttribLocation(shaderProgram, 'aColor');
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(colorBuffer);
    }
}