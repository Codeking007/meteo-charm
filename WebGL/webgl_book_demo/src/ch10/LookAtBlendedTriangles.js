// LookAtBlendedTriangles.js (c) 2012 matsuda and ohnishi
// fixme:开启α混合步骤
// fixme:(1)开启混合功能：gl.enable(gl.BLEND)
// fixme:(2)指定混合函数：gl.blendFunc(src_factor,dst_factor)
// fixme:在进行α混合时，WebGL用到了两种颜色，即“源颜色（source color）”和“目标颜色（destination color）”
// fixme:前者是“待混合进去的颜色”，后者是“待倍混合进去的颜色”
// fixme:比如说，我们先绘制了一个三角形，然后在这个三角形之上又绘制了一个三角形，那么绘制后一个三角形(中与前一个三角形重叠区域的像素)的时候，就涉及混合操作，需要把后者的颜色“混入”前者中，后者的颜色就是源颜色，而前者的颜色就是目标颜色
// LookAtTrianglesWithKey_ViewVolume.js is the original
// Vertex shader program
var VSHADER_SOURCE =
  `attribute vec4 a_Position;
  attribute vec4 a_Color;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  varying vec4 v_Color;
  void main() {
    gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position;
    v_Color = a_Color;
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

  // Set the vertex coordinates and color (the blue triangle is in the front)
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1);
  // Enable alpha blending
  // fixme:开启混合
  gl.enable (gl.BLEND);
  // Set blending function
  // fixme:设置混合函数
  // fixme:gl.blendFunc(src_factor,dst_factor)：通过参数src_factor和dist_factor指定进行混合操作的函数，混合后的颜色如下计算：
  // fixme:<混合后颜色>=<源颜色>*src_factor+<目标颜色>*dist_factor
  // fixme:参数src_factor：指定源颜色在混合后颜色中的权重因子
  // fixme:参数dist_factor：指定目标颜色在混合后颜色中的权重因子
  // fixme：参数参考370页
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  // get the storage locations of u_ViewMatrix and u_ProjMatrix
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_ViewMatrix || !u_ProjMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix and/or u_ProjMatrix');
    return;
  }

  // Create the view projection matrix
  var viewMatrix = new Matrix4();
  // Register the event handler to be called on key press
  window.onkeydown = function(ev){ keydown(ev, gl, n, u_ViewMatrix, viewMatrix); };

  // Create Projection matrix and set to u_ProjMatrix
  var projMatrix = new Matrix4();
  projMatrix.setOrtho(-1, 1, -1, 1, 0, 2);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  // Draw
  draw(gl, n, u_ViewMatrix, viewMatrix);
}

function initVertexBuffers(gl) {
  var verticesColors = new Float32Array([
    // Vertex coordinates and color(RGBA)
    // fixme:顶点颜色透明度变为0.4
    0.0,  0.5,  -0.4,  0.4,  1.0,  0.4,  0.4, // The back green one
   -0.5, -0.5,  -0.4,  0.4,  1.0,  0.4,  0.4,
    0.5, -0.5,  -0.4,  1.0,  0.4,  0.4,  0.4,

    0.5,  0.4,  -0.2,  1.0,  0.4,  0.4,  0.4, // The middle yerrow one
   -0.5,  0.4,  -0.2,  1.0,  1.0,  0.4,  0.4,
    0.0, -0.6,  -0.2,  1.0,  1.0,  0.4,  0.4,

    0.0,  0.5,   0.0,  0.4,  0.4,  1.0,  0.4,  // The front blue one
   -0.5, -0.5,   0.0,  0.4,  0.4,  1.0,  0.4,
    0.5, -0.5,   0.0,  1.0,  0.4,  0.4,  0.4,
  ]);
  var n = 9;

  // Create a buffer object
  var vertexColorbuffer = gl.createBuffer();
  if (!vertexColorbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write the vertex information and enable it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 7, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * 7, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return n;
}

function keydown(ev, gl, n, u_ViewMatrix, viewMatrix) {
    if(ev.keyCode == 39) { // The right arrow key was pressed
      g_EyeX += 0.01;
    } else
    if (ev.keyCode == 37) { // The left arrow key was pressed
      g_EyeX -= 0.01;
    } else return;
    draw(gl, n, u_ViewMatrix, viewMatrix);
}

// Eye position
var g_EyeX = 0.20, g_EyeY = 0.25, g_EyeZ = 0.25;
function draw(gl, n, u_ViewMatrix, viewMatrix) {
  // Set the matrix to be used for to set the camera view
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 0, 0, 0, 0, 1, 0);

  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw the rectangle
  gl.drawArrays(gl.TRIANGLES, 0, n);
}
