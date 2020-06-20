// ColoredTriangle.js (c) 2012 matsuda
// fixme:实际上，在顶点着色器和片元着色器之间，有这样两个步骤
// fixme:(1)几何图形装配(geometric shape assembly)/图元装配过程(primitive assembly process)：这一步的任务是，将鼓励的顶点坐标装配成几何图形。几何图形的类别由gl.drawArrays()函数的第一个参数决定
// fixme:(2)光栅化过程：这一步的任务是，将装配好的几何图形转化为片元
// fixme:gl_Position实际是几何图形装配阶段的输入数据
// fixme:几何图形装配过程又被称为图元装配过程，因为被装配出来的基本图形（点、线、面）又被称为图元（primitives）
// fixme:第一步：依次执行顶点着色器，将每个顶点坐标传入并储存在装配区
// fixme:第二步==>几何图形装配：当所有顶点坐标都已经处在装配区时，开始装配图形。使用gl.drawArray()的第一个参数信息(gl.TRIANGLES等)来决定如何装配。本例使用三个顶点来装配出一个三角形
// fixme:第三步==>光栅化：显示在屏幕上的图形是由片元（像素）组成的，所以还需要将图形转化为片元，这个过程称为光栅化。光栅化后，我们就得到了组成这个图形的所有片元（片元数目就是这个图形最终在屏幕上所覆盖的像素数）
// fixme:第四步：一旦光栅化过程结束后，程序就开始逐片元调用片元着色器。每调用一次，就处理一个片元。对于每个片元，片元着色器计算出该片元的颜色，并写入颜色缓冲区。直到最后一个片元被处理完成，浏览器就会显示出最终的结果
// fixme:光栅化过程生成的片元都是带有坐标信息的，调用片元着色器时这些坐标信息也随着片元传了进去
// fixme:光栅化是三围图形学的关键技术之一，它负责将矢量的几何图形转变为栅格化的片元（像素）。图形被转化为片元之后，我们就可以在片元着色器内做更多的事情，如为每个片元指定不同的颜色。颜色可以内插出来，也可以直接编程指定

// fixme:再回过头来看为什么在顶点着色器中只是指定了每个顶点的颜色，最后得到了一个具有渐变色彩效果的三角形呢？
// fixme:事实上，我们把顶点的颜色赋值给了顶点着色器中的varying变量v_color，它的值被传给片元着色器中的同名、同类型变量（即片元着色器中的varying变量v_color）
// fixme:但是，更准确地说，顶点着色器中的v_color变量在传入片元着色器之前（在光栅化时）经过了“内插过程”。所以，片元着色器中的v_color变量和顶点着色器中的v_color变量实际上并不是一回事，这也正是将这种变量称为“varying（变化的）”变量的原因

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  `//#ifdef GL_ES
  precision mediump float;
//  #endif GL_ES
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

  //
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the rectangle
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function initVertexBuffers(gl) {
  var verticesColors = new Float32Array([
    // Vertex coordinates and color
     0.0,  0.5,  1.0,  0.0,  0.0,
    -0.5, -0.5,  0.0,  1.0,  0.0,
     0.5, -0.5,  0.0,  0.0,  1.0,
  ]);
  var n = 3;

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  //Get the storage location of a_Position, assign and enable buffer
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

  // Get the storage location of a_Position, assign buffer and enable
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
  gl.enableVertexAttribArray(a_Color);  // Enable the assignment of the buffer object

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return n;
}
