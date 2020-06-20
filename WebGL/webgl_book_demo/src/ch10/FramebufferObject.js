// FramebufferObject.js (c) matsuda and kanda
// fixme:在默认情况下，WebGL在颜色缓冲区中进行绘制，在开启隐藏面消除功能时，还会用到深度缓冲区。总之，绘制的结果图像是存储在颜色缓冲区中的
// fixme:帧缓冲区对象(framebuffer object):可以用来代替颜色缓冲区或者深度缓冲区。绘制在帧缓冲区中的对象并不会直接显示在<canvas>上，你可以先对帧缓冲区中的内容进行一些处理再显示，或者直接用其中的内容作为纹理对象
// fixme:在帧缓冲区中进行绘制的过程又称为“离屏绘制(offscreen drawing)”
// fixme:而绘制操作不是直接发生在帧缓冲区中的，而是发生在帧缓冲区所关联的对象(attachment)上
// fixme:一个帧缓冲区有3个关联对象：颜色关联对象(color attachment)、深度关联对象(depth attachment)、模板关联对象(stencil attachment)
// fixme:分别用来代替颜色缓冲区、深度缓冲区、模板缓冲区
// fixme:经过一些设置，WebGL就可以向帧缓冲区的关联对象写入数据，就像写入颜色缓冲区或深度缓冲区一样。每个关联对象又可以是两种类型：
// fixme:(1)纹理对象：在第五章介绍过了。当我们把纹理对象作为颜色关联对象关联到帧缓冲区对象后，WebGL就可以在纹理对象中绘图
// fixme:(2)渲染缓冲区：表示一种更加通用的绘图区域，可以向其中写入多种类型的数据


// Vertex shader program
var VSHADER_SOURCE =
    `attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  uniform mat4 u_MvpMatrix;
  varying vec2 v_TexCoord;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_TexCoord;
  }
    `
;

// Fragment shader program
var FSHADER_SOURCE =
    `#ifdef GL_ES
  precision mediump float;
  #endif
  uniform sampler2D u_Sampler;
  varying vec2 v_TexCoord;
  void main() {
    gl_FragColor = texture2D(u_Sampler, v_TexCoord);
  }
    `
;

