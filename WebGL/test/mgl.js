const FADEOPACITY = 0.996; // how fast the particle trails fade on each frame
const SPEEDFACTOR = 0.5; // how fast the particles move
const DROPRATE = 0.003; // how often the particles move to a random place
const DROPRATEBUMP = 0.01; // drop rate increase relative to individual particle speed
const PARTICLESRADIX = 256; //num = particlesRadix*particlesRadix

const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_INDEX_FRAME = 2;
const TEXTURE_INDEX_PARTICLES = 3;

const func = {
    between:`float between(float min,float max,float val){return (val-min)/(max-min);}`,
    tilePos:`vec2 tilePos(vec2 pos){vec4 p0 = u_matrix_invert*vec4(pos,0,1);vec4 p1 = u_matrix_invert*vec4(pos,1,1);p0 = p0/p0.w;p1 = p1/p1.w;float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);return mix(p0,p1,t).xy;}`,
    geoPos:`vec2 geoPos(vec2 pos){float lon = mix(-180.0,180.0,pos.x);float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));return vec2(lon,lat);}`,
    coord:`vec2 coord(vec2 pos){return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));}`,
    valid:`bool valid(vec2 pos){return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;}`,
};

const drawVert = `
attribute float a_index;
uniform sampler2D u_particles;
uniform float u_particles_radix;
varying vec2 v_pos;
void main() {
    vec4 coord = texture2D(u_particles, vec2(fract(a_index / u_particles_radix),floor(a_index / u_particles_radix) / u_particles_radix));
    v_pos = vec2(coord.x+coord.z/255.0,coord.y+coord.w/255.0)*2.0-1.0;
    gl_PointSize = 1.0;
    gl_Position = vec4(v_pos, 0, 1);
}`;

const drawFrag = `
precision mediump float;
const float PREC = 255.0/250.0;
uniform mat4 u_matrix_invert;
uniform sampler2D u_data;
uniform vec2 u_min;
uniform vec2 u_max;
uniform vec3 u_lon;
uniform vec3 u_lat;
uniform vec2 u_cmm;
uniform sampler2D u_color;
varying vec2 v_pos;
${func.between}
${func.tilePos}
${func.geoPos}
${func.valid}
${func.coord}
void main() {
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));
        if(valid(c)){
            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));
            float colorPos = between(u_cmm[0],u_cmm[1],val);
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));
        }
    }
}`;

const quadVert = `
precision mediump float;
attribute vec2 a_pos;
varying vec2 v_pos;
void main() {
    v_pos = a_pos;
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
}`;

const screenFrag = `
precision mediump float;
uniform sampler2D u_screen;
uniform float u_opacity;
varying vec2 v_pos;
void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_pos);
    // a hack to guarantee opacity fade out even with a value close to 1.0
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
}`;

const updateFrag = `
precision highp float;
const float PREC = 255.0/250.0;
uniform mat4 u_matrix_invert;
uniform mat4 u_matrix;
uniform float u_scale;
uniform sampler2D u_particles;
uniform sampler2D u_data;
uniform vec2 u_min;
uniform vec2 u_max;
uniform vec3 u_lon;
uniform vec3 u_lat;
uniform float u_rand_seed;
uniform float u_speed_factor;
uniform float u_drop_rate;
uniform float u_drop_rate_bump;
varying vec2 v_pos;
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float random(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}
${func.between}
${func.tilePos}
${func.geoPos}
${func.valid}
${func.coord}
void main() {
    vec4 point = texture2D(u_particles, v_pos);
    vec2 pos = vec2(point.x+point.z/255.0,point.y+point.w/255.0);
    vec2 tp = tilePos(pos*2.0-1.0);
    vec2 seed = (pos+v_pos) * u_rand_seed;
    vec2 re = vec2(random(seed + 1.3),random(seed + 2.1));
    if(tp.y>=0.0&&tp.y<=1.0){
        vec2 geo = geoPos(tp);
        vec2 c = coord(geo);
        if(valid(c)){
            vec2 uv = mix(u_min,u_max,texture2D(u_data, c).xy*PREC);
            float drop_rate = u_drop_rate + length(uv) / length(u_max) * u_drop_rate_bump;
            float drop = step(1.0 - drop_rate, random(seed));
            vec2 offset = vec2(uv.x/cos(radians(geo.y)), -uv.y) * 0.0001 * u_speed_factor;
            vec4 target = u_matrix*vec4(tp+offset,0,1);
            vec2 t = (target.xy/target.w+1.0)/2.0;
            t = mix(pos,t,min(1.0,u_scale/exp2(u_scale)));
            if(valid(t))
                re = mix(t,re,drop);
        }
    }
    gl_FragColor = vec4(floor(re * 255.0) / 255.0,fract(re * 255.0));
}`;
class Mgl{

