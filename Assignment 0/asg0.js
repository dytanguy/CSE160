// DrawRectangle.js
function main() {
    // Retrieve <canvas> element                                  <- (1)
     var canvas = document.getElementById('example');
     if (!canvas) {
       console.log('Failed to retrieve the <canvas> element');
       return;
     }
    
  // Get the rendering context for 2DCG                          <- (2)
  var ctx = canvas.getContext('2d');

  // Draw a blue rectangle                                       <- (3)
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // Set a blue color
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill a rectangle with the color

  let v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  
  //Define the center of the canvas
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  //Scale factor
  const scale = 20;
  
  //Start drawing
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + v.elements[0] * scale, centerY - v.elements[1] * scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function handleDrawEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  
  //Clear the canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  //Get v1 values
  let v1x = parseFloat(document.getElementById('v1x').value);
  let v1y = parseFloat(document.getElementById('v1y').value);
  let v1 = new Vector3([v1x, v1y, 0]);
  
  //Get v2 values
  let v2x = parseFloat(document.getElementById('v2x').value);
  let v2y = parseFloat(document.getElementById('v2y').value);
  let v2 = new Vector3([v2x, v2y, 0]);
  
  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  
  //Clear canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  //Get v1 and v2 values
  let v1x = parseFloat(document.getElementById('v1x').value);
  let v1y = parseFloat(document.getElementById('v1y').value);
  let v1 = new Vector3([v1x, v1y, 0]);
  
  let v2x = parseFloat(document.getElementById('v2x').value);
  let v2y = parseFloat(document.getElementById('v2y').value);
  let v2 = new Vector3([v2x, v2y, 0]);
  
  //Draw original vectors
  drawVector(v1, "red");
  drawVector(v2, "blue");
  
  //Get operation and scalar
  let operation = document.getElementById('operation').value;
  let scalar = parseFloat(document.getElementById('scalar').value);
  
  //Perform specified operation
  switch(operation) {
      case 'add':
          let v3a = new Vector3(v1.elements).add(v2);
          drawVector(v3a, "green");
          break;
      case 'sub':
          let v3s = new Vector3(v1.elements).sub(v2);
          drawVector(v3s, "green");
          break;
      case 'mul':
          let v3m1 = new Vector3(v1.elements).mul(scalar);
          let v3m2 = new Vector3(v2.elements).mul(scalar);
          drawVector(v3m1, "green");
          drawVector(v3m2, "green");
          break;
      case 'div':
          let v3d1 = new Vector3(v1.elements).div(scalar);
          let v3d2 = new Vector3(v2.elements).div(scalar);
          drawVector(v3d1, "green");
          drawVector(v3d2, "green");
          break;
      case 'mag':
          console.log("Magnitude v1:", v1.magnitude());
          console.log("Magnitude v2:", v2.magnitude());
          break;
      case 'norm':
          let v3n1 = new Vector3(v1.elements).normalize();
          let v3n2 = new Vector3(v2.elements).normalize();
          drawVector(v3n1, "green");
          drawVector(v3n2, "green");
          break;
      case 'angle':
          let angle = angleBetween(v1, v2);
          console.log("Angle between v1 and v2:", angle, "radians");
          break;
      case 'area':
          let area = areaTriangle(v1, v2);
          console.log("Area of triangle:", area);
          break;
  }
}

function angleBetween(v1, v2) {
  let dot = Vector3.dot(v1, v2);
  let mag1 = v1.magnitude();
  let mag2 = v2.magnitude();
  return Math.acos(dot / (mag1 * mag2));
}

function areaTriangle(v1, v2) {
  let cross = Vector3.cross(v1, v2);
  return cross.magnitude() / 2;
}