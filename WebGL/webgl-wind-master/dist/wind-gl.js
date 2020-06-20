(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global.WindGL = factory());
}(this, (function () { 'use strict';

    function createShader(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);

        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    function createProgram(gl, vertexSource, fragmentSource) {
        var program = gl.createProgram();

        var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
        var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program));
        }

        var wrapper = {program: program};

        var numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < numAttributes; i++) {
            var attribute = gl.getActiveAttrib(program, i);
            wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (var i$1 = 0; i$1 < numUniforms; i$1++) {
            var uniform = gl.getActiveUniform(program, i$1);
            wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }

        return wrapper;
    }

    function createTexture(gl, filter, data, width, height) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        if (data instanceof Uint8Array) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    function bindTexture(gl, texture, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    function createBuffer(gl, data) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    }

    function bindAttribute(gl, buffer, attribute, numComponents) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
    }

    function bindFramebuffer(gl, framebuffer, texture) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        if (texture) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        }
    }

    var drawVert = `
     precision mediump float;
     attribute float a_index;        // 第几个纹理坐标，初始时是65536=256*256，每个纹理坐标的像素值都存了粒子的位置纹理坐标
     uniform sampler2D u_particles;  // 纹理单元1：粒子，像素存的是粒子纹理坐标
     uniform float u_particles_res;  // 粒子纹理的长宽
     varying vec2 v_particle_pos;   // 粒子的纹理坐标
     void main() {
        // fixme：先算出每个纹理坐标，再通过纹理得到像素值，从而得到每个粒子的位置坐标
        // fixme:s取的假分数的小数部分，t取的假分数的整数部分占总高度的份额
         vec4 color=texture2D(u_particles,vec2(fract(a_index/u_particles_res),floor(a_index/u_particles_res)/u_particles_res));
         // decode current particle position from the pixel's RGBA value  
         v_particle_pos = vec2(color.r/255.0+color.b,color.g/255.0+color.a);
         gl_PointSize = 1.0;
         gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);
    }
`;

    var drawFrag = `
    precision mediump float;
    uniform sampler2D u_wind;   // 纹理单元0：风流线数据
    uniform sampler2D u_color_ramp; // 纹理单元2：色卡
    uniform vec2 u_wind_min;    // 风u、v方向最小值
    uniform vec2 u_wind_max;    // 风u、v方向最大值
    varying vec2 v_particle_pos;
    void main() {
        vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg);
        float speed_t = length(velocity) / length(u_wind_max);
        // color ramp is encoded in a 16x16 texture
        vec2 ramp_pos = vec2(fract(16.0*speed_t),floor(16.0*speed_t)/16.0); // fixme：通过风流线数值占比 求 色卡纹理坐标
        gl_FragColor = texture2D(u_color_ramp, ramp_pos);   // 存的色卡颜色值
    }

`;

    var quadVert = `
    precision mediump float;
    attribute vec2 a_pos;   // 长方形的纹理坐标（未处理翻转）
    varying vec2 v_tex_pos;
    void main() {
        v_tex_pos = a_pos;
        // fixme:WebGL坐标系vec(x,y)与纹理坐标系vec2(x',y')转换==> vec2(x',y')=vec(x,y)/2+0.5=(vec(x,y)+1.0)/2.0
        // todo:但这里的纹理图片与纹理坐标系关于原点对称了，所以公式要略微修改下（但png图片好像只是y轴相反，不知为何x轴也要取反）
        // fixme:这里是得到顶点坐标，所以从纹理坐标转到WebGL坐标系后还得做关于原点对称变换（或者先在纹理坐标系关于原点对称变换成0-1范围再通过公式转成WebGL坐标系）
        // fixme:vec2(x',y')=(vec(-x,-y)+1.0)/2.0=(-vec(x,y)+1.0)/2.0;或者vec2(1.0-x',1.0-y')=1.0-vec2(x',y')=(vec(x,y)+1.0)/2.0;
        // fixme:-vec(x,y)=vec2(x',y')*2.0-1.0;
        // fixme:vec(x,y)=1.0-vec2(x',y')*2.0;
        gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);    
        }
`;

    var screenFrag = `
    precision mediump float;
    uniform sampler2D u_screen; // todo 纹理单元2：跟色卡用的同一个纹理单元，一开始是空的，然后是色卡颜色值
    uniform float u_opacity;    // 渐变透明度
    varying vec2 v_tex_pos;
    void main() {
        // fixme:关于原点对称再移回0-1区间从而得到正确的纹理坐标
        vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);
        // a hack to guarantee opacity fade out even with a value close to 1.0
        // fixme:直接把帧缓冲区的颜色值拿过来用，乘上透明度
        // todo:这里用floor然后再除以255.0的目的是什么，提高精度？
        gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);  // fixme:floor()==>返回小于等于x的最大整数
        }
`;

    var updateFrag = `
    precision highp float;
    uniform sampler2D u_particles;  // 纹理单元1：粒子，像素存的是粒子纹理坐标
    uniform sampler2D u_wind;   // 纹理单元0：风流线数据
    uniform vec2 u_wind_res;    // 风流线纹理宽度高度：360，180
    uniform vec2 u_wind_min;    // 风流线纹理u、v最小值
    uniform vec2 u_wind_max;    // 风流线纹理u、v最大值
    uniform float u_rand_seed;  // todo:随机数0-1
    uniform float u_speed_factor;   // todo:粒子移动多快
    uniform float u_drop_rate;      // todo:粒子移到随机位置的频率
    uniform float u_drop_rate_bump; // todo:相对于各个粒子速度的降落增加率
    varying vec2 v_tex_pos;
    // pseudo-random generator 伪随机数发生器;
    const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
    float rand(const vec2 co) {
        float t = dot(rand_constants.xy, co);
        return fract(sin(t) * (rand_constants.z + t));
        }
    // wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation==>卷积内核：双线性插值
    // http://m.gad.qq.com/article/detail/39119
    vec2 lookup_wind(const vec2 uv) {
        // return texture2D(u_wind, uv).rg; 
        // lower-res hardware filtering
        vec2 px = 1.0 / u_wind_res;
        vec2 vc = (floor(uv * u_wind_res)) * px;    // fixme：这样把纹理坐标放大到风流线纹理图片那么大，然后取整（取整了，弄小数取不出来值）。再找到对应的纹理坐标
        vec2 f = fract(uv * u_wind_res);    // fixme:小数部分就是对应范围，因为用的纹理特性是重复的
        vec2 tl = texture2D(u_wind, vc).rg;
        vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;
        vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;
        vec2 br = texture2D(u_wind, vc + px).rg;
        return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);    // 双线性插值
    }
    void main() {
        vec4 color = texture2D(u_particles, v_tex_pos);
        // decode particle position from pixel RGBA
        vec2 pos = vec2(color.r / 255.0 + color.b,color.g / 255.0 + color.a);  // 粒子纹理坐标 
        vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(pos));
        float speed_t = length(velocity) / length(u_wind_max);
        // take EPSG:4236 distortion into account for calculating where the particle moved
        float distortion = cos(radians(pos.y * 180.0 - 90.0));
        vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;
        // update particle position, wrapping around the date line
        pos = fract(1.0 + pos + offset);
        // a random seed to use for the particle drop
        vec2 seed = (pos + v_tex_pos) * u_rand_seed;
        // drop rate is a chance a particle will restart at random position, to avoid degeneration
        float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;
        float drop = step(1.0 - drop_rate, rand(seed));
        vec2 random_pos = vec2(rand(seed + 1.3),rand(seed + 2.1));
        pos = mix(pos, random_pos, drop);
        // encode the new particle position back into RGBA
        gl_FragColor = vec4(fract(pos * 255.0),floor(pos * 255.0) / 255.0);
        }
`;

    var defaultRampColors = {   // fixme:风速==>色卡像素值
        0.0: '#3288bd',
        0.1: '#66c2a5',
        0.2: '#abdda4',
        0.3: '#e6f598',
        0.4: '#fee08b',
        0.5: '#fdae61',
        0.6: '#f46d43',
        1.0: '#d53e4f'
    };

    var WindGL = function WindGL(gl) {
        this.gl = gl;

        this.fadeOpacity = 0.996; // how fast the particle trails fade on each frame
        this.speedFactor = 0.25; // how fast the particles move
        this.dropRate = 0.003; // how often the particles move to a random place
        this.dropRateBump = 0.01; // drop rate increase relative to individual particle speed

        this.drawProgram = createProgram(gl, drawVert, drawFrag);
        this.screenProgram = createProgram(gl, quadVert, screenFrag);
        this.updateProgram = createProgram(gl, quadVert, updateFrag);

        this.quadBuffer = createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        this.framebuffer = gl.createFramebuffer();

        this.setColorRamp(defaultRampColors);
        this.resize();
    };

    WindGL.prototype.setColorRamp = function setColorRamp (colors) {
        // lookup texture for colorizing the particles according to their speed
        this.colorRampTexture = createTexture(this.gl, this.gl.LINEAR, getColorRamp(colors), 16, 16);       // fixme:getColorRamp()返回总共256个像素点（每个像素点占四位，即rgba）的像素值，所以面积得等于256，而16*16等于256正好满足，也可256*1
    };

    function getColorRamp(colors) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 1;

        var gradient = ctx.createLinearGradient(0, 0, 256, 0);
        for (var stop in colors) {
            gradient.addColorStop(+stop, colors[stop]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 1);     // fixme:这里相当于有256*1=256个像素点，所以createTexture()创建色卡纹理时width*height也要等于256像素点，那边用的是16*16

        return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data); // fixme:取出所有色卡像素值，跟ctx.fillRect()一样
    }

    WindGL.prototype.resize = function resize () {
        var gl = this.gl;
        var emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
        // screen textures to hold the drawn screen for the previous and the current frame
        // todo:切换每一帧所以设两个？
        this.backgroundTexture = createTexture(gl, gl.NEAREST, emptyPixels, gl.canvas.width, gl.canvas.height);
        this.screenTexture = createTexture(gl, gl.NEAREST, emptyPixels, gl.canvas.width, gl.canvas.height);
    };

    WindGL.prototype.setWind = function setWind (windData) {
        this.windData = windData;
        this.windTexture = createTexture(this.gl, this.gl.LINEAR, windData.image);
    };

    WindGL.prototype.draw = function draw () {
        var gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);

        bindTexture(gl, this.windTexture, 0);
        bindTexture(gl, this.particleStateTexture0, 1);

        this.drawScreen();
        this.updateParticles();
    };

    WindGL.prototype.drawScreen = function drawScreen () {
        var gl = this.gl;
        // draw the screen into a temporary framebuffer to retain it as the background on the next frame
        bindFramebuffer(gl, this.framebuffer, this.screenTexture);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        this.drawTexture(this.backgroundTexture, this.fadeOpacity);
        this.drawParticles();

        bindFramebuffer(gl, null);
        // enable blending to support drawing on top of an existing background (e.g. a map)
        gl.enable(gl.BLEND);    // todo:开了α混合功能，
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.drawTexture(this.screenTexture, 1.0);
        gl.disable(gl.BLEND);   // todo:然后又关了α混合功能

        // save the current screen as the background for the next frame
        var temp = this.backgroundTexture;
        this.backgroundTexture = this.screenTexture;
        this.screenTexture = temp;
    };

    WindGL.prototype.drawTexture = function drawTexture (texture, opacity) {
        var gl = this.gl;
        var program = this.screenProgram;
        gl.useProgram(program.program);

        bindAttribute(gl, this.quadBuffer, program.a_pos, 2);
        bindTexture(gl, texture, 2);
        gl.uniform1i(program.u_screen, 2);
        gl.uniform1f(program.u_opacity, opacity);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    WindGL.prototype.drawParticles = function drawParticles () {
        var gl = this.gl;
        var program = this.drawProgram;
        gl.useProgram(program.program);

        bindAttribute(gl, this.particleIndexBuffer, program.a_index, 1);
        bindTexture(gl, this.colorRampTexture, 2);

        gl.uniform1i(program.u_wind, 0);
        gl.uniform1i(program.u_particles, 1);
        gl.uniform1i(program.u_color_ramp, 2);

        gl.uniform1f(program.u_particles_res, this.particleStateResolution);
        gl.uniform2f(program.u_wind_min, this.windData.uMin, this.windData.vMin);
        gl.uniform2f(program.u_wind_max, this.windData.uMax, this.windData.vMax);

        gl.drawArrays(gl.POINTS, 0, this._numParticles);
    };

    var prototypeAccessors = { numParticles: {} };

    // todo:原生js写法
    prototypeAccessors.numParticles.set = function (numParticles) {
        var gl = this.gl;

        // we create a square texture where each pixel will hold a particle position encoded as RGBA
        var particleRes = this.particleStateResolution = Math.ceil(Math.sqrt(numParticles));
        this._numParticles = particleRes * particleRes;

        var particleState = new Uint8Array(this._numParticles * 4);
        for (var i = 0; i < particleState.length; i++) {
            particleState[i] = Math.floor(Math.random() * 256); // fixme:粒子随机位置 // randomize the initial particle positions
        }
        // textures to hold the particle state for the current and the next frame
        this.particleStateTexture0 = createTexture(gl, gl.NEAREST, particleState, particleRes, particleRes);
        this.particleStateTexture1 = createTexture(gl, gl.NEAREST, particleState, particleRes, particleRes);

        var particleIndices = new Float32Array(this._numParticles);
        for (var i$1 = 0; i$1 < this._numParticles; i$1++) {
            particleIndices[i$1] = i$1;
        }
        this.particleIndexBuffer = createBuffer(gl, particleIndices);
    };

    prototypeAccessors.numParticles.get = function () {
        return this._numParticles;
    };

    Object.defineProperties( WindGL.prototype, prototypeAccessors );

    WindGL.prototype.updateParticles = function updateParticles () {
        var gl = this.gl;
        bindFramebuffer(gl, this.framebuffer, this.particleStateTexture1);
        gl.viewport(0, 0, this.particleStateResolution, this.particleStateResolution);

        var program = this.updateProgram;
        gl.useProgram(program.program);

        bindAttribute(gl, this.quadBuffer, program.a_pos, 2);

        gl.uniform1i(program.u_wind, 0);
        gl.uniform1i(program.u_particles, 1);

        gl.uniform1f(program.u_rand_seed, Math.random());
        gl.uniform2f(program.u_wind_res, this.windData.width, this.windData.height);
        gl.uniform2f(program.u_wind_min, this.windData.uMin, this.windData.vMin);
        gl.uniform2f(program.u_wind_max, this.windData.uMax, this.windData.vMax);
        gl.uniform1f(program.u_speed_factor, this.speedFactor);
        gl.uniform1f(program.u_drop_rate, this.dropRate);
        gl.uniform1f(program.u_drop_rate_bump, this.dropRateBump);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // swap the particle state textures so the new one becomes the current one
        var temp = this.particleStateTexture0;
        this.particleStateTexture0 = this.particleStateTexture1;
        this.particleStateTexture1 = temp;
    };

    return WindGL;
})));
