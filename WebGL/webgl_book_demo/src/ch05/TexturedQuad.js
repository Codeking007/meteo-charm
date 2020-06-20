// TexturedQuad.js (c) 2012 matsuda and kanda
// fixme:纹理映射（texture mapping）：将一张图像映射到一个几何图形的表面上去。将一张图片贴到一个由两个三角形组成的矩形中，这样矩形表面看上去就是这张图片
// fixme:此时，这张图片又可以称为“纹理图像（texture image）”或“纹理（texture）”
// fixme:纹理映射的作用：根据纹理对象，为之前光栅化后的每个片元涂上合适的颜色。组成纹理图像的像素又被称为“纹素（texels，texture elements）”，每一个纹素的颜色都是用RGB或RGBA格式编码
// fixme:P156==>纹理坐标与WebGL坐标系统不一样

// fixme:纹理映射步骤：
// fixme:步骤1：准备好映射到几何图形上的纹理图像
// fixme:步骤2：为几何图形配置纹理映射方式==>利用图形的顶点坐标来确定屏幕上哪部分被纹理图像覆盖，使用纹理坐标(texture coordinates)来确定纹理图像的哪部分将覆盖到几何图形上
// fixme:步骤3：加载纹理图像，对其进行一些配置，以在WebGL中使用它
// fixme:步骤4：在片元着色器中将相应的纹素从纹理中抽取出来，并将纹素的颜色赋给片元
// Vertex shader program
var VSHADER_SOURCE =
  `attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  varying vec2 v_TexCoord;
  void main() {
    gl_Position = a_Position;
    v_TexCoord = a_TexCoord;
  }
  `
  ;