    constructor(map) {
        this.map = map;
        this.pxRatio = window.devicePixelRatio === 1?2:1;
        // this.pxRatio = Math.max(Math.floor(window.devicePixelRatio)||1, 2);
        // this.pxRatio = 1;//window.devicePixelRatio;
        this._init();
        this._initGL();
    }

    load(url){
        MeteoImage.load(url).then((meteo)=>{
            this.meteo=meteo;
            // 形成数据纹理
            createTexture(this.gl,this.gl.LINEAR, meteo.data,meteo.width,meteo.height,TEXTURE_INDEX_DATA);
            // console.log(meteo);
            this.uniform.u_min = [meteo.minAndMax[0][0],meteo.minAndMax[1][0]];
            this.uniform.u_max = [meteo.minAndMax[0][1],meteo.minAndMax[1][1]];
            this.uniform.u_lon = meteo.lon;
            this.uniform.u_lat = meteo.lat;
        });
    }

    play(){
        const _this = this;
        frame();
        function frame(){
            _this._render();
            _this._animateHandle =requestAnimationFrame(frame);
        }
    }

    stop(){
        if(this._animateHandle){
            cancelAnimationFrame(this._animateHandle);
            delete this._animateHandle;
        }
        this.gl.clearColor(0,0,0,0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this.canvas = document.createElement("canvas");
        this.gl = canvas.getContext("webgl", {antialiasing: false});
        canvas.style.cssText= mapCanvas.style.cssText;
        canvas.style.pointerEvents= 'none';
        canvas.width = mapCanvas.width*this.pxRatio; // todo:*this.pxRatio?
        canvas.height = mapCanvas.height*this.pxRatio;
        div.appendChild(canvas);
        map.on('resize',(e)=>{
            const mc = e.target.getCanvas();
            canvas.style.width= mc.style.width;
            canvas.style.height= mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width*this.pxRatio;
            canvas.height = mc.height*this.pxRatio;
            this.resize();
        });
        map.on('move',(e)=>{
            // this._render();
        });
        map.on('load',()=>{
            // this._render();
        });
    }

    _initGL() {
        const gl = this.gl;
        this.fadeOpacity = FADEOPACITY; // how fast the particle trails fade on each frame
        this.speedFactor = SPEEDFACTOR; // how fast the particles move
        this.dropRate = DROPRATE; // how often the particles move to a random place
        this.dropRateBump = DROPRATEBUMP; // drop rate increase relative to individual particle speed
        this.particlesRadix = PARTICLESRADIX;
        //初始化program
        const drawVertShader = createShader(gl, gl.VERTEX_SHADER, drawVert);
        const drawFragShader = createShader(gl, gl.FRAGMENT_SHADER, drawFrag);
        const screenVertShader = createShader(gl, gl.VERTEX_SHADER, quadVert);
        const screenFragShader = createShader(gl, gl.FRAGMENT_SHADER, screenFrag);
        const updateVertShader = createShader(gl, gl.VERTEX_SHADER, quadVert);
        const updateFragShader = createShader(gl, gl.FRAGMENT_SHADER, updateFrag);
        this.program = {};
        this.program.draw = createProgram(gl, drawVertShader, drawFragShader);
        this.program.screen = createProgram(gl, screenVertShader, screenFragShader);
        this.program.update = createProgram(gl, updateVertShader, updateFragShader);
        this.texture = {};
        this.buffer = {};
        this.uniform = {};
        //初始化静态信息
        this.buffer.quad = createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        this.framebuffer = gl.createFramebuffer();
        this.particlesBuffer = gl.createFramebuffer();
        //生成初始化例子纹理
        this._initParticles(this.particlesRadix);
        this.resize();
    }

    setColor(color){
        const color2D = createColorRamp(color);
        createTexture(this.gl,this.gl.LINEAR,color2D,color2D.length/4,1,TEXTURE_INDEX_COLOR);
        this.uniform.u_cmm = new Float32Array([color[0][0],color[color.length-1][0]]);
        return this;
    }

    resize(){
        const gl = this.gl;
        const ps = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
        this.texture.frame = createTexture(gl, gl.NEAREST, ps, gl.canvas.width, gl.canvas.height);
        this.texture.frame_last = createTexture(gl, gl.NEAREST, ps, gl.canvas.width, gl.canvas.height);
    }

    _initParticles(num){
        const l = Math.pow(num,2);
        this.uniform.u_count = l;
        const data = new Uint8Array(l * 4);
        for (let i = 0; i < l; i++) {
            data[i] = Math.floor(Math.random() * 256);
        }
        this.texture.u_particles = createTexture(this.gl, this.gl.NEAREST, data, num, num);
        this.texture.u_particles_next = createTexture(this.gl, this.gl.NEAREST, data, num, num);
        const a_index = new Float32Array(l);
        for (let m = 0; m < l; m++)a_index[m]=m;
        this.buffer.a_index = createBuffer(this.gl, a_index);
    }

    _render(){
        if(!this.meteo)return;
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        this._drawScreen();
        this._updateParticles();
    }

    _drawScreen(){
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        bindFramebuffer(gl, this.framebuffer, this.texture.frame);
        this._drawTexture(this.texture.frame_last, this.fadeOpacity);
        this._drawParticles();
        bindFramebuffer(gl, null);
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this._drawTexture(this.texture.frame, 1.0);
        // gl.disable(gl.BLEND);
        this.texture.frame = [this.texture.frame_last,this.texture.frame_last=this.texture.frame][0];
    }

    _drawTexture(texture, opacity){
        const gl = this.gl;
        const program = this.program.screen;
        gl.useProgram(program);
        bindAttribute(gl, this.buffer.quad, program.a_pos, 2);
        bindTexture(gl, texture, TEXTURE_INDEX_FRAME);
        gl.uniform1i(program.u_screen, TEXTURE_INDEX_FRAME);
        gl.uniform1f(program.u_opacity, opacity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _drawParticles(){
        const gl = this.gl;
        const program = this.program.draw;
        gl.useProgram(program);
        //绑定索引
        bindAttribute(gl, this.buffer.a_index, program.a_index, 1);
        //颜色
        gl.uniform1i(program.u_color, TEXTURE_INDEX_COLOR);
        gl.uniform2fv(program.u_cmm,this.uniform.u_cmm);
        gl.uniform1i(program.u_data, TEXTURE_INDEX_DATA);
        bindTexture(gl, this.texture.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1i(program.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1f(program.u_particles_radix, this.particlesRadix);
        gl.uniform2fv(program.u_min, this.uniform.u_min);
        gl.uniform2fv(program.u_max, this.uniform.u_max);
        gl.uniform3fv(program.u_lon, this.uniform.u_lon);
        gl.uniform3fv(program.u_lat, this.uniform.u_lat);
        gl.uniformMatrix4fv(program.u_matrix_invert, false, this._matrixInvert());
        gl.drawArrays(gl.POINTS, 0, this.uniform.u_count);
    }

    _updateParticles(){
        const gl = this.gl;
        bindFramebuffer(gl, this.particlesBuffer, this.texture.u_particles_next);
        gl.viewport(0, 0, this.particlesRadix, this.particlesRadix);
        const program = this.program.update;
        gl.useProgram(program);
        bindAttribute(gl, this.buffer.quad, program.a_pos, 2);
        gl.uniform1i(program.u_data, TEXTURE_INDEX_DATA);
        bindTexture(gl, this.texture.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1i(program.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1f(program.u_particles_radix, this.particlesRadix);
        gl.uniform2fv(program.u_min, this.uniform.u_min);
        gl.uniform2fv(program.u_max, this.uniform.u_max);
        gl.uniform3fv(program.u_lon, this.uniform.u_lon);
        gl.uniform3fv(program.u_lat, this.uniform.u_lat);
        //地图相关
        gl.uniformMatrix4fv(program.u_matrix, false, this._matrix());
        gl.uniformMatrix4fv(program.u_matrix_invert, false, this._matrixInvert());
        gl.uniform1f(program.u_scale, map.getZoom());
        gl.uniform1f(program.u_speed_factor, this.speedFactor);
        gl.uniform1f(program.u_drop_rate, this.dropRate);
        gl.uniform1f(program.u_drop_rate_bump, this.dropRateBump);
        gl.uniform1f(program.u_rand_seed, Math.random());
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.texture.u_particles = [this.texture.u_particles_next,this.texture.u_particles_next=this.texture.u_particles][0];
        bindFramebuffer(gl, null);
    }

    _matrix(){
        const scale = this.map.transform.worldSize;
        const matrix = mat4.identity(new Float32Array(16));
        mat4.scale(matrix, matrix, [scale, scale, 1]);
        mat4.multiply(matrix,this.map.transform.projMatrix, matrix);
        return matrix;
    }

    _matrixInvert(){
        return mat4.invert(new Float32Array(16),this._matrix());
    }
}