// Size of off screen
// fixme:离屏绘制的尺寸
var OFFSCREEN_WIDTH = 256;
var OFFSCREEN_HEIGHT = 256;

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

    // Get the storage location of attribute variables and uniform variables
    var program = gl.program; // Get program object
    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
    if (program.a_Position < 0 || program.a_TexCoord < 0 || !program.u_MvpMatrix) {
        console.log('Failed to get the storage location of a_Position, a_TexCoord, u_MvpMatrix');
        return;
    }

    // Set the vertex information
    var cube = initVertexBuffersForCube(gl);
    var plane = initVertexBuffersForPlane(gl);
    if (!cube || !plane) {
        console.log('Failed to set the vertex information');
        return;
    }

    // Set texture
    var texture = initTextures(gl);
    if (!texture) {
        console.log('Failed to intialize the texture.');
        return;
    }

    // Initialize framebuffer object (FBO)
    var fbo = initFramebufferObject(gl);
    if (!fbo) {
        console.log('Failed to intialize the framebuffer object (FBO)');
        return;
    }

    // Enable depth test
    gl.enable(gl.DEPTH_TEST);
    // fixme:运行程序发现矩形的正反表面都被贴上了纹理，这是因为WebGL默认绘制图形的正反面（虽然你同时只能看到一个）
    // fixme:开启消隐功能，让WebGL不再绘制图形的背面，以提高绘制速度（理想情况下达到两倍）
    //  gl.enable(gl.CULL_FACE);

    // fixme:？？？？？？？？
    // fixme:注意，这里单独定义了帧缓冲区对象的视图投影矩阵，因为绘制立方体时的视图投影矩阵与绘制矩形时的并不一样
    var viewProjMatrix = new Matrix4();   // Prepare view projection matrix for color buffer
    viewProjMatrix.setPerspective(30, canvas.width/canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 0.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    var viewProjMatrixFBO = new Matrix4();   // Prepare view projection matrix for FBO
    viewProjMatrixFBO.setPerspective(30.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 100.0);
    viewProjMatrixFBO.lookAt(0.0, 2.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    // Start drawing
    var currentAngle = 0.0; // Current rotation angle (degrees)
    var tick = function() {
        currentAngle = animate(currentAngle);  // Update current rotation angle
        draw(gl, canvas, fbo, plane, cube, currentAngle, texture, viewProjMatrix, viewProjMatrixFBO);
        window.requestAnimationFrame(tick, canvas);
    };
    tick();
}

function initVertexBuffersForCube(gl) {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3

    // Vertex coordinates
    var vertices = new Float32Array([
        1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,    // v0-v1-v2-v3 front
        1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,    // v0-v3-v4-v5 right
        1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,    // v1-v6-v7-v2 left
        -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,    // v7-v4-v3-v2 down
        1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0     // v4-v7-v6-v5 back
    ]);

    // Texture coordinates
    var texCoords = new Float32Array([
        1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v0-v1-v2-v3 front
        0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v0-v3-v4-v5 right
        1.0, 0.0,   1.0, 1.0,   0.0, 1.0,   0.0, 0.0,    // v0-v5-v6-v1 up
        1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v1-v6-v7-v2 left
        0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0,    // v7-v4-v3-v2 down
        0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0     // v4-v7-v6-v5 back
    ]);

    // Indices of the vertices
    var indices = new Uint8Array([
        0, 1, 2,   0, 2, 3,    // front
        4, 5, 6,   4, 6, 7,    // right
        8, 9,10,   8,10,11,    // up
        12,13,14,  12,14,15,    // left
        16,17,18,  16,18,19,    // down
        20,21,22,  20,22,23     // back
    ])

    var o = new Object();  // Create the "Object" object to return multiple objects.

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    if (!o.vertexBuffer || !o.texCoordBuffer || !o.indexBuffer) return null;

    o.numIndices = indices.length;

    // Unbind the buffer object
    // fixme:先解绑，后面要用的时候再一个一个绑
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}

function initVertexBuffersForPlane(gl) {
    // Create face
    //  v1------v0
    //  |        |
    //  |        |
    //  |        |
    //  v2------v3

    // Vertex coordinates
    var vertices = new Float32Array([
        1.0, 1.0, 0.0,  -1.0, 1.0, 0.0,  -1.0,-1.0, 0.0,   1.0,-1.0, 0.0    // v0-v1-v2-v3
    ]);

    // Texture coordinates
    var texCoords = new Float32Array([1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0]);

    // Indices of the vertices
    var indices = new Uint8Array([0, 1, 2,   0, 2, 3]);

    var o = new Object(); // Create the "Object" object to return multiple objects.

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    if (!o.vertexBuffer || !o.texCoordBuffer || !o.indexBuffer) return null;

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

function initTextures(gl) {
    var texture = gl.createTexture();   // Create a texture object
    if (!texture) {
        console.log('Failed to create the Texture object');
        return null;
    }

    // Get storage location of u_Sampler
    var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    if (!u_Sampler) {
        console.log('Failed to get the storage location of u_Sampler');
        return null;
    }

    var image = new Image();  // Create image object
    if (!image) {
        console.log('Failed to create the Image object');
        return null;
    }
    // Register the event handler to be called when image loading is completed
    image.onload = function() {
        // Write image data to texture object
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        // Pass the texure unit 0 to u_Sampler
        gl.uniform1i(u_Sampler, 0);

        // fixme:做完都解绑对象
        gl.bindTexture(gl.TEXTURE_2D, null); // Unbind the texture object
    };

    // Tell the browser to load an Image
    image.src = '../resources/sky_cloud.jpg';

    return texture;
}

// fixme:步骤
// fixme:(1)创建帧缓冲区对象：gl.createFramebuffer();
// fixme:(2)创建纹理对象并设置其尺寸和参数：gl.createTexture();、gl.bindTexture(); gl.texParameteri(); gl.texImage2D();
// fixme:(3)创建渲染缓冲区对象：gl.createRenderbuffer();
// fixme:(4)绑定渲染缓冲区对象并设置其尺寸：gl.bindRenderbuffer();gl.renderbufferStorage();
// fixme:(5)将帧缓冲区的颜色关联对象指定为一个纹理对象：gl.framebufferTexture2D()
// fixme:(6)将帧缓冲区的深度关联对象指定为一个渲染缓冲区对象：gl.framebufferRenderbuffer()
// fixme:(7)检查帧缓冲区是否正确配置：gl.checkFramebufferStatus()
// fixme:(8)在帧缓冲区中进行绘制：gl.bindFramebuffer()
function initFramebufferObject(gl) {
    var framebuffer, texture, depthBuffer;

    // Define the error handling function
    // fixme:定义的这个函数不错，统一解决
    var error = function() {
        // fixme:删除一个帧缓冲区对象
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (texture) gl.deleteTexture(texture);
        // fixme:删除帧缓冲区对象中的渲染缓冲区对象
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    }

    // Create a frame buffer object (FBO)
    // fixme:(1)gl.createFramebuffer()：创建帧缓冲区对象
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.log('Failed to create frame buffer object');
        return error();
    }

    // Create a texture object and set its size and parameters
    // fixme:(2)创建纹理对象并设置其尺寸和参数
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
        console.log('Failed to create texture object');
        return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
    // fixme:将纹理的尺寸设为OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT，比<canvas>略小一些，以加快绘制的速度
    // fixme:gl.texImage2D()函数可以为纹理对象分配一块存储纹理图像的区域，供WebGL在其中进行绘制
    // fixme:调用该函数，将最后一个参数设为null，就可以创建一块空白的区域。第5章中这个参数是传入的纹理图像Image对象。
    // fixme:将创建出来的纹理对象存储在framebuffer.texture属性上，以便稍后访问
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    framebuffer.texture = texture; // fixme:保存纹理对象 // Store the texture object

    // Create a renderbuffer object and Set its size and parameters
    // fixme:(3)创建渲染缓冲区对象
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    // fixme:(4)绑定渲染缓冲区对象并设置其尺寸
    // fixme:gl.bindRenderbuffer(target,renderbuffer)：将renderbuffer指定的渲染缓冲区对象绑定在target目标上。如果renderbuffer为null，则将已经绑定在target目标上的渲染缓冲区对象解除绑定
    // fixme:参数target：必须是gl.RENDERBUFFER
    // fixme:参数renderbuffer：指定被绑定的渲染缓冲区
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer); // Bind the object to target
    // fixme:绑定完成后，就可以使用gl.renderbufferStorage()函数设置渲染缓冲区的格式、宽度、高度等。
    // fixme:注意，作为深度关联对象的渲染缓冲区，其宽度和高度必须与作为颜色关联对象的纹理缓冲区一致
    // fixme:gl.renderbufferStorage(target,internalformat,width,height)：创建并初始化渲染缓冲区的数据区
    // fixme:参数target：必须是gl.RENDERBUFFER
    // fixme:参数internalformat：指定渲染缓冲区中的数据格式
    // fixme:参数internalformat=gl.DEPTH_COMPONENT16时，表示渲染缓冲区将替代深度缓冲区
    // fixme:参数internalformat=gl.STENCIL_INDEX8时，表示渲染缓冲区将替代模板缓冲区
    // fixme:参数internalformat=gl.RGBA4时，表示渲染缓冲区将替代颜色缓冲区，RGBA这四个分量各占4byte
    // fixme:参数internalformat=gl.RGB5_A1时，表示渲染缓冲区将替代颜色缓冲区，RGB各占5byte，A分量占1byte
    // fixme:参数internalformat=gl.RGB565时，表示渲染缓冲区将替代颜色缓冲区，RGB各占5、6、5byte
    // fixme:参数width、height：指定渲染缓冲区的宽度和高度，以像素为单位
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    // Attach the texture and the renderbuffer object to the FBO
    // fixme:(5)使用帧缓冲区对象的方式与使用渲染缓冲区类似：先将缓冲区绑定到目标上，然后通过操作目标来操作缓冲区对象，而不能直接操作缓冲区对象
    // fixme:gl.bindFramebuffer(target,framebuffer)：将framebuffer指定的帧缓冲区对象绑定到target目标上。如果framebuffer为null，那么已经绑定到target目标上的帧缓冲区对象将被解除绑定
    // fixme:参数target：必须是gl.FRAMEBUFFER
    // fixme:参数framebuffer：指定被绑定的帧缓冲区对象
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);   // fixme：必须先绑定帧缓冲区(这步在步骤里是最后一步，但这里还是得用)
    // fixme:本例使用一个纹理对象来替代颜色缓冲区，所以就将这个纹理对象指定为帧缓冲区的颜色关联对象
    // fixme:gl.framebufferTexture2D(target,attachment,textarget,texture,level)：将texture指定的纹理对象关联到绑定在target目标上的帧缓冲区
    // fixme:参数target：必须是gl.FRAMEBUFFER
    // fixme:参数attachment：指定关联的类型
    // fixme:参数attachment=gl.COLOR_ATTACHMENT0时，表示texture是颜色关联对象
    // fixme:参数attachment=gl.DEPTH_ATTACHMENT时，表示texture是深度关联对象
    // fixme:参数textarget：同第二步的gl.texImage2D()的第1个参数(gl.TEXTURE_2D或gl.TEXTURE_CUBE)
    // fixme:参数texture：指定关联的纹理对象
    // fixme:参数level：指定为0(在使用MIPMAP时纹理时指定纹理的层级)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    // fixme:帮主进行隐藏面消除
    // fixme:gl.framebufferRenderbuffer(target,attachment,renderbuffertarget,renderbuffer)
    // fixme:参数target：必须是gl.FRAMEBUFFER
    // fixme:参数attachment：指定关联的类型
    // fixme:参数attachment=gl.COLOR_ATTACHMENT0时，表示texture是颜色关联对象
    // fixme:参数attachment=gl.DEPTH_ATTACHMENT时，表示texture是深度关联对象
    // fixme:参数attachment=gl.STENCIL_ATTACHMENT0时，表示texture是模板关联对象
    // fixme:参数renderbuffertarget：必须是gl.RENDERBUFFER
    // fixme:参数renderbuffer：指定被关联的渲染缓冲区对象
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check if FBO is configured correctly
    // fixme:(7)检查帧缓冲区是否正确配置
    // fixme:gl.checkFramebufferStatus(target)：检查绑定在target上的帧缓冲区对象的配置状态
    // fixme:参数target：必须是gl.FRAMEBUFFER
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    // Unbind the buffer object
    // fixme:这里也是全清空了
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);


    return framebuffer;
}