// Fragment shader program
var FSHADER_SOURCE =
  `//#ifdef GL_ES
  precision mediump float;
//  #endif
  uniform sampler2D u_Sampler;  // fixme:取样器，有两种类型：sampler2D和samplerCube，取样器只能是uniform变量
  varying vec2 v_TexCoord;  // fixme:这是varying，是在光栅化过程中内插进来的
  void main() {
  // fixme:步骤4：在片元着色器中将相应的纹素从纹理中抽取出来，并将纹素的颜色赋给片元
  // fixme:片元着色器根据片元的纹理坐标，从纹理图像中抽取出纹素颜色，赋给当前片元
  // fixme:texture2D(sampler2D sampler,vec2 coord)==>从sampler指定的纹理上获得coord指定的纹理坐标处的像素颜色
  // fixme:参数sampler：指定纹理单元编号
  // fixme:参数coord：指定纹理坐标
  // fixme:返回值与 gl.texImage2D()中的internalformat参数有关
  // fixme:参数internalformat=gl.RGB时，返回(r,g,b,1.0)
  // fixme:参数internalformat=gl.RGBA时，返回(r,g,b,a)
  // fixme:参数internalformat=gl.ALPHA时，返回(0.0,0.0,0.0,a)
  // fixme:参数internalformat=gl.LUMINANCE时，返回(L,L,L,1.0)
  // fixme:参数internalformat=gl.LUMINANCE_ALPHA时，返回(L,L,L,a)
    gl_FragColor = texture2D(u_Sampler, v_TexCoord);
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

  // Set the vertex information
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Set texture
  if (!initTextures(gl, n)) {
    console.log('Failed to intialize the texture.');
    return;
  }
}

// fixme:步骤2：设置顶点的纹理坐标
function initVertexBuffers(gl) {
  var verticesTexCoords = new Float32Array([
    // Vertex coordinates, texture coordinate
    // fixme:顶点坐标，纹理坐标
    -0.5,  0.5,   0.0, 1.0,
    -0.5, -0.5,   0.0, 0.0,
     0.5,  0.5,   1.0, 1.0,
     0.5, -0.5,   1.0, 0.0,
  ]);
  var n = 4; // The number of vertices

  // Create the buffer object
  var vertexTexCoordBuffer = gl.createBuffer();
  if (!vertexTexCoordBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);

  var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
  //Get the storage location of a_Position, assign and enable buffer
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
  gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

  // Get the storage location of a_TexCoord
  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord < 0) {
    console.log('Failed to get the storage location of a_TexCoord');
    return -1;
  }
  // Assign the buffer object to a_TexCoord variable
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
  gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object

  return n;
}

// fixme:步骤3：加载纹理图像并进行相应配置，以在WebGL中使用它
// fixme:准备待加载的纹理图像，令浏览器读取它
function initTextures(gl, n) {
  // fixme:创建纹理对象以存储纹理对象
  // fixme:也可以通过gl.deleteTexture(texture)
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  // Get the storage location of u_Sampler
  var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return false;
  }
  // fixme:加载图片
  var image = new Image();  // Create the image object
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  // Register the event handler to be called on loading an image
  // fixme:图片加载完成后就调用该函数
  image.onload = function(){ loadTexture(gl, n, texture, u_Sampler, image); };
  // Tell the browser to load an image
  image.src = '../resources/sky.jpg';

  return true;
}

// fixme:步骤3：配置。 监听纹理图像的加载事件，一旦加载完成，就在WebGL系统中使用纹理
function loadTexture(gl, n, texture, u_Sampler, image) {
  // fixme:对图像进行反转
  // fixme:WebGL纹理坐标系统中的t轴的方向和PNG,BMP,JPG等格式的坐标系统的y轴方向是相反的。因此，要先将图像y轴进行反转，才能够正确地将图像映射到图形上（或者，也可以在着色器中手动反转t轴坐标）
  // fixme:gl.pixelStorei(pname,param)==>使用pname和param指定的方式处理加载得到的图像
  // fixme:参数pname：
  // fixme:参数pname=gl.UNPACK_FLIP_Y_WEBGL时，指对图像进行y轴反转，默认值为false
  // fixme:参数pname=gl.UNPACK_PREMULTIPLY_ALPHA_时，指将图像RGB颜色值的每一个分量乘以A。默认值为false
  // fixme:参数param，值为非0（true）或0（false）,必须为整数
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit0
  // fixme:激活纹理单元：WebGL通过一种称作“纹理单元（texture unit）”的机制来同时使用多个纹理。每个纹理单元有一个单元编号来管理一张纹理图像。即使只需要使用一张纹理图像，也得为其指定一个纹理单元
  // fixme:系统支持的纹理单元个数取决于硬件和浏览器的WebGL实现，但是默认情况下，WebGL至少支持8个纹理单元，内置的变量gl.TEXTURE0,gl.TEXTURE1....各表示一个纹理单元
  // fixme:gl.activeTexture(texUnit)==>激活texUnit指定的纹理单元
  // fixme:参数texUnit：指定准备激活的纹理单元：gl.TEXTURE0,gl.TEXTURE1....最后的数字表示纹理单元的编号
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object to the target
  // fixme:绑定纹理对象
  // fixme:gl.bindTexture(target,texture)==>开启texture指定的纹理对象，并对其绑定到target（目标）上。此外，如果已经通过gl.activeTexture()方法激活了某个纹理单元，则纹理对象也会绑定到这个纹理单元上
  // fixme:参数target=gl.TEXTURE_2D/gl.TEXTURE_CUBE_MAP，二维纹理/立方体纹理
  // fixme:参数texture：表示绑定的纹理单元
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  // fixme:配置纹理对象的参数
  // fixme:gl.texParameteri(target,pname,param)：将param的值赋给绑定到目标的纹理对象的pname参数上，以此来设置纹理图像映射到图形上的具体方式：如何根据纹理坐标获取纹素颜色、按哪种方式重复填充纹理
  // fixme:参数target=gl.TEXTURE_2D/gl.TEXTURE_CUBE_MAP
    // fixme:参数pname：纹理参数
    // fixme:参数panme=gl.TEXTURE_MAG_FILTER，默认值：gl.LINEAR。表示WebGL需要填充由于放大而造成的像素间的空隙，该参数就表示填充这些空隙的具体方法
    // fixme:参数panme=gl.TEXTURE_MIN_FILTER，默认值：gl.NEAREST_MINMAP_LINEAR。表示为了将纹理缩小，WebGL需要剔除纹理图像中的部分像素，该参数表示具体的剔除像素的方法
    // fixme:参数panme=gl.TEXTURE_WRAP_S,默认值：gl.REPEAT。表示如何对纹理图像左侧或右侧的区域进行填充
    // fixme:参数pname=gl.TEXTURE_WRAP_T,默认值：gl.REPEAT。表示如何对纹理图像上方或下方的区域进行填充
    // fixme:参数param：纹理参数的值
    // fixme:当pname=gl.TEXTURE_MAG_FILTER/gl.TEXTURE_MIN_FILTER时，可选：
    // fixme:参数param=gl.NEAREST,表示使用原纹理上距离映射后像素(新像素)中心最近的那个像素的颜色值，作为新的像素的值（使用曼哈顿距离）
    // fixme:参数param=gl.LINEAR，表示使用距离新像素中心最近的四个像素的颜色值的加权平均，作为新像素的值（与gl.NEAREST相比，该方法图像质量更好，但是会有较大的开销）
    // fixme:上两种都是非金字塔纹理类型常量，金字塔纹理类型常量可看OPENGL
    // fixme:当pname=gl.TEXTURE_WRAP_S/gl.TEXTURE_WRAP_T时，可选：
    // fixme:参数param=gl.REPEAT,表示使用平铺式的重复原理
    // fixme:参数param=gl.MIRRORED_REPEAT,表示使用镜像对称式的重复原理
    // fixme:参数param=gl.CLAMP_TO_EDGE,表示使用纹理图像边缘值
    // fixme:每个纹理参数都有一个默认值，通常也可以不调用gl.texParameteri()就是用默认值。MINMAP纹理实际上是一系列纹理，或者说是原始纹理图像的一系列不同分辨率的版本
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Set the texture image
    // fixme:将纹理图像分配给纹理对象
    // fixme:gl.texImage2D(target,level,internalformat,format,type,image)：将image指定的图像分配给绑定在目标上的纹理对象==>将纹理图像分配给纹理对象，同时该函数还允许你告诉WebGL关于该图像的一些特性
    // fixme:参数target=gl.TEXTURE_2D/gl.TEXTURE_CUBE_MAP
    // fixme;参数level：传入0（实际上，该参数是为金字塔纹理准备的，本书不涉及）
    // fixme:参数internalformat：图像的内部格式==>必须根据纹理图像的格式来选择这个参数
    // fixme:参数internalformat=gl.RGB时，其纹理图片格式是JPG、BMP，描述红绿蓝
    // fixme:参数internalformat=gl.RGBA时，其纹理图片格式是PNG，描述红绿蓝透明度
    // fixme:参数internalformat=gl.ALPHA时，描述(0.0,0.0,0.0,透明度)
    // fixme:参数internalformat=gl.LUMINANCE时，描述(L,L,L,1L):流明
    // fixme:参数internalformat=gl.LUMINANCE_ALPHA时，描述(L,L,L,透明度)
    // fixme:流明==>表示我们感知到的物体表面的亮度。通常使用物体表面红、绿、蓝颜色分量值的加权平均来计算流明
    // fixme:参数format：纹理数据的格式，必须使用与internalformat相同的值
    // fixme:参数type：纹理数据的类型,通常使用UNSIGNED_BYTE
    // fixme:参数type=gl.UNSIGNED_BYTE时，描述无符号整型，每个颜色分量占据1字节
    // fixme:参数type=gl.UNSIGNED_SHORT_5_6_5时，描述RGB，每个分量分别占据5、6、5比特
    // fixme:参数type=gl.UNSIGNED_SHORT_4_4_4_4时，描述RGBA，每个分量分别占据4、4、4、4比特
    // fixme:参数type=gl.UNSIGNED_SHORT_5_5_5_1时，描述RGBA，每个分量分别占据5、5、5、1比特
    // fixme:参数image：包含纹理图片的Image对象
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  /*const datargba= new Uint8Array([
    200,0,0,255,
    0,250,0,255,
    0,0,250,255,
    250,250,250,255
  ]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 3, 3, 0, gl.RGBA, gl.UNSIGNED_BYTE, datargba);*/

  // Set the texture unit 0 to the sampler
    // fixme:将纹理单元传递给片元着色器
    // fixme: gl.uniform1i()：必须通过指定纹理单元编号将纹理对象传给u_Sampler
  gl.uniform1i(u_Sampler, 0);

  gl.clear(gl.COLOR_BUFFER_BIT);   // Clear <canvas>

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
}
