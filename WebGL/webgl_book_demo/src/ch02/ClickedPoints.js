// ClickedPints.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'void main() {\n' +
  '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
  '}\n';

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

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = function(ev){ click(ev, gl, canvas, a_Position); };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_points = []; // The array for the position of a mouse press
function click(ev, gl, canvas, a_Position) {
  // fixme:鼠标点击位置是在“浏览器客户区”（cient area）中的坐标，而不是在<canvas>中的
    // fixme:<canvas>的坐标系统和webgl的坐标系统又不一样，其原点位置和y轴正方向都不一样
  var x = ev.clientX; // fixme:鼠标点击处的x坐标 // x coordinate of a mouse pointer
  var y = ev.clientY; // fixme:鼠标点击处的y坐标 // y coordinate of a mouse pointer
    // fixme:(rect.left,rect.top)是<canvas>原点在浏览器客户区中的坐标
  var rect = ev.target.getBoundingClientRect() ;
  // fixme:获得webgl坐标：WebGL坐标是从-1.0-1.0，所以要除以高度或者宽度的一半
  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  // Store the coordinates to g_points array
  g_points.push(x); g_points.push(y);

  // Clear <canvas>
    // fixme:因为在绘制完点后，颜色缓冲区就被webgl重置为了默认值而不是gl.clearColor(0.0, 0.0, 0.0, 1.0)这样的，也就是说默认背景是透明的，如果不希望这样，应当在每次绘制之前都调用clear函数来用指定的背景色清空
  gl.clear(gl.COLOR_BUFFER_BIT);
  // fixme:为什么要把所有点记录下来
    //fixme:因为webgl使用的是颜色缓冲区，webgl系统中的绘制操作实际上是在颜色缓冲区中进行绘制的，绘制结束后系统将缓冲区的内容显示在屏幕上
    // todo：然后颜色缓冲区就会重置，其中的内容会丢失（这是默认操作，下一张将详细讨论）
  var len = g_points.length;
  for(var i = 0; i < len; i += 2) {
    // Pass the position of a point to a_Position variable
      // fixme:可以优化代码，用把g_points[i], g_points[i+1]合在一个大数组里，在提取出来用，相当于g_points是二维数组
    gl.vertexAttrib3f(a_Position, g_points[i], g_points[i+1], 0.0);

    // Draw
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