function draw(gl, canvas, fbo, plane, cube, angle, texture, viewProjMatrix, viewProjMatrixFBO) {
    // fixme:(8)在帧缓冲区中进行绘制
    // fixme:先把绘制目标切换为帧缓冲区对象fbo，并在其颜色关联对象，即在纹理对象中绘制了立方体
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);     // fixme:绑定到帧缓冲区对象，这样gl.drawArrays()和gl.drawElements()就会在帧缓冲区中进行绘制了    // Change the drawing destination to FBO
    // fixme:gl.viewport(x,y,width,height)：设置gl.drawArrays()和gl.drawElements()函数的绘图区域。在<canvas>上绘图时，x和y就是<canvas>中的坐标
    // fixme:参数x，y：指定绘图区域的左上角，以像素为单位
    // fixme:参数width，height：指定绘图区域的宽度和高度
    gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT); // fixme:定义离线绘图的绘图区域  // Set a viewport for FBO

    gl.clearColor(0.2, 0.2, 0.4, 1.0); // Set clear color (the color is slightly changed)
    // fixme:接着，我们清除了帧缓冲区的颜色关联对象和深度关联对象，就像清除颜色缓冲区和深度缓冲区一样(此时是在帧缓冲区对象中)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // Clear FBO
    // fixme:绘制立方体
    drawTexturedCube(gl, gl.program, cube, angle, texture, viewProjMatrixFBO);   // Draw the cube
    // fixme:然后绘制矩形
    // fixme:这时需要在颜色缓冲区中绘制了，所以还得把绘制目标切换回来
    // fixme:调用gl.bindFramebuffer()并把第二个参数设为null，解除帧缓冲区的绑定
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);        // Change the drawing destination to color buffer
    // fixme:重新设置视口
    gl.viewport(0, 0, canvas.width, canvas.height);  // Set the size of viewport back to that of <canvas>

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer
    // fixme:绘制矩形，将存储了离屏绘制结果的纹理对象fbo.texture作为参数传入了该函数，供绘制矩形时使用
    drawTexturedPlane(gl, gl.program, plane, angle, fbo.texture, viewProjMatrix);  // Draw the plane
}

