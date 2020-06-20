// Shadow.js (c) 2012 matsuda and tanaka
// fixme:实现阴影有若干种不同的方法，本节所介绍的方法用的是“阴影贴图（shadow map）”，或称“深度贴图（depth map）”
// fixme:太阳看不见阴影。如果在光源处放置一位观察者，其视线方向与光线一致，那么观察者也看不到阴影。他看到的每一处都在光的照射下，而那些背后的，他没有看到的物体则处在阴影中。
// fixme:这里我们需要用到光源与物体之间的距离（实际上也就是物体在光源坐标系下的深度z值）来决定物体是否可见
// fixme:这里用到两种着色器
// fixme:(1)一对着色器用来计算光源到物体的距离
// fixme:(2)另一对着色器根据(1)中计算出的距离绘制场景

// fixme:阴影映射：使用一张纹理图像把(1)的结果传入(2)中，这张纹理图像就被称为“纹理贴图（shadow map）”，而通过阴影贴图实现阴影的方法就被称为“阴影映射（shadiw mapping）”
// fixme:步骤
// fixme:步骤1、将视点移到光源的位置处，并运行(1)中的着色器。这时，那些“将要被绘出”的片元都是被光照射到的，即落在这个像素上的各个片元中最前面的（用到了隐藏面消除）。我们并不实际绘制出片元的颜色，而是将片元的z值写入到阴影贴图中
// fixme:步骤2、将视点移回原来的位置，运行(2)中的着色器绘制场景。此时，我们计算出每个片元在光源坐标系(即(1)中的视点坐标系)下的坐标，并与阴影贴图记录的z值比较，如果前者大于后者，就说明当前片元处在阴影之中，用较深暗的颜色绘制
// fixme:步骤1使用的帧缓冲区对象记录片元到光源的距离

// Vertex shader program for generating a shadow map
// fixme:生成阴影贴图的顶点缓冲区
var SHADOW_VSHADER_SOURCE =
  `attribute vec4 a_Position;
  uniform mat4 u_MvpMatrix;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
  }
  `;

// Fragment shader program for generating a shadow map
// fixme:生成阴影贴图的片元缓冲区
var SHADOW_FSHADER_SOURCE =
  `#ifdef GL_ES
  precision mediump float;
  #endif
  void main() {
  // fixme:要将片元的z值写入了纹理贴图中
  // fixme:所以使用了片元着色器的内置变量gl_FragCoord
  // fixme:gl_FragCoord的内置变量是vec4类型的，用来表示片元的坐标。gl_FragCoord.x和gl_FragCoord.y是片元在屏幕上的坐标,而gl_FragCoord.z是深度值.
  // fixme:它们是通过(gl_Position.xyz/gl_Position.w)/2.0+0.5计算出来的(参考opengl),从而把WebGL坐标系转换到纹理坐标系下,归一化到[0.0,1.0]区间
  // fixme:如果gl_Position.z是0.0,则表示该片元在近裁剪面上,如果是1.0,则表示片元在远裁剪面上
    gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 0.0); // Write the z-value in R
  }
  `;

// Vertex shader program for regular drawing
// fixme:正常绘制时用到的顶点缓冲区
// fixme:将绘制目标切换回颜色缓冲区,把视点移回原位,开始真正地绘制场景.此时,我们需要比较片元在光源坐标系下的z值和阴影贴图中对应的值来决定当前片元是否处在阴影中
// fixme:u_MvpMatrix是视点在原处的模型视图投影矩阵,而u_MvpMatrixFromLight是第一步中视点位于光源处时的模型视图投影矩阵.
// fixme:顶点着色器计算每个顶点在光源坐标系中的坐标,并传入片元着色器
var VSHADER_SOURCE =
  `attribute vec4 a_Position;
  attribute vec4 a_Color;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_MvpMatrixFromLight;
  varying vec4 v_PositionFromLight;
  varying vec4 v_Color;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_PositionFromLight = u_MvpMatrixFromLight * a_Position;
    v_Color = a_Color;
  }
  `;

