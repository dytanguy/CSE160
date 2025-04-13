class Circle {
    constructor(x, y, radius, color, segments, aspectRatio = 1) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color.slice();
        this.segments = segments;
        this.aspectRatio = aspectRatio;
        
        this.positionBuffer = null;
        this.colorBuffer = null;
        this.vertexCount = 0;
    }

    generateVertices() {
        const vertices = [this.x, this.y]; 
        const colors = [...this.color]; 
        
        for (let i = 0; i <= this.segments; i++) {
            const angle = (i / this.segments) * Math.PI * 2;
            const x = this.x + Math.cos(angle) * this.radius;
            const y = this.y + Math.sin(angle) * this.radius * this.aspectRatio;
            
            vertices.push(x, y);
            colors.push(...this.color);
        }
        
        this.vertexCount = vertices.length / 2;
        return { vertices, colors };
    }

    render(gl, shaderProgram) {
        const { vertices, colors } = this.generateVertices();
        
        if (!this.positionBuffer) {
            this.positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
        }
        
        const aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        if (!this.colorBuffer) {
            this.colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        const aColor = gl.getAttribLocation(shaderProgram, 'aColor');
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.vertexCount);
    }
}