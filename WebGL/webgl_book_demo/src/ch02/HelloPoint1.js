// HelloPoint1.js (c) 2012 matsuda
// fixme:Vertex shader program==>顶点着色器：用来描述顶点特性(如位置、颜色等)的程序
var VSHADER_SOURCE =
    // fixme：顶点坐标，这里用的是vec4，齐次坐标，能够提高处理三维数据的效率（最后一个填1.0就行，这样齐次坐标(x,y,z,w)等价于三维(x/w,y/w,z/w)=(x,y,z)）
    `void main() {
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0); // Set the vertex coordinates of the point==>设置点坐标，类型==>vec4
  gl_PointSize = 10.0;                      // Set the point size==>设置点的尺寸大小（像素数），不设置就默认1.0，类型==>float
  }`;

// fixme:Fragment shader program==>片元着色器：进行逐片元处理过程如：光照的程序
// fixme:fragment==>片元，是WebGL的术语，可将其理解为像素（图像的单元）
var FSHADER_SOURCE =
    `void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Set the point color==>设置点的颜色，类型==>vec4
  }`;

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
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {   // todo:第九章会详解
    console.log('Failed to intialize shaders.');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw a point
    // fixme:gl.drawArrays(mode, first, count)==>绘制
    // fixme:参数mode：指定绘制的方式
    // fixme:参数mode=gl.POINTS
    // fixme:参数mode=gl.LINES
    // fixme:参数mode=gl.LINE_STRIP
    // fixme:参数mode=gl.LINE_LOOP
    // fixme:参数mode=gl.TRIANGLES
    // fixme:参数mode=gl.TRIANGLES_STRIP
    // fixme:参数mode=gl.TRIANGLES_FAN
    // fixme:参数first：指定从哪个顶点开始绘制(整数类型，从0开始)
    // fixme:参数count：指定绘制需要用到多少个顶点（整数类型）
  gl.drawArrays(gl.POINTS, 0, 1);
}
