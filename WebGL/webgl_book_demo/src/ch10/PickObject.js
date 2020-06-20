// PickObject.js (c) 2012 matsuda and kanda
// fixme：需要更多的过程来计算鼠标是否悬浮在某个图形上面
// fixme：1、当鼠标左键按下时，将整个立方体重绘为单一的红色
// fixme：2、读取鼠标点击处的像素颜色
// fixme：3、使用立方体原来的颜色对其进行重绘
// fixme：4、如果第二步读取到的颜色是红色，就显示消息正确
// fixme：为了使用户看不到立方体闪烁变红色的过程，我们在取出像素后立即（而不是等到下一帧）将立方体重绘成原来的样子
// fixme:对于具有多个物体的场景，这个简单方法也能适用，只需要为场景中每个物体赋不同颜色既可
// fixme：但如果三维模型过于复杂，或者绘图区域过大，这种方法也会很繁琐。这时可以使用简化模型，或者缩小绘图区域，或者也可以使用帧缓冲区对象，后一节“使用绘制出的图形作为纹理”将详细讨论
// Vertex shader program
var VSHADER_SOURCE =
  `attribute vec4 a_Position;
  attribute vec4 a_Color;
  uniform mat4 u_MvpMatrix;
  uniform bool u_Clicked; // fixme:鼠标按下，bool类型 // Mouse is pressed
  varying vec4 v_Color;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    if (u_Clicked) { // fixme：鼠标按下时用红色绘制  //  Draw in red if mouse is pressed
      v_Color = vec4(1.0, 0.0, 0.0, 1.0);
    } else {
      v_Color = a_Color;
    }
  }
  `
  ;

// Fragment shader program
var FSHADER_SOURCE =
  `#ifdef GL_ES
  precision mediump float;
  #endif
  varying vec4 v_Color;
  void main() {
    gl_FragColor = v_Color;
  }
  `
  ;

var ANGLE_STEP = 20.0; // Rotation angle (degrees/second)

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

  // Set the vertex information
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of uniform variables
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_Clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
  if (!u_MvpMatrix || !u_Clicked) {
    console.log('Failed to get the storage location of uniform variable');
    return;
  }

  // Calculate the view projection matrix
  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
  viewProjMatrix.lookAt(0.0, 0.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

  gl.uniform1i(u_Clicked, 0); // fixme:将false赋给u_Clicked // Pass false to u_Clicked

  var currentAngle = 0.0; // Current rotation angle
  // Register the event handler
  // fixme：主要是注册鼠标响应时间
  canvas.onmousedown = function(ev) {  // Mouse is pressed
    var x = ev.clientX, y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
      // If pressed position is inside <canvas>, check if it is above object
      var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;
      var picked = check(gl, n, x_in_canvas, y_in_canvas, currentAngle, u_Clicked, viewProjMatrix, u_MvpMatrix);
      if (picked) alert('The cube was selected! ');
    }
  }

  var tick = function() {   // Start drawing
    currentAngle = animate(currentAngle);
    draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

function initVertexBuffers(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  var vertices = new Float32Array([   // Vertex coordinates
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,    // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,    // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,    // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,    // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0     // v4-v7-v6-v5 back
  ]);

  var colors = new Float32Array([   // Colors
    0.2, 0.58, 0.82,   0.2, 0.58, 0.82,   0.2,  0.58, 0.82,  0.2,  0.58, 0.82, // v0-v1-v2-v3 front
    0.5,  0.41, 0.69,  0.5, 0.41, 0.69,   0.5, 0.41, 0.69,   0.5, 0.41, 0.69,  // v0-v3-v4-v5 right
    0.0,  0.32, 0.61,  0.0, 0.32, 0.61,   0.0, 0.32, 0.61,   0.0, 0.32, 0.61,  // v0-v5-v6-v1 up
    0.78, 0.69, 0.84,  0.78, 0.69, 0.84,  0.78, 0.69, 0.84,  0.78, 0.69, 0.84, // v1-v6-v7-v2 left
    0.32, 0.18, 0.56,  0.32, 0.18, 0.56,  0.32, 0.18, 0.56,  0.32, 0.18, 0.56, // v7-v4-v3-v2 down
    0.73, 0.82, 0.93,  0.73, 0.82, 0.93,  0.73, 0.82, 0.93,  0.73, 0.82, 0.93, // v4-v7-v6-v5 back
   ]);

  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
  ]);

  // Write vertex information to buffer object
  if (!initArrayBuffer(gl, vertices, gl.FLOAT, 3, 'a_Position')) return -1; // Coordinate Information
  if (!initArrayBuffer(gl, colors, gl.FLOAT, 3, 'a_Color')) return -1;      // Color Information

  // Create a buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    return -1;
  }
  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

// fixme：检查是否点击在物体上
function check(gl, n, x, y, currentAngle, u_Clicked, viewProjMatrix, u_MvpMatrix) {
  // fixme：这里的x和y是canvas坐标系下的坐标
  var picked = false;
  gl.uniform1i(u_Clicked, 1);  // Pass true to u_Clicked
  draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix); // fixme：将立方体绘制为红色// Draw cube with red
  // Read pixel at the clicked position
  var pixels = new Uint8Array(4); // Array for storing the pixel value
  // fixme：读取点击位置的像素值
  // fixme:gl.readPixels(x,y,width,height,format,type,pixels):从颜色缓冲区中读取某矩形块中的所有像素值，并保存在pixels指定的数组中
  // fixme：如果一个帧缓冲区对象被绑定在了gl.FRAMEBUFFER上，那么这个方法就会去读取帧缓冲区而非颜色缓冲区中的内容，这一点会在后一节“使用绘制出的图形作为纹理”详细叙述
  // fixme:参数x,y:指定颜色缓冲区中矩形块左上角的坐标，同时也是读取的第1个像素的坐标
  // fixme:参数width,height:指定矩形块的宽度和高度，以像素为单位
  // fixme:参数format：指定像素值的颜色格式，必须为gl.RGBA
  // fixme:参数type：指定像素值的数据格式，必须是gl.UNSIGNED_BYTE
  // fixme:参数pixels：指定用来接收像素值数据的Unit8Array类型化数组
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  if (pixels[0] == 255) // fixme：如果是255则说明点击在物体上 // The mouse in on cube if R(pixels[0]) is 255
    picked = true;

  gl.uniform1i(u_Clicked, 0);  // fixme：传false重绘正常状态的立方体  // Pass false to u_Clicked(rewrite the cube)
  draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix); // Draw the cube

  return picked;
}

var g_MvpMatrix = new Matrix4(); // Model view projection matrix
function draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix) {
  // Caliculate The model view projection matrix and pass it to u_MvpMatrix
  g_MvpMatrix.set(viewProjMatrix);
  g_MvpMatrix.rotate(currentAngle, 1.0, 0.0, 0.0); // Rotate appropriately
  g_MvpMatrix.rotate(currentAngle, 0.0, 1.0, 0.0);
  g_MvpMatrix.rotate(currentAngle, 0.0, 0.0, 1.0);
  gl.uniformMatrix4fv(u_MvpMatrix, false, g_MvpMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);     // Clear buffers
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);   // Draw
}

var last = Date.now(); // Last time that this function was called
function animate(angle) {
  var now = Date.now();   // Calculate the elapsed time
  var elapsed = now - last;
  last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}

function initArrayBuffer (gl, data, type, num, attribute) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment to a_attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}