// Fragment shader program for regular drawing
// fixme:正常绘制时用到的片元缓冲区:根据片元在光源坐标系中的坐标v_PositionFromLight计算出可以与阴影贴图相比较的z值
// fixme:前面说过,阴影贴图中的z值是通过(gl_Position.xyz/gl_Position.w)/2.0+0.5计算出来的,为使这里的结果能够与之比较,我们也需要通过(v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5来进行归一化得到纹理坐标,其中x和y分量为当前片元的坐标,也是阴影贴图的片元坐标,而z分量表示当前片元在光源坐标系中的归一化的z值,可与阴影贴图中的纹素值比较
// fixme:通过shadowCoord.xy从阴影贴图中抽取出纹素(这并非单纯抽取纹理的像素,而涉及内插过程)
// fixme:由于之前z值被写在了R分量中,所以这里也只需提取R分量,并保存在depth中
// fixme:接着,我们通过比较shadowCoord.z和depth来决定片元是否是在阴影中,如果前者大,说明当前片元在阴影中,就为visibility变量赋值为0.7,否则就赋为1.0.该变量参与了计算片元最终颜色的过程,如果为0.7,那么片元就会深暗一些,以表示在阴影中
// fixme:你可能注意到,我们在进行比较时,加了一个0.005的偏移量.如果去掉这个偏移量,再运行程序,就会发现矩形平面上会出现"马赫带".偏移量0.005的作用是消除马赫带
// fixme:我们知道,纹理图像的RGBA分量一整个占32位(一个float),每个分量都是8位,那么存储在阴影贴图中的z值精度也只有8位,
// fixme:而与阴影贴图进行比较的值shadowCoord.z是float,有16位,比如说z值是0.1234567,8位的浮点数的精度是1/256，也就是0.00390625。根据：0.1234567/(1/256) = 31.6049152 在8位精度下，0.1234567实际上是31个1/256，即0.12109375 。同理，在16位精度下，0.1234567实际上是8090个1/65536，即0.12344360 。前者比后者小。这意味着，即使是完全相同的坐标，在阴影贴图中的z值可能会比shadowCoord.z中的值小，这就造成了矩形平面的某些区域被误认为是阴影了。我们再进行比较时，为阴影贴图添加了一个偏移量0.005，就可以避免产生马赫带。注意，偏移量应当略大于精度，比如这里的0.005就略大于1/256 。

var FSHADER_SOURCE =
  `#ifdef GL_ES
  precision mediump float;
  #endif
  uniform sampler2D u_ShadowMap;
  varying vec4 v_PositionFromLight;
  varying vec4 v_Color;
  void main() {
    vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
    vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
    float depth = rgbaDepth.r; // Retrieve the z-value from R
    float visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0;
    gl_FragColor = vec4(v_Color.rgb * visibility, v_Color.a);
  }
  `;