// Coordinate transformation matrix
var g_modelMatrix = new Matrix4();
var g_mvpMatrix = new Matrix4();

function drawTexturedCube(gl, program, o, angle, texture, viewProjMatrix) {
    // Calculate a model matrix
    g_modelMatrix.setRotate(20.0, 1.0, 0.0, 0.0);
    g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

    // Calculate the model view project matrix and pass it to u_MvpMatrix
    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    drawTexturedObject(gl, program, o, texture);
}

function drawTexturedObject(gl, program, o, texture) {
    // Assign the buffer objects and enable the assignment
    initAttributeVariable(gl, program.a_Position, o.vertexBuffer);    // Vertex coordinates
    initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);  // Texture coordinates

    // Bind the texture object to the target
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);
    gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

function drawTexturedPlane(gl, program, o, angle, texture, viewProjMatrix) {
    // Calculate a model matrix
    g_modelMatrix.setTranslate(0, 0, 1);
    g_modelMatrix.rotate(20.0, 1.0, 0.0, 0.0);
    g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

    // Calculate the model view project matrix and pass it to u_MvpMatrix
    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    drawTexturedObject(gl, program, o, texture);
}



function drawTexturedCube2(gl, o, angle, texture, viewpProjMatrix, u_MvpMatrix) {
    // Calculate a model matrix
    g_modelMatrix.rotate(20.0, 1.0, 0.0, 0.0);
    g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);
    g_modelMatrix.scale(1, 1, 1);

    // Calculate the model view project matrix and pass it to u_MvpMatrix
    g_mvpMatrix.set(vpMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(u_MvpMatrix, false, g_mvpMatrix.elements);

    drawTexturedObject(gl, o, texture);
}

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
