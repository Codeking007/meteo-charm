'use strict';
let baseVertexShader =
  `precision highp float;
    precision mediump sampler2D;
    attribute vec2 aPosition;
    varying vec2 vUv;   
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;                 // fixme：一个像素的位置大小
    void main () {
        vUv = aPosition * 0.5 + 0.5;               // fixme:当前纹理坐标
        vL = vUv - vec2(texelSize.x, 0.0);        // fixme:左纹理坐标
        vR = vUv + vec2(texelSize.x, 0.0);        // fixme:右纹理坐标
        vT = vUv + vec2(0.0, texelSize.y);        // fixme:上纹理坐标
        vB = vUv - vec2(0.0, texelSize.y);        // fixme:下纹理坐标
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
    `;

let advectionShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv; 
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt;
    uniform float dissipation;
    void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
    }`;

let advectionManualFilteringShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;                   // fixme:纹理坐标
    uniform sampler2D uVelocity;       // fixme:纹理单元：相对当前纹理坐标的移动距离
    uniform sampler2D uSource;
    uniform vec2 texelSize;             // fixme：一个像素的位置大小
    uniform float dt;                   // fixme:距离上次刷新时间的间隔，最低0.016秒
    uniform float dissipation;          // fixme:速度消减速率=0.99，颜色消减速率=0.98
    vec4 bilerp (in sampler2D sam, in vec2 p) {
        vec4 st;                         // fixme:存的xyzw用于卷积，做双线性混合。(x,y)左下方坐标点，(z,w)右上方坐标点
        st.xy = floor(p - 0.5) + 0.5;     // todo:为什么要这么写？？？
        st.zw = st.xy + 1.0;              
        vec4 uv = st * texelSize.xyxy;   // fixme:把范围缩到(0,0)到(1,1)之间，得到纹理坐标
        vec4 a = texture2D(sam, uv.xy);
        vec4 b = texture2D(sam, uv.zy);
        vec4 c = texture2D(sam, uv.xw);
        vec4 d = texture2D(sam, uv.zw);
        vec2 f = p - st.xy;               // todo:为什么用它作插值因数？？？
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    void main () {
        // fixme:gl_FragCoord==>该内置变量的第1、2个分量gl_FragCoord.x、gl_FragCoord.y分别表示片元在canvas坐标系中的坐标值，范围从(0,0)到(textureWidth,textureHeight)
        vec2 coord = gl_FragCoord.xy - dt * texture2D(uVelocity, vUv).xy;   // todo:何故不是加移动距离
        gl_FragColor = dissipation * bilerp(uSource, coord);
        gl_FragColor.a = 1.0;
    }`;

let splatShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;
    // fixme:第一次：velocity=涡量;涡旋;旋度;旋涡状态
    // fixme:第二次：curlProgram=卷曲;盘旋;缠绕
    uniform sampler2D uTarget;      
    uniform float aspectRatio;      // fixme:canvas宽高比
    // fixme:第一次：velocity=[dx, -dy, 1.0]==>y翻转了 // todo:但这个跟颜色什么关系
    // fixme:第二次：curlProgram=0-3的随机数
    uniform vec3 color;             
    uniform vec2 point;             // fixme:splat点的纹理坐标==>已翻转y轴
    uniform float radius;           // fixme:半径=0.005
    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;     // fixme:因为屏幕不一定是正方形的，所以给坐标转成是在正方形下的
        vec3 splat = exp(-dot(p, p) / radius) * color;  // fixme:指数函数，距离离发出点越大偏移距离就越小，同时还得看鼠标移动到哪里了
        vec3 base = texture2D(uTarget, vUv).xyz;        // fixme:上一次相对于发出点移动的坐标数
        gl_FragColor = vec4(base + splat, 1.0);     // fixme:本次相对于发出点移动的坐标数
    }`;

let curlShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;                       // fixme:当前纹理坐标
    varying vec2 vL;                        // fixme:左纹理坐标
    varying vec2 vR;                        // fixme:右纹理坐标
    varying vec2 vT;                        // fixme:上纹理坐标
    varying vec2 vB;                        // fixme:下纹理坐标
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = (R - L) - (T - B);  // todo:?????
        gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
    }`;

let vorticityShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;                 // fixme:curl=30
    uniform float dt;                   // fixme:距离上次刷新时间的间隔，最低0.016秒
    void main () {
    float L = texture2D(uCurl, vL).y;
    float R = texture2D(uCurl, vR).y;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = vec2(abs(T) - abs(B), abs(R) - abs(L));
    force *= 1.0 / length(force + 0.00001) * curl * C;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }`;

let divergenceShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    vec2 sampleVelocity (in vec2 uv) {
        vec2 multiplier = vec2(1.0, 1.0);
        if (uv.x < 0.0) { uv.x = 0.0; multiplier.x = -1.0; }
        if (uv.x > 1.0) { uv.x = 1.0; multiplier.x = -1.0; }
        if (uv.y < 0.0) { uv.y = 0.0; multiplier.y = -1.0; }
        if (uv.y > 1.0) { uv.y = 1.0; multiplier.y = -1.0; }
        return multiplier * texture2D(uVelocity, uv).xy;
    }
    void main () {
        float L = sampleVelocity(vL).x;
        float R = sampleVelocity(vR).x;
        float T = sampleVelocity(vT).y;
        float B = sampleVelocity(vB).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }`;

let pressureShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB; 
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    vec2 boundary (in vec2 uv) {    // 将uv限制在minVal=0.0和maxVal=1.0之间
        uv=clamp(uv,0.0,1.0);     
        return uv;
    }
    void main () {
        float L = texture2D(uPressure, boundary(vL)).x;
        float R = texture2D(uPressure, boundary(vR)).x;
        float T = texture2D(uPressure, boundary(vT)).x;
        float B = texture2D(uPressure, boundary(vB)).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }`;

let gradientSubtractShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    vec2 boundary (in vec2 uv) {    // 将uv限制在minVal=0.0和maxVal=1.0之间
        uv = clamp(uv,0.0,1.0); 
        return uv;
    }
    void main () {
        float L = texture2D(uPressure, boundary(vL)).x;
        float R = texture2D(uPressure, boundary(vR)).x;
        float T = texture2D(uPressure, boundary(vT)).x;
        float B = texture2D(uPressure, boundary(vB)).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0); 
    }`;

let displayShader =
  `precision highp float;
    precision mediump sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    void main () {
    gl_FragColor = texture2D(uTexture, vUv);
    }`;

let isWebGL2 = false;   // fixme：这里不用webgl2，书上那个方法没用webgl2的

let textureWidth = undefined;
let textureHeight = undefined;
let density = undefined;
let velocity = undefined;
let divergence = undefined;
let curl = undefined;
let pressure = undefined;

let TEXTURE_DOWNSAMPLE = 1;
let DENSITY_DISSIPATION = 0.98;
let VELOCITY_DISSIPATION = 0.99;
let SPLAT_RADIUS = 0.005;
let CURL = 30;
let PRESSURE_ITERATIONS = 25;

function main() {
  let canvas = document.getElementsByTagName('canvas')[0];
  canvas.width = canvas.clientWidth;  // todo：？？？？
  canvas.height = canvas.clientHeight;    // todo：？？？？
// Get the rendering context for WebGL
// fixme:webgl2的，这里不用
  let params = {alpha: false, depth: false, stencil: false, antialias: false};
  /*/*let gl = canvas.getContext('webgl2', params);
   let isWebGL2 = !!gl;
   if (!isWebGL2) {
   gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
   }*/
  let gl = getWebGLContext(canvas, params);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    // return;
  }
// todo:这一大段都没动，获得什么？？？？？？
  let halfFloat = gl.getExtension('OES_texture_half_float');
  let support_linear_float = gl.getExtension('OES_texture_half_float_linear');
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    support_linear_float = gl.getExtension('OES_texture_float_linear');
  }
