// ProgramObject.js (c) 2012 matsuda and kanda
// fixme:为了切换着色器，需要创建多个着色器程序对象，然后在进行绘制前选择使用的程序对象

// Vertex shader for single color drawing
var SOLID_VSHADER_SOURCE =
  `attribute vec4 a_Position;
  attribute vec4 a_Normal;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_NormalMatrix;
  varying vec4 v_Color;
  void main() {
    vec3 lightDirection = vec3(0.0, 0.0, 1.0);  // Light direction(World coordinate)
    vec4 color = vec4(0.0, 1.0, 1.0, 1.0);      // Face color
    gl_Position = u_MvpMatrix * a_Position;
    vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
    float nDotL = max(dot(normal, lightDirection), 0.0);
    v_Color = vec4(color.rgb * nDotL, color.a);
  }
`;

// Fragment shader for single color drawing
var SOLID_FSHADER_SOURCE =
  `#ifdef GL_ES
  precision mediump float;
  #endif
  varying vec4 v_Color;
  void main() {
    gl_FragColor = v_Color;
  }`
  ;

// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
  `attribute vec4 a_Position;
  attribute vec4 a_Normal;
  attribute vec2 a_TexCoord;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_NormalMatrix;
  varying float v_NdotL;
  varying vec2 v_TexCoord;
  void main() {
    vec3 lightDirection = vec3(0.0, 0.0, 1.0);  // Light direction(World coordinate)
    gl_Position = u_MvpMatrix * a_Position;
    vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
    v_NdotL = max(dot(normal, lightDirection), 0.0);
    v_TexCoord = a_TexCoord;
  }
  `
 ;

