// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =`
 precision mediump float;   // todo:精度限定词：第五章有
  uniform vec4 u_FragColor;  // fixme:跟attribute一样，存储限定符+类型+变量名 // uniform変数
  void main() {
    gl_FragColor = u_FragColor;
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

  // // Get the storage location of a_Position
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
    // fixme:gl.getUniformLocation(program,name)==>获取名为name的attribute变量的存储位置
    // fixme:参数program：指定包含顶点着色器和片元着色器的着色器“程序对象”
    // todo:参数program=gl.program，第八章会介绍
    // fixme:参数name：指定想要获取其存储地址的uniform变量的名称
    // fixme:判断是否存在方法，存在非空，不存在返回null
    // fixme:应注意attribute和uniform变量判断是否存在方法的区别，一个是<0，一个是null
    // fixme:获取uniform变量u_FragColor变量的存储位置
  var u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = function(ev){ click(ev, gl, canvas, a_Position, u_FragColor) };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_points = [];  // The array for the position of a mouse press
var g_colors = [];  // The array to store the color of a point
function click(ev, gl, canvas, a_Position, u_FragColor) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  // Store the coordinates to g_points array
  g_points.push([x, y]);
  // Store the coordinates to g_points array
  if (x >= 0.0 && y >= 0.0) {      // First quadrant
    g_colors.push([1.0, 0.0, 0.0, 1.0]);  // Red
  } else if (x < 0.0 && y < 0.0) { // Third quadrant
    g_colors.push([0.0, 1.0, 0.0, 1.0]);  // Green
  } else {                         // Others
    g_colors.push([1.0, 1.0, 1.0, 1.0]);  // White
  }

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_points.length;
  for(var i = 0; i < len; i++) {
    var xy = g_points[i];
    var rgba = g_colors[i];

    // Pass the position of a point to a_Position variable
    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    // Pass the color of a point to u_FragColor variable
      // fixme:gl.uniform4f(location,v0,v1,v2,v3)==>将数据(v0,v1,v2,v3)传给由location参数指定的uniform变量
      // fixme:变量location==>指定将要修改的uniform变量的存储位置
      // fixme:变量v0,v1,v2==>浮点数类型，指定填充uniform变量第一、二、三个分量的值

      // fixme:gl.uniform4f()的同族函数
      // fixme:gl.uniform1f(location,v0)==>此时uniform变量的第二、三个值为0.0，第四个值为1.0，因为齐次坐标所以是1.0
      // fixme:gl.uniform2f(location,v0,v1)==>此时uniform变量的第三个值为0.0，第四个值为1.0
      // fixme:gl.uniform3f(location,v0,v1,v2)==>此时uniform变量的第四个值为1.0
      // fixme:gl.uniform4f(location,v0,v1,v2,v3)
      // fixme:规律==><基础函数名><参数个数><参数类型("f"表示浮点数，"i"表示整数)><是否接收数组作为参数(这种情况下，函数名中的数字表示数组中元素个数，如下所示)>
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    // Draw
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
