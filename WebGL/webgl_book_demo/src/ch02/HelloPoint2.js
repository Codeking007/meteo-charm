// HelloPint2.js (c) 2012 matsuda
// Vertex shader program
// fixme:两种变量（存储限定符）可用于在js和着色器之间传输数据
// fixme:attribute变量==>用于传输与顶点相关的数据，只有顶点着色器能使用
// fixme:uniform变量==>用于传输那些对于所有顶点都相同（或与顶点无关）的数据，顶点着色器和片元着色器都可以使用
var VSHADER_SOURCE =
    `attribute vec4 a_Position; //fixme:存储限定符+类型+变量名 // attribute variable
     void main() {
      gl_Position = a_Position;
      gl_PointSize = 10.0;
    }`;

// Fragment shader program
var FSHADER_SOURCE = `
 void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
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

  // Get the storage location of a_Position
    // fixme:gl.getAttribLocation(program,name)==>获取名为name的attribute变量的存储位置
    // fixme:参数program：指定包含顶点着色器和片元着色器的着色器“程序对象”
    // todo:参数program=gl.program，第八章会介绍
    // fixme:参数name：指定想要获取其存储地址的attribute变量的名称
    // fixme:判断是否存在方法，存在大于等于0，不存在返回-1
    // fixme:获取attribute变量a_Position的存储位置
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

    // fixme:gl.vertexAttrib3f(location,v0,v1,v2)==>将数据(v0,v1,v2)传给由location参数指定的attribute变量
    // fixme:变量location==>指定将要修改的attribute变量的存储位置
    // fixme:变量v0,v1,v2==>浮点数类型，指定填充attribute变量第一、二、三个分量的值
  // Pass vertex position to attribute variable
    // fixme:这里填充三个值，但顶点着色器里a_Position变量是vec4类型，这里如果省略第四个分量，就会被设置为1.0

    // fixme:gl.vertexAttrib3f()的同族函数
    // fixme:gl.vertexAttrib1f(location,v0)==>此时attribute变量的第二、三个值为0.0，第四个值为1.0
    // fixme:gl.vertexAttrib2f(location,v0,v1)==>此时attribute变量的第三个值为0.0，第四个值为1.0
    // fixme:gl.vertexAttrib3f(location,v0,v1,v2)==>此时attribute变量的第四个值为1.0
    // fixme:gl.vertexAttrib4f(location,v0,v1,v2,v3)
    // fixme:规律==><基础函数名><参数个数><参数类型("f"表示浮点数，"i"表示整数)><是否接收数组作为参数(这种情况下，函数名中的数字表示数组中元素个数，如下所示)>
    // fixme:var positions=new Float32Array([0.1,0.2,0.3,1.0]);
    // fixme:gl.vertexAttrib4fv(a_Position,positions);
    gl.vertexAttrib3f(a_Position, 0.0, 0.0, 0.0);

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
    
  // Draw
  gl.drawArrays(gl.POINTS, 0, 1);
}