// Fragment shader for texture drawing
var TEXTURE_FSHADER_SOURCE =
  `#ifdef GL_ES
  precision mediump float;
  #endif
  uniform sampler2D u_Sampler;
  varying vec2 v_TexCoord;
  varying float v_NdotL;
  void main() {
    vec4 color = texture2D(u_Sampler, v_TexCoord);
    gl_FragColor = vec4(color.rgb * v_NdotL, color.a);
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

  // fixme:(1)创建程序对象
  // Initialize shaders
  var solidProgram = createProgram(gl, SOLID_VSHADER_SOURCE, SOLID_FSHADER_SOURCE);
  var texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
  if (!solidProgram || !texProgram) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // fixme:(2)设置attribute数据和一个uniform==>u_Sampler
  // Get storage locations of attribute and uniform variables in program object for single color drawing
    // fixme:绑定到solidProgram程序对象上，好分开
  solidProgram.a_Position = gl.getAttribLocation(solidProgram, 'a_Position');
  solidProgram.a_Normal = gl.getAttribLocation(solidProgram, 'a_Normal');
  solidProgram.u_MvpMatrix = gl.getUniformLocation(solidProgram, 'u_MvpMatrix');
  solidProgram.u_NormalMatrix = gl.getUniformLocation(solidProgram, 'u_NormalMatrix');

  // Get storage locations of attribute and uniform variables in program object for texture drawing
    // fixme：绑定到texProgram程序对象上，好分开
  texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
  texProgram.a_Normal = gl.getAttribLocation(texProgram, 'a_Normal');
  texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
  texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
  texProgram.u_NormalMatrix = gl.getUniformLocation(texProgram, 'u_NormalMatrix');
  texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');

  if (solidProgram.a_Position < 0 || solidProgram.a_Normal < 0 ||
      !solidProgram.u_MvpMatrix || !solidProgram.u_NormalMatrix ||
      texProgram.a_Position < 0 || texProgram.a_Normal < 0 || texProgram.a_TexCoord < 0 ||
      !texProgram.u_MvpMatrix || !texProgram.u_NormalMatrix || !texProgram.u_Sampler) {
    console.log('Failed to get the storage location of attribute or uniform variable');
    return;
  }

  // Set the vertex information
    // fixme:设置顶点数据和索引前三步（数据共有五步，索引只有前三步）
    // fixme：因为数据要绑定到不同的程序对象上，所以后两部放在其他地方写
  var cube = initVertexBuffers(gl);
  if (!cube) {  // fixme：传出来cube就是为了再判断一下，还有后面画图用
    console.log('Failed to set the vertex information');
    return;
  }

  // Set texture
    // fixme:加载纹理图像，对其进行一些配置，以在WebGL中使用它，并把u_Sampler也设置了
  var texture = initTextures(gl, texProgram);
  if (!texture) {// fixme：传出来texture就是为了再判断一下，还有后面画图用
    console.log('Failed to intialize the texture.');
    return;
  }

  // Set the clear color and enable the depth test
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // gl.enable (gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // fixme:(3)设置其余所有uniform变量
  // Calculate the view projection matrix
  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 100.0);
  viewProjMatrix.lookAt(0.0, 0.0, 15.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

  // Start drawing
  var currentAngle = 0.0; // Current rotation angle (degrees)
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update current rotation angle

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
    // Draw a cube in single color
    // gl.depthMask(false);
    drawSolidCube(gl, solidProgram, cube, -2.0, currentAngle, viewProjMatrix);
    // Draw a cube with texture
    // gl.depthMask(true);
    drawTexCube(gl, texProgram, cube, texture, 2.0, currentAngle, viewProjMatrix);

    window.requestAnimationFrame(tick, canvas);
  };
  tick();
}

// fixme：缓冲区对象数据和索引绑定前三步
function initVertexBuffers(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3

  var vertices = new Float32Array([   // 顶点 // Vertex coordinates
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,    // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,    // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,    // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,    // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0     // v4-v7-v6-v5 back
  ]);

  var normals = new Float32Array([   // 法线  // Normal
     0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,     // v0-v1-v2-v3 front
     1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,     // v0-v3-v4-v5 right
     0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,     // v0-v5-v6-v1 up
    -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,     // v1-v6-v7-v2 left
     0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,     // v7-v4-v3-v2 down
     0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0      // v4-v7-v6-v5 back
  ]);

  var texCoords = new Float32Array([   // 纹理坐标 // Texture coordinates
     1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v0-v1-v2-v3 front
     0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v0-v3-v4-v5 right
     1.0, 0.0,   1.0, 1.0,   0.0, 1.0,   0.0, 0.0,    // v0-v5-v6-v1 up
     1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v1-v6-v7-v2 left
     0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0,    // v7-v4-v3-v2 down
     0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0     // v4-v7-v6-v5 back
  ]);

  var indices = new Uint8Array([        // 顶点索引 // Indices of the vertices
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
  ]);

  var o = new Object(); // fixme:使用该对象返回多个缓冲区对象 // Utilize Object to to return multiple buffer objects together

  // Write vertex information to buffer object
  o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
  o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
  o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
  o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
  if (!o.vertexBuffer || !o.normalBuffer || !o.texCoordBuffer || !o.indexBuffer) return null;

  // fixme:gl.drawElements()用
  o.numIndices = indices.length;

  // Unbind the buffer object
    // fixme:最后解绑缓冲区对象
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}

// fixme：缓冲区对象数据绑定前三步
function initArrayBufferForLaterUse(gl, data, num, type) {
    var buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Keep the information necessary to assign to the attribute variable later
    // fixme:还存了num和type
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

// fixme：缓冲区对象索引绑定前三步
function initElementArrayBufferForLaterUse(gl, data, type) {
    var buffer = gl.createBuffer();　  // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // fixme:只存了type没存num，跟顶点数据不一样，用的地方也不一样
    buffer.type = type;

    return buffer;
}

// fixme:加载纹理图像，对其进行一些配置，以在WebGL中使用它
// fixme:并把u_Sampler也设置了，所以传进来了程序对象program，其实在外面写也无所谓
function initTextures(gl, program) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return null;
  }

  var image = new Image();  // Create a image object
  if (!image) {
    console.log('Failed to create the image object');
    return null;
  }
  // Register the event handler to be called when image loading is completed
  image.onload = function() {
    // Write the image data to texture object
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Pass the texure unit 0 to u_Sampler
    gl.useProgram(program);
    gl.uniform1i(program.u_Sampler, 0);

    gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
  };

  // Tell the browser to load an Image
  image.src = '../resources/orange.jpg';

  return texture;
}

// fixme：响应时间函数==>算旋转角度
var ANGLE_STEP = 30;   // The increments of rotation angle (degrees)
var last = Date.now(); // Last time that this function was called
function animate(angle) {
    var now = Date.now();   // Calculate the elapsed time
    var elapsed = now - last;
    last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}

// fixme：画左边那个立方体
function drawSolidCube(gl, program, o, x, angle, viewProjMatrix) {
  // fixme:使用这个程序对象，必须写
  gl.useProgram(program);   // Tell that this program object is used

  // Assign the buffer objects and enable the assignment
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer); // Vertex coordinates
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);   // Normal
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);  // fixme:为什么还要重新bindBuffer？？？？  // Bind indices

  drawCube(gl, program, o, x, angle, viewProjMatrix);   // Draw
}

// Assign the buffer objects and enable the assignment
// fixme:顶点数据的后两步，其中这里还得重新执行第二步
// fixme:传buffer主要是用buffer.num和buffer.type，还有重新执行第二步用刀buffer
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // fixme:为什么还要重新bindBuffer？？？？
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

// Coordinate transformation matrix
var g_modelMatrix = new Matrix4();
var g_mvpMatrix = new Matrix4();
var g_normalMatrix = new Matrix4();
function drawCube(gl, program, o, x, angle, viewProjMatrix) {
    // Calculate a model matrix
    g_modelMatrix.setTranslate(x, 0.0, 0.0);
    g_modelMatrix.rotate(20.0, 1.0, 0.0, 0.0);
    g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

    // Calculate transformation matrix for normals and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(g_modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

    // Calculate model view projection matrix and pass it to u_MvpMatrix
    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);   // Draw
}

// fixme:画右边的立方体
function drawTexCube(gl, program, o, texture, x, angle, viewProjMatrix) {
  gl.useProgram(program);   // Tell that this program object is used

  // Assign the buffer objects and enable the assignment
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);  // Vertex coordinates
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);    // Normal
  initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);// Texture coordinates
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer); // fixme:为什么还要重新bindBuffer？？？？ // Bind indices

  // Bind texture object to texture unit 0
    // fixme:这两步也得重新写？？？？？
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  drawCube(gl, program, o, x, angle, viewProjMatrix); // Draw
}