var OFFSCREEN_WIDTH = 2048, OFFSCREEN_HEIGHT = 2048;
var LIGHT_X = 0, LIGHT_Y = 7, LIGHT_Z = 2; // Position of the light source

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders for generating a shadow map
  // fixme:初始化用来生成阴影贴图的程序对象
  var shadowProgram = createProgram(gl, SHADOW_VSHADER_SOURCE, SHADOW_FSHADER_SOURCE);
  shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
  shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');
  if (shadowProgram.a_Position < 0 || !shadowProgram.u_MvpMatrix) {
    console.log('Failed to get the storage location of attribute or uniform variable from shadowProgram');
    return;
  }

  // Initialize shaders for regular drawing
  // fixme:初始化用来正常绘制的程序对象
  var normalProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  normalProgram.a_Position = gl.getAttribLocation(normalProgram, 'a_Position');
  normalProgram.a_Color = gl.getAttribLocation(normalProgram, 'a_Color');
  normalProgram.u_MvpMatrix = gl.getUniformLocation(normalProgram, 'u_MvpMatrix');
  normalProgram.u_MvpMatrixFromLight = gl.getUniformLocation(normalProgram, 'u_MvpMatrixFromLight');
  normalProgram.u_ShadowMap = gl.getUniformLocation(normalProgram, 'u_ShadowMap');
  if (normalProgram.a_Position < 0 || normalProgram.a_Color < 0 || !normalProgram.u_MvpMatrix ||
      !normalProgram.u_MvpMatrixFromLight || !normalProgram.u_ShadowMap) {
    console.log('Failed to get the storage location of attribute or uniform variable from normalProgram');
    return;
  }

  // Set the vertex information
  // fixme:设置顶点信息
  var triangle = initVertexBuffersForTriangle(gl);
  var plane = initVertexBuffersForPlane(gl);
  if (!triangle || !plane) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Initialize framebuffer object (FBO)
  // fixme:初始化帧缓冲区(FBO)
  var fbo = initFramebufferObject(gl);
  if (!fbo) {
    console.log('Failed to initialize frame buffer object');
    return;
  }
  // fixme:重要:将纹理对象绑定到纹理单元上
  gl.activeTexture(gl.TEXTURE0); // Set a texture object to the texture unit
  gl.bindTexture(gl.TEXTURE_2D, fbo.texture); // fixme:这里放的是帧缓冲区的纹理图像

  // Set the clear color and enable the depth test
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);   // fixme:这里用隐藏面消除，这样当在光源处画三角形和矩形时，被三角形挡住的矩形部分就不会画了，这样三角形和矩形的深度值就不一样了

  // fixme:视点在光源处的视图投影矩阵,以生成纹理贴图
  var viewProjMatrixFromLight = new Matrix4(); // Prepare a view projection matrix for generating a shadow map
  viewProjMatrixFromLight.setPerspective(70.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 100.0);
  viewProjMatrixFromLight.lookAt(LIGHT_X, LIGHT_Y, LIGHT_Z, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

  // fixme:视点在原处的试图投影矩阵,以正常绘制
  var viewProjMatrix = new Matrix4();          // Prepare a view projection matrix for regular drawing
  viewProjMatrix.setPerspective(45, canvas.width/canvas.height, 1.0, 100.0);
  viewProjMatrix.lookAt(0.0, 7.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

  var currentAngle = 0.0; // Current rotation angle (degrees)
  var mvpMatrixFromLight_t = new Matrix4(); // A model view projection matrix from light source (for triangle)
  var mvpMatrixFromLight_p = new Matrix4(); // A model view projection matrix from light source (for plane)
  var tick = function() {
    currentAngle = animate(currentAngle);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);               // fixme:将绘制目标切换为帧缓冲区 // Change the drawing destination to FBO
    gl.viewport(0, 0, OFFSCREEN_HEIGHT, OFFSCREEN_HEIGHT); // fixme:这个范围比canvas范围大 // Set view port for FBO
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);   // fixme:每画一次之前,就清空一次缓冲区 // Clear FBO

    gl.useProgram(shadowProgram); // Set shaders for generating a shadow map
    // Draw the triangle and the plane (for generating a shadow map)
    // fixme:注意,这里在生成纹理贴图时,我们将模型视图投影矩阵保存了下来,因为稍后执行normalProgram程序对象完成常规绘制时,片元着色器也需要该矩阵,它是其中的u_MvpMatrixFromLight变量
    drawTriangle(gl, shadowProgram, triangle, currentAngle, viewProjMatrixFromLight);
    mvpMatrixFromLight_t.set(g_mvpMatrix); // Used later
    drawPlane(gl, shadowProgram, plane, viewProjMatrixFromLight);
    mvpMatrixFromLight_p.set(g_mvpMatrix); // Used later

    // fixme:将绘制目标切换为颜色缓冲区
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);               // Change the drawing destination to color buffer
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

    gl.useProgram(normalProgram); // Set the shader for regular drawing
    gl.uniform1i(normalProgram.u_ShadowMap, 0);  // Pass 0 because gl.TEXTURE0 is enabledする
    // Draw the triangle and plane ( for regular drawing)
    gl.uniformMatrix4fv(normalProgram.u_MvpMatrixFromLight, false, mvpMatrixFromLight_t.elements);
    drawTriangle(gl, normalProgram, triangle, currentAngle, viewProjMatrix);
    gl.uniformMatrix4fv(normalProgram.u_MvpMatrixFromLight, false, mvpMatrixFromLight_p.elements);
    drawPlane(gl, normalProgram, plane, viewProjMatrix);

    window.requestAnimationFrame(tick, canvas);
  };
  tick();
}