// Initialize shaders for generating a shadow map
  // fixme:平流
  let advectionProgram = createProgram(gl, baseVertexShader, support_linear_float ? advectionShader : advectionManualFilteringShader);
  // fixme:劈啪声
  let splatProgram = createProgram(gl, baseVertexShader, splatShader);
  // fixme:卷曲;盘旋;缠绕
  let curlProgram = createProgram(gl, baseVertexShader, curlShader);
  // fixme:涡量;涡旋;旋度;漩涡状态
  let vorticityProgram = createProgram(gl, baseVertexShader, vorticityShader);
  // fixme:发散
  let divergenceProgram = createProgram(gl, baseVertexShader, divergenceShader);
  // fixme:压力
  let pressureProgram = createProgram(gl, baseVertexShader, pressureShader);
  // fixme:梯度减法
  let gradienSubtractProgram = createProgram(gl, baseVertexShader, gradientSubtractShader);
  let displayProgram = createProgram(gl, baseVertexShader, displayShader);

  // Initialize framebuffer object (FBO)
  initFramebuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  function pointerPrototype() {
    this.id = -1;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
  }

  let pointers = [];
  pointers.push(new pointerPrototype());

// fixme:初始化时的10个动画效果
  for (let i = 0; i < 10; i++) {
    let color = [Math.random() * 10, Math.random() * 10, Math.random() * 10];
    let x = canvas.width * Math.random();
    let y = canvas.height * Math.random();
    let dx = 1000 * (Math.random() - 0.5);
    let dy = 1000 * (Math.random() - 0.5);
    splat(x, y, dx, dy, color);
  }

  let lastTime = Date.now();
  Update();


  function initFramebuffers() {
    textureWidth = gl.drawingBufferWidth >> TEXTURE_DOWNSAMPLE; // todo:为什么是一半？？  // fixme:位运算，相当于gl.drawingBufferWidth/2，颜色缓冲区的宽度的一半
    textureHeight = gl.drawingBufferHeight >> TEXTURE_DOWNSAMPLE;  // todo:为什么是一半？？  // fixme:位运算，相当于gl.drawingBufferHeight/2，颜色缓冲区的高度的一半

    // todo:这些参数选择需要理解
    let internalFormat = isWebGL2 ? gl.RGBA16F : gl.RGBA;
    let internalFormatRG = isWebGL2 ? gl.RG16F : gl.RGBA;
    let formatRG = isWebGL2 ? gl.RG : gl.RGBA;
    let texType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;

    velocity = createDoubleFBO(0, textureWidth, textureHeight, internalFormatRG, formatRG, texType, support_linear_float ? gl.LINEAR : gl.NEAREST);
    density = createDoubleFBO(2, textureWidth, textureHeight, internalFormat, gl.RGBA, texType, support_linear_float ? gl.LINEAR : gl.NEAREST);
    curl = createFBO(4, textureWidth, textureHeight, internalFormatRG, formatRG, texType, gl.NEAREST);
    divergence = createFBO(5, textureWidth, textureHeight, internalFormatRG, formatRG, texType, gl.NEAREST);
    pressure = createDoubleFBO(6, textureWidth, textureHeight, internalFormatRG, formatRG, texType, gl.NEAREST);
  }

  function createDoubleFBO(texId, w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param);

    // fixme：这个写的不错
    return {
      get first() {
        return fbo1;    // [texture, fbo, texId]
      },
      get second() {
        return fbo2;
      },
      swap: function swap() { // fixme:交换1和2
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  function createFBO(texId, w, h, internalFormat, format, type, param) {
    let fbo = gl.createFramebuffer();
    // todo：这里激活有什么用？？
    gl.activeTexture(gl.TEXTURE0 + texId);  // fixme:这样激活纹理单元，可以直接加
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);


    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    // todo:感觉这个写这里没什么用，画的时候再写不行？就跟书上一样
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return [texture, fbo, texId];
  }

  function splat(x, y, dx, dy, color) {
    gl.useProgram(splatProgram);// splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.first[2]);
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
    gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
    gl.uniform1f(splatProgram.uniforms.radius, SPLAT_RADIUS);
    blit(velocity.second[1]);
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, density.first[2]);
    gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
    blit(density.second[1]);
    density.swap();
  }

  function blit(destination) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function Update() {
    resizeCanvas();

    let dt = Math.min((Date.now() - lastTime) / 1000, 0.016);
    lastTime = Date.now();

    gl.viewport(0, 0, textureWidth, textureHeight);
    gl.useProgram(advectionProgram);// advectionProgram.bind(); // fixme:demo是在GLProgram里面写了个bind函数来调用userprogram()的
    gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2]);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.first[2]);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, VELOCITY_DISSIPATION);
    blit(velocity.second[1]);
    velocity.swap();

    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2]);
    gl.uniform1i(advectionProgram.uniforms.uSource, density.first[2]);
    gl.uniform1f(advectionProgram.uniforms.dissipation, DENSITY_DISSIPATION);
    blit(density.second[1]);
    density.swap();

    for (let i = 0; i < pointers.length; i++) {
      let pointer = pointers[i];
      if (pointer.moved) {
        splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
        pointer.moved = false;
      }
    }

    gl.useProgram(curlProgram);// curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.first[2]);
    blit(curl[1]);

    gl.useProgram(vorticityProgram);// vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.first[2]);
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2]);
    gl.uniform1f(vorticityProgram.uniforms.curl, CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.second[1]);
    velocity.swap();

    gl.useProgram(divergenceProgram);// divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.first[2]);
    blit(divergence[1]);

    clear(pressure.first[1]);     // fixme:每次都把pressure的缓冲区清空
    gl.useProgram(pressureProgram);// pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.first[2]);
      blit(pressure.second[1]);
      pressure.swap();
    }

    gl.useProgram(gradienSubtractProgram);// gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.first[2]);
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.first[2]);
    blit(velocity.second[1]);
    velocity.swap();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(displayProgram);// displayProgram.bind();
    gl.uniform1i(displayProgram.uniforms.uTexture, density.first[2]);
    blit(null);
    requestAnimationFrame(Update);
  }

  function resizeCanvas() {
    if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      initFramebuffers();
    }
  }

  function clear(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  canvas.addEventListener('mousedown', function () {
    pointers[0].down = true;
    pointers[0].color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];
  });

  // fixme:http://blog.sina.com.cn/s/blog_780a94270101kdgo.html
  canvas.addEventListener('mousemove', function (e) {
    pointers[0].moved = pointers[0].down;
    pointers[0].dx = (e.offsetX - pointers[0].x) * 10.0;    // fixme:距离放大了
    pointers[0].dy = (e.offsetY - pointers[0].y) * 10.0;
    pointers[0].x = e.offsetX;
    pointers[0].y = e.offsetY;
  });

  window.addEventListener('mouseup', function () {
    pointers[0].down = false;
  });

  canvas.addEventListener('touchstart', function (e) {
    let touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {  // fixme:可以多个手指触发事件
      if (i >= pointers.length) pointers.push(new pointerPrototype());

      pointers[i].id = touches[i].identifier;
      pointers[i].down = true;
      pointers[i].x = touches[i].pageX;
      pointers[i].y = touches[i].pageY;
      pointers[i].color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];
    }
  });

  // fixme:https://blog.csdn.net/sinat_19327991/article/details/73823874
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    let touches = e.targetTouches;
    for (let i = 0; i < e.touches.length; i++) {
      let pointer = pointers[i];
      pointer.moved = pointer.down;
      pointer.dx = (touches[i].pageX - pointer.x) * 10.0;
      pointer.dy = (touches[i].pageY - pointer.y) * 10.0;
      pointer.x = touches[i].pageX;
      pointer.y = touches[i].pageY;
    }
  }, false);

  window.addEventListener('touchend', function (e) {
    let touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      for (let j = 0; j < pointers.length; j++) {
        if (touches[i].identifier == pointers[j].id) pointers[j].down = false;
      }
    }
  });

}
