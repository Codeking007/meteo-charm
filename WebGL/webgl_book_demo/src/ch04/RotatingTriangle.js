// RotatingTriangle.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'void main() {\n' +
  '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
  '}\n';

// Rotation angle (degrees/second)
// fixme:旋转速度（度/秒）
var ANGLE_STEP = 45.0;

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Write the positions of vertices to a vertex shader
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  // fixme:设置一次就好了。由于程序需要反复绘制三角形，所以我们早早就指定了背景色，而不是在绘制之前
  // fixme:在WebGL中，设置好的背景色在重设之前一直有效
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Get storage location of u_ModelMatrix
  // fixme:同样的，设置一次就好了
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Current rotation angle
  // fixme:三角形当前旋转角度
  var currentAngle = 0.0;
  // Model matrix
  // fixme:模型矩阵，Matrix4对象==>这个也创建一次就好了，要不降低性能。这样在调用draw()函数时，只需要调用含set前缀的方法重新计算，而不需要再用new运算符创建之
  var modelMatrix = new Matrix4();

  // Start drawing
  var tick = function() {
    currentAngle = animate(currentAngle);  // fixme:更新三角形的当前角度 // Update the rotation angle
    draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix);   // fixme:绘制三角形 // Draw the triangle
    requestAnimationFrame(tick, canvas); // fixme:告诉浏览器在将来的某个时间调用第一个参数所示函数(即tick) // Request that the browser calls tick
    // fixme:requestAnimationFrame==>该方法和setInterval类似，但该方法只有当标签页处于激活状态时才会生效
    // fixme:如果想取消请求，用cancalAnimationFrame(id)==>id为requestAnimationFrame()方法的返回值
  };
  tick();
}

function initVertexBuffers(gl) {
  var vertices = new Float32Array ([
    0, 0.5,   -0.5, -0.5,   0.5, -0.5
  ]);
  var n = 3;   // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Assign the buffer object to a_Position variable
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  return n;
}

// Last time that this function was called
// fixme:记录上一次调用函数的时刻
var g_last = Date.now();
function animate(angle) {
  // Calculate the elapsed time
  // fixme:计算距离上次调用经过多长时间
  var now = Date.now();
  var elapsed = now - g_last; // fixme:毫秒
  g_last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  // fixme:根据距离上次调用的时间，更新当前旋转角度
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
  // Set the rotation matrix
  modelMatrix.setRotate(currentAngle, 0, 0, 1); // Rotation angle, rotation axis (0, 0, 1)

  // Pass the rotation matrix to the vertex shader
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  // Clear <canvas>
  // fixme:清楚<canvas>==>绘制之前都需要调用，这条规则对2D和3D都适用
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the rectangle
  gl.drawArrays(gl.TRIANGLES, 0, n);
}


