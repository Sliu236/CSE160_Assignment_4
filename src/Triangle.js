/*[student's name: Size Liu]
[sliu236@ucsc.edu 1852375]

Notes to Grader:
[N/A]*/
class Triangle {
  constructor() {
    this.type='triangle';
    this.position = [0.0,0.0,0.0];
    this.color = [1.0,1.0,1.0,1.0];
    this.size = 5;
  }
  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    //var xy = g_shapeList[i].position;
    //var rgba = g_shapeList[i].color;
    //var size = g_shapeList[i].size;

    // Pass the position of a point to a_Position variable
    // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the color of a point to u_FragColor variable
    gl.uniform1f(u_Size, size);
    // Draw
    //gl.drawArrays(gl.POINTS, 0, 1);
    var d = this.size/200.0;
    drawTriangle([xy[0], xy[1], xy[0] + d, xy[1], xy[0], xy[1] + d]);
  }

}




function drawTriangle(vertices) {
 // var vertices = new Float32Array([
 //   0, 0.5,   -0.5, -0.5,   0.5, -0.5
 // ]);
  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
  //return n;
}

function drawTriangle3D(vertices) {
  // var vertices = new Float32Array([
  //   0, 0.5,   -0.5, -0.5,   0.5, -0.5
  // ]);
   var n = 3; // The number of vertices
 
   // Create a buffer object
   var vertexBuffer = gl.createBuffer();
   if (!vertexBuffer) {
     console.log('Failed to create the buffer object');
     return -1;
   }
 
   // Bind the buffer object to target
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   // Write date into the buffer object
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
 
   gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
 
   // Enable the assignment to a_Position variable
   gl.enableVertexAttribArray(a_Position);
 
   gl.drawArrays(gl.TRIANGLES, 0, n);
   //return n;
 }

 function drawTriangle3DUV(vertices, uv) {
   var n = 3; // The number of vertices
 
   // Create a buffer object
   var vertexBuffer = gl.createBuffer();
   if (!vertexBuffer) {
     console.log('Failed to create the buffer object');
     return -1;
   }
 
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
   gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(a_Position);
 

  var uvBuffer = gl.createBuffer();
  if (!uvBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);
  
  gl.drawArrays(gl.TRIANGLES, 0, n);
  //return n;
 }

 function drawTriangle3DUVNormal(vertices, uv, normals) {
  var n = vertices.length/3;  // The number of vertices

  // Create a buffer object for positions
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.log('Failed to create vertex buffer');
      return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  // Create a buffer object for UVs
  var uvBuffer = gl.createBuffer();
  if (!uvBuffer) {
      console.log('Failed to create uv buffer');
      return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);


  // Create a buffer object for normals
  var normalBuffer = gl.createBuffer();
  if (!normalBuffer) {
      console.log('Failed to create normal buffer');
      return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Normal variable
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Normal variable
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, n);
  g_vertexBuffer = null;
}