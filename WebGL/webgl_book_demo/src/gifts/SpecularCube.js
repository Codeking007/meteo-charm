// Specular.js 2013 (c) matsuda
// Vertex shader program
var VSHADER_SOURCE =
    `uniform mat4 u_perspectiveMatrix;
  uniform mat4 u_modelMatrix;
  uniform mat4 u_viewMatrix;
  attribute vec4 a_Position;
  attribute vec3 a_Normal;
  varying vec4 v_Position;
  varying vec3 v_Normal;
  void main() {
    mat4 modelViewMatrix = u_viewMatrix * u_modelMatrix;
    v_Position = modelViewMatrix * a_Position;
    gl_Position = u_perspectiveMatrix * v_Position;
    
    v_Normal = normalize( mat3(modelViewMatrix) * a_Normal);
  }`
  ;

// Fragment shader program
//language=GLSL
var FSHADER_SOURCE =
    `#ifdef GL_ES
  precision mediump float;
  #endif
  uniform mat4 u_fViewMatrix;
  uniform vec3 u_lightPosition;
  varying vec4 v_Position;
  varying vec3 v_Normal;
  void main() {
    vec3 normal = normalize(v_Normal);
    // fixme:前面这里都是用的世界坐标相减算的光线方向，因为那样好算。这里用的是视图坐标系相减
    vec3 lightPosition = vec3(u_fViewMatrix * vec4(u_lightPosition, 1) - v_Position);
    vec3 lightDir = normalize(lightPosition);
    float lightDist = length(lightPosition);
    float specular = 0.0;
    float d = max(dot(normal, lightDir), 0.0);    // fixme:视图坐标系下的法向量与视图坐标系下的光线方向的点积
    if (d > 0.0) {  // fixme:用的视图坐标系下的光线与法线的夹角，正好判断是否是迎着光照的那个面，大于0代表迎着光照
      vec3 viewVec = vec3(0,0,1.0);     // fixme:Z轴方向的向量，并且正好是归一化的
      // fixme:reflect()函数返回入射向量l的反射方向和表面方向N，所以这里用的==> （-lightDir） ==>负的
      // fixme:这里得到的是反射光线向量
      vec3 reflectVec = reflect(-lightDir, normal);     
      // fixme:这里dot()得到的是z轴与反射光线的夹角的cos值，因为两者都是归一化的
      // todo:这一步的pow不知道是干嘛的？？？？？？？为什么是z轴与反射光线的夹角
      specular = pow(max(dot(reflectVec, viewVec), 0.0), 120.0);
    }
    // fixme:vec3(0.1,0.1,0.1)可认为是环境光的环境反射
    // fixme:vec3(0.4, 0.4, 0.4) * d ==>可认为是点光源的漫反射
    // fixme:specular ==>为太阳特做的特效
    gl_FragColor.rgb = vec3(0.1,0.1,0.1) + vec3(0.4, 0.4, 0.4) * d +specular;
    gl_FragColor.a = 1.0;
  }
    `
  ;

// Gloval variables
var g_perspectiveMatrix = new Matrix4();
var g_modelMatrix = new Matrix4();
var g_viewMatrix = new Matrix4();

var g_vertexPositionBuffer;
var g_vertexNormalBuffer;
var g_vertexIndexBuffer;

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

  var perspectiveMatrixShaderLocation = gl.getUniformLocation(gl.program, 'u_perspectiveMatrix');
  var modelMatrixShaderLocation = gl.getUniformLocation(gl.program, 'u_modelMatrix');
  var viewMatrixShaderLocation = gl.getUniformLocation(gl.program, 'u_viewMatrix');
  var lightPositionShaderLocation = gl.getUniformLocation(gl.program, 'u_lightPosition');
  var f_viewMatrixShaderLocation = gl.getUniformLocation(gl.program, 'u_fViewMatrix');
  
  gl.enable(gl.DEPTH_TEST);

  gl.clearColor(0, 0, 0, 1);
  sendCubeVertexBuffers(gl);

  var angle = 0;
  
  var tick = function() {
    window.requestAnimationFrame(tick);
    angle += 0.3;

    drawCommon(gl, canvas, angle, perspectiveMatrixShaderLocation, viewMatrixShaderLocation, lightPositionShaderLocation, f_viewMatrixShaderLocation);

    drawCube(gl, canvas, angle, perspectiveMatrixShaderLocation, modelMatrixShaderLocation, lightPositionShaderLocation);
  };
  tick(); 
}

function drawCommon(gl, canvas, angle, perspectiveMatrixShaderLocation, viewMatrixShaderLocation, lightPositionShaderLocation, f_viewMatrixShaderLocation) {

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear canvas
  g_perspectiveMatrix.setPerspective(30, canvas.width/canvas.height, 1, 10000);
  g_viewMatrix.setLookAt(0, 3, 10,   0, 0, 0,    0, 1, 0);   // eyePos - focusPos - upVector

  gl.uniformMatrix4fv(perspectiveMatrixShaderLocation, false, g_perspectiveMatrix.elements);
  gl.uniformMatrix4fv(viewMatrixShaderLocation, false, g_viewMatrix.elements);

  gl.uniformMatrix4fv(f_viewMatrixShaderLocation, false, g_viewMatrix.elements);

  var lightPosition = new Float32Array([2, 0, 2]);
  gl.uniform3fv(lightPositionShaderLocation, lightPosition);
}

function drawCube(gl, canvas, angle, perspectiveMatrixShaderLocation, modelMatrixShaderLocation, lightPositionShaderLocation) {
  
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexPositionBuffer);
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexNormalBuffer);
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_vertexIndexBuffer);

  g_modelMatrix.setTranslate(0, 0, 0);
  g_modelMatrix.rotate(angle, 0, 1, 0);
  g_modelMatrix.scale(1.0, 1.0, 1.0);

  gl.uniformMatrix4fv(modelMatrixShaderLocation, false, g_modelMatrix.elements);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0); 
}

function sendCubeVertexBuffers(gl) {
  var cubeVertices = new Float32Array([
     1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,  // v0-v1-v2-v3 front
     1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,  // v0-v3-v4-v5 right
     1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,  // v0-v5-v6-v1 top 
    -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,  // v1-v6-v7-v2 left
    -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,  // v7-v4-v3-v2 bottom
     1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1   // v4-v7-v6-v5 back
  ]);

  var cubeNormals = new Float32Array([
    0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,     // v0-v1-v2-v3 front
    1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,     // v0-v3-v4-v5 right
    0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,     // v0-v5-v6-v1 top
   -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,     // v1-v6-v7-v2 left
    0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,     // v7-v4-v3-v2 bottom
    0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1      // v4-v7-v6-v5 back
	]);
   
  var indices = new Uint8Array([
     0,  1,  2,   0,  2,  3,    // front
     4,  5,  6,   4,  6,  7,    // right
     8,  9, 10,   8, 10, 11,    // top
    12, 13, 14,  12, 14, 15,    // left
    16, 17, 18,  16, 18, 19,    // bottom
    20, 21, 22,  20, 22, 23     // back
  ]);

  g_vertexPositionBuffer = gl.createBuffer();
  g_vertexNormalBuffer = gl.createBuffer();
  g_vertexIndexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_vertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return true;
}


