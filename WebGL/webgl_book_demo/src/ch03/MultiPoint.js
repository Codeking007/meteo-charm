// MultiPoint.js (c) 2012 matsuda
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

  // Write the positions of vertices to a vertex shader
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw three points
  gl.drawArrays(gl.POINTS, 0, n);
}

// fixme:通过“缓冲区对象（buffer object）”，可以一次性地向着色器传入多个顶点的数据
// fixme:步骤
// fixme:1、创建缓冲区对象（gl.createBuffer()）==>gl.deleteBuffer(buffer)可用来删除被创建出来的buffer对象
// fixme:2、绑定缓冲区对象（gl.bindBuffer()）
// fixme:3、将数据写入缓冲区（gl.bufferData()）
// fixme:4、将缓冲区对象分配给一个attribute变量（gl.vertexAttribPointer()）
// fixme:5、开启attribute变量（gl.enableVertexAttribArray()）
function initVertexBuffers(gl) {
  // fixme:类型化数组==>通过new运算符调用构造函数。为了优化性能，WebGL为每种基本数据类型引入了一种特殊的数组（类型化数组）。浏览器事先知道数组中的数据类型，所以处理起来也更加效率
    // fixme:<数组类型><每个元素所占字节数><描述（C语言中的数据类型）>
    // fixme:<Int8Array><1><8位整型数(signed char)>
    // fixme:<UInt8Array><1><8位无符号整型数(unsigned char)>
    // fixme:<Int16Array><2><16位整型数(signed short)>
    // fixme:<UInt16Array><2><16位无符号整型数(unsigned short)>
    // fixme:<Int32Array><4><32位整型数(signed int)>
    // fixme:<UInt32Array><4><32位无符号整型数(signed int)>
    // fixme:<Float32Array><4><单精度32位浮点数(float)>
    // fixme:<Float64Array><8><双精度64位浮点数(double)>

  // fixme:类型化数组的方法、属性、常量
    // fixme:get(index)==>获取第index个元素值
    // fixme:set(index,value)==>设置第index个元素的值为value
    // fixme:set(array,offset)==>从第offset个元素开始将数组array中的值填充进去
    // fixme:length==>数组的长度
    // fixme:BYTES_PER_ELEMENT==>数组中每个元素所占的字节数
  var vertices = new Float32Array([
      0.0, 0.5,
      -0.5, -0.5,
      0.5, -0.5
  ]);
  var n = 3; // The number of vertices

  // Create a buffer object
    // fixme:步骤1
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
    // fixme:步骤2：gl.bindBuffer(target,buffer)==>允许使用buffer表示的缓冲区对象并将其绑定到target表示的目标上
    // fixme:参数target：表示缓冲区对象的用途（这里就是向顶点着色器提供传给attribute变量的数据）
    // fixme:参数target=gl.ARRAY_BUFFER时，表示缓冲区对象中包含了顶点的数据
    // fixme:参数target=gl.ELEMENT_ARRAY_BUFFER时，表示缓冲区对象中包含了顶点的索引值
    // fixme:参数buffer：指定之前由gl.createBuffer()返回的待绑定的缓冲区对象
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
    // fixme:步骤3：gl.bufferData(target,data,usage)==>开辟存储空间，向绑定在target上的缓冲区对象写入数据data
    // fixme:参数target：gl.ARRAY_BUFFER 或 gl.ELEMENT_ARRAY_BUFFER
    // fixme:参数data：写入缓冲区对象的数据（类型化数组）
    // fixme:参数usage：表示程序将如何使用存储在缓冲区对象中的数据。该参数将帮助WebGL优化操作，但是就算你传入了错误的值，也不会终止程序（仅仅是降低程序的效率）
    // fixme:参数usage=gl.STATIC_DRAW时，表示只会向缓冲区对象中写入一次数据，但需要绘制很多次
    // fixme:参数usage=gl.STREAM_DRAW时，表示只会向缓冲区对象中写入一次数据，然后绘制若干次
    // fixme:参数usage=gl.DYNAMIC_DRAW时，表示会向缓冲区对象中多次写入数据，并绘制很多次
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Assign the buffer object to a_Position variable
    // fixme:步骤4：将整个数组中的所有值(这里是顶点数据)一次性地分配给一个attribute变量
    // fixme: gl.vertexAttribPointer(location,size,type,normalized,stride,offset)==>将整个缓冲区对象(实际上是缓冲区对象的引用或指针)分配给attribute
    // fixme:参数location：指定待分配attribute变量的存储位置
    // fixme:参数size：指定缓冲区中每个顶点的分量个数(1到4)。若size比attribute变量需要的分量数小，缺失分量将按照与gl.vertexAttrib[1234]f()相同的规则补全。如：size=1，那么第2、3个分量自动设为0.0，第4个分量为1.0
    // fixme:参数type：指定数据类型
    // fixme:参数type=gl.UNSIGNED_BYTE,无符号字节，UInt8Array
    // fixme:参数type=gl.SHORT,短整型，Int16Array
    // fixme:参数type=gl.UNSIGNED_SHORT,无符号短整型，UInt16Array
    // fixme:参数type=gl.INT,整型，Int32Array
    // fixme:参数type=gl.UNSIGNED_INT,无符号整型，UInt32Array
    // fixme:参数type=gl.FLOAT,浮点型，Float32Array
    // fixme:参数normalized：true/false，表明是否将“非浮点型数据”归一化到[0,1]或[-1,1]区间
    // fixme:参数stride：指定相邻两个顶点间的字节数，默认为0（第四章有用到），这里只含有一种数据，所以将其设为0==>可理解为单个顶点的所有数据（顶点坐标+点大小+颜色...）的字节数，也就是相邻两个顶点间的距离，即步进参数
    // fixme:参数offset：指定缓冲区对象中的偏移量（以字节为单位），即attribute变量从缓冲区中的何处开始存储。如果是从起始位置开始的，offset设为0
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
    // fixme:步骤5：使顶点着色器能够访问缓冲区内的数据
    // fixme:gl.enableVertexAttribArray(location):开启location指定的attribute变量
    // fixme:location==>指定attribute变量的存储位置
    // fixme:gl.disableVertexAttribArray(location)
  gl.enableVertexAttribArray(a_Position);

  return n;
}