function initVertexBuffersForTriangle(gl) {
    // Create a triangle
    //       v2
    //      / |
    //     /  |
    //    /   |
    //  v0----v1

    // Vertex coordinates
    var vertices = new Float32Array([-0.8, 3.5, 0.0,  0.8, 3.5, 0.0,  0.0, 3.5, 1.8]);
    // Colors
    var colors = new Float32Array([1.0, 0.5, 0.0,  1.0, 0.5, 0.0,  1.0, 0.0, 0.0]);
    // Indices of the vertices
    var indices = new Uint8Array([0, 1, 2]);

    var o = new Object();  // Utilize Object object to return multiple buffer objects together

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.colorBuffer = initArrayBufferForLaterUse(gl, colors, 3, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    if (!o.vertexBuffer || !o.colorBuffer || !o.indexBuffer) return null;

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}

function initVertexBuffersForPlane(gl) {
    // Create a plane
    //  v1------v0
    //  |        |
    //  |        |
    //  |        |
    //  v2------v3

    // Vertex coordinates
    var vertices = new Float32Array([
        3.0, -1.7, 2.5,  -3.0, -1.7, 2.5,  -3.0, -1.7, -2.5,   3.0, -1.7, -2.5    // v0-v1-v2-v3
    ]);

    // Colors
    var colors = new Float32Array([
        1.0, 1.0, 1.0,    1.0, 1.0, 1.0,  1.0, 1.0, 1.0,   1.0, 1.0, 1.0
    ]);

    // Indices of the vertices
    var indices = new Uint8Array([0, 1, 2,   0, 2, 3]);

    var o = new Object(); // Utilize Object object to return multiple buffer objects together

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.colorBuffer = initArrayBufferForLaterUse(gl, colors, 3, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    if (!o.vertexBuffer || !o.colorBuffer || !o.indexBuffer) return null;

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}

function initArrayBufferForLaterUse(gl, data, num, type) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Store the necessary information to assign the object to the attribute variable later
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}

function initFramebufferObject(gl) {
    var framebuffer, texture, depthBuffer;

    // Define the error handling function
    var error = function() {
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (texture) gl.deleteTexture(texture);
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    }

    // Create a framebuffer object (FBO)
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.log('Failed to create frame buffer object');
        return error();
    }

    // Create a texture object and set its size and parameters
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
        console.log('Failed to create texture object');
        return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // Create a renderbuffer object and Set its size and parameters
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    // Attach the texture and the renderbuffer object to the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check if FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    framebuffer.texture = texture; // keep the required object

    // Unbind the buffer object
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return framebuffer;
}


// Coordinate transformation matrix
var g_modelMatrix = new Matrix4();
var g_mvpMatrix = new Matrix4();
function drawTriangle(gl, program, triangle, angle, viewProjMatrix) {
  // Set rotate angle to model matrix and draw triangle
  g_modelMatrix.setRotate(angle, 0, 1, 0);
  draw(gl, program, triangle, viewProjMatrix);
}

function drawPlane(gl, program, plane, viewProjMatrix) {
  // Set rotate angle to model matrix and draw plane
  g_modelMatrix.setRotate(-45, 0, 1, 1);
  draw(gl, program, plane, viewProjMatrix);
}

function draw(gl, program, o, viewProjMatrix) {
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  if (program.a_Color != undefined) // If a_Color is defined to attribute
    initAttributeVariable(gl, program.a_Color, o.colorBuffer);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

  // Calculate the model view project matrix and pass it to u_MvpMatrix
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

  gl.drawElements(gl.TRIANGLES, o.numIndices, gl.UNSIGNED_BYTE, 0);
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

var ANGLE_STEP = 40;   // The increments of rotation angle (degrees)

var last = Date.now(); // Last time that this function was called
function animate(angle) {
  var now = Date.now();   // Calculate the elapsed time
  var elapsed = now - last;
  last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}
