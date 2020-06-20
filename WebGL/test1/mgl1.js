const FADEOPACITY = 0.996; // how fast the particle trails fade on each frame
const SPEEDFACTOR = 2.0; // how fast the particles move
const DROPRATE = 0.003; // how often the particles move to a random place
const DROPRATEBUMP = 0.01; // drop rate increase relative to individual particle speed
const PARTICLESRADIX = 256; //num = particlesRadix*particlesRadix

const TEXTURE_INDEX_COLOR = 0;      // 色卡纹理
const TEXTURE_INDEX_DATA = 1;       // 数据纹理
const TEXTURE_INDEX_FRAME = 2;      // 屏幕纹理
const TEXTURE_INDEX_PARTICLES = 3;  // 粒子纹理

const func = {
    between:`
    float between(float min,float max,float val){
        return (val-min)/(max-min);
    }`,
    tilePos:`
    vec2 tilePos(vec2 pos){
        vec4 p0 = u_matrix_invert*vec4(pos,0,1);
        vec4 p1 = u_matrix_invert*vec4(pos,1,1);
        p0 = p0/p0.w;p1 = p1/p1.w;
        float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
        return mix(p0,p1,t).xy;
    }`,
    geoPos:`
    vec2 geoPos(vec2 pos){
        float lon = mix(-180.0,180.0,pos.x);
        float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
        return vec2(lon,lat);
    }`,
    coord:`
    vec2 coord(vec2 pos){
        return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
    }`,
    valid:`
    bool valid(vec2 pos){
        return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
    }`,
    unpackDepth:`
    float unpackDepth(const in vec4 rgbaDepth) {
        const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
        float depth = dot(rgbaDepth, bitShift);
        return depth;
    }`,
};

const drawVert = `
attribute float a_index;                // 各粒子索引
uniform sampler2D u_particles;          // 粒子纹理单元=3  256*256的画在canvas的大小上，所以要变换
uniform float u_particles_radix;        // 粒子基数=256，粒子纹理的长宽
varying vec2 v_pos;
void main() {
    // fixme：先算出每个纹理坐标，再通过纹理得到像素值，从而得到每个粒子的位置坐标
    // fixme:s取的假分数的小数部分，t取的假分数的整数部分占总高度的份额
    vec4 coord = texture2D(u_particles, vec2(fract(a_index / u_particles_radix),floor(a_index / u_particles_radix) / u_particles_radix));
//    v_pos = vec2(coord.x+coord.z/255.0,coord.y+coord.w/255.0)*2.0-1.0;   // 因为存在u_particles纹理中的值是0-1范围的，所以2x-1转成-1~1的范围
    v_pos = vec2(coord.x*255.0*256.0+coord.z*255.0,coord.y*255.0*256.0+coord.w*255.0)/65535.0*2.0-1.0;
    gl_PointSize = 1.0;
    gl_Position = vec4(v_pos, 0, 1);
}`;

const drawFrag = `
precision mediump float;
const float PREC = 255.0/254.0;
uniform mat4 u_matrix_invert;    // 顺带把顶点坐标反转成和图片对应的了
uniform sampler2D u_data;       //  图片纹理单元=1
uniform sampler2D u_color;      //  色卡纹理单元=0
uniform vec2 u_min;             // 各通道像素最小值
uniform vec2 u_max;             // 各通道像素最大值
uniform vec3 u_lon;             // 经度最小值、最大值、步长
uniform vec3 u_lat;             // 纬度最小值、最大值、步长
uniform vec2 u_cmm;             // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
varying vec2 v_pos;
${func.between}
${func.tilePos}
${func.geoPos}
${func.valid}
${func.coord}
void main() {
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
        if(valid(c)){
            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));  // 通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);                    // 通过色卡横坐标val得到色卡纹理坐标
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));               // 得到色卡颜色，即相应点的颜色
        }
    }
}`;

const quadVert = `
precision mediump float;
attribute vec2 a_pos;       // 传进来的是从[0,0]到[1,1]的范围，不是从[-1,-1]到[1,1]的范围，所以下面要转换
varying vec2 v_pos;
void main() {
    v_pos = a_pos;
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);    // 从0~1转到1~-1，不是-1~1，因为图片是反转的，所以这里对应一下
}`;

const screenFrag = `
precision mediump float;
uniform sampler2D u_screen;     // 屏幕纹理单元=2
uniform float u_opacity;
varying vec2 v_pos;
void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_pos);      // 跟顶点坐标一样反过来
    // a hack to guarantee opacity fade out even with a value close to 1.0
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
}`;

const updateFrag = `
precision mediump float;
const float PREC = 255.0/254.0;
uniform mat4 u_matrix_invert;     // 顺带把顶点坐标反转成和图片对应的了
uniform mat4 u_matrix;
uniform float u_scale;             // 地图的zoom层
uniform float u_pitch;             // 地图的俯角
uniform float u_bearing;           // 地图的旋转角
uniform sampler2D u_particles;    // 粒子纹理单元=3
uniform sampler2D u_data;        //  图片纹理单元=1
uniform vec2 u_min;              // 各通道像素最小值
uniform vec2 u_max;              // 各通道像素最大值
uniform vec3 u_lon;              // 经度最小值、最大值、步长
uniform vec3 u_lat;              // 纬度最小值、最大值、步长
uniform float u_rand_seed;       // todo:随机数0-1
uniform float u_speed_factor;    // todo:粒子移动多快=0.5
uniform float u_drop_rate;       // todo:粒子移到随机位置的频率=0.003
uniform float u_drop_rate_bump;  // todo:相对于各个粒子速度的降落增加率=0.01
varying vec2 v_pos;
const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
//const vec4 bitShift = vec4(1.0, float(1<<8), float(1<<16), float(1<<24));
//const vec4 bitMask = vec4(float(1>>8), float(1>>8), float(1>>8), 0.0);
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float random(const vec2 co) {       // 伪随机数
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}
${func.between}
${func.tilePos}
${func.geoPos}
${func.valid}
${func.coord}
${func.unpackDepth}
void main() {
    vec4 point = texture2D(u_particles, v_pos);     // 没反转v_pos，因为u_particles纹理的方向跟v_pos一样
//    vec2 pos = vec2(point.x+point.z/255.0,point.y+point.w/255.0);
    vec2 pos = vec2((point.x*256.0*255.0+point.z*255.0),(point.y*256.0*255.0+point.w*255.0))/65535.0;
    vec2 tp = tilePos(pos*2.0-1.0);             // 线性混合粒子坐标
    vec2 seed = (pos+v_pos) * u_rand_seed;      // a random seed to use for the particle drop
    vec2 re = vec2(random(seed + 1.3),random(seed + 2.1));
    if(tp.y>=0.0&&tp.y<=1.0){
        vec2 geo = geoPos(tp);  // 经纬度
        vec2 c = coord(geo);    // 图片纹理坐标
        if(valid(c)){
            vec2 uv = mix(u_min,u_max,texture2D(u_data, c).xy*PREC);    //  通过图片的纹理坐标c获得各通道像素值,然后线性混合，得到风uv值
            // drop rate is a chance a particle will restart at random position, to avoid degeneration
            float drop_rate = u_drop_rate + length(uv) / length(u_max) * u_drop_rate_bump;
            float drop = step(1.0 - drop_rate, random(seed));
            /*vec2 offset = vec2(uv.x/cos(radians(geo.y)), -uv.y) * 0.0001 * u_speed_factor; 
            vec4 target = u_matrix*vec4(tp+offset,0,1); 
            vec2 t = (target.xy/target.w+1.0)/2.0;
            t = mix(pos,t,min(1.0,u_scale/exp2(u_scale)));
            if(valid(t)){
                re = mix(t,re,drop);
            }
             */ 
             /*vec2 offset = vec2(uv.x/cos(radians(geo.y)), -uv.y);
            vec4 target =u_matrix*vec4(offset,0,1);
            vec2 t = pos+(target.xy/target.w+1.0)/(65535.0*2.0);
            t = mix(pos,t,min(1.0,u_scale/exp2(u_scale)));
            if(valid(t)){
                re = mix(t,re,drop);
            }  */  
            float uFrom=uv.x/cos(radians(geo.y));
            float vFrom=uv.y;
            float uTo=uFrom*cos(radians(u_bearing))-vFrom*sin(radians(u_bearing));
            float vTo=uFrom*sin(radians(u_bearing))+vFrom*cos(radians(u_bearing));
            vec2 target =vec2(uTo,vTo*cos(radians(u_pitch)))*u_speed_factor;
            vec2 t = pos+(target.xy+1.0)/(65535.0*2.0);
            if(valid(t)){
                re = mix(t,re,drop);
            }           
        }
    }
    //    gl_FragColor = vec4(floor(re * 255.0) / 255.0,fract(re * 255.0));
    vec2 val1=floor(re * 65535.0 / 256.0);
    vec2 val2=re*65535.0-val1*256.0;
    gl_FragColor = vec4(val1/255.0,val2/255.0);
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
            requestAnimationFrame(frame);
        }
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
            /*const matrix = mat4.identity(new Float32Array(4));
            mat4.multiply(matrix,this._matrix(), new Float32Array([0.1,0.2,0,1]));
            console.log(matrix[0]/matrix[3],matrix[1]/matrix[3]);*/
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
        this.particlesRadix = PARTICLESRADIX;   // 粒子基数
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
        const ps = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);   // todo:随后这里会是什么值   // 空像素值，全是0
        this.texture.frame = createTexture(gl, gl.NEAREST, ps, gl.canvas.width, gl.canvas.height);
        this.texture.frame_last = createTexture(gl, gl.NEAREST, ps, gl.canvas.width, gl.canvas.height);
    }

    _initParticles(num){
        const l = Math.pow(num,2);
        this.uniform.u_count = l;           // 画多少个点，256*256=65536个，不应该写uniform，会误导
        const data = new Uint8Array(l * 4);
        for (let i = 0; i < l; i++) {        // todo:随后这里会是什么值？     // 随机设置粒子的像素值==>这里设置的是坐标xyzw
            data[i] = Math.floor(Math.random() * 255);      // todo:为什么是256而不是255
        }
        this.texture.u_particles = createTexture(this.gl, this.gl.NEAREST, data, num, num);
        this.texture.u_particles_next = createTexture(this.gl, this.gl.NEAREST, data, num, num);
        const a_index = new Float32Array(l);
        for (let m = 0; m < l; m++){                        // 设置各粒子的索引
            a_index[m]=m;
        }
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
        this.texture.frame = [this.texture.frame_last,this.texture.frame_last=this.texture.frame][0];   // 对调this.texture.frame_last和this.texture.frame
    }

    _drawTexture(texture, opacity){     // todo:获取屏幕的像素，然后做透明度处理再保存进帧缓冲区
        const gl = this.gl;
        const program = this.program.screen;
        gl.useProgram(program);
        bindAttribute(gl, this.buffer.quad, program.a_pos, 2);
        bindTexture(gl, texture, TEXTURE_INDEX_FRAME);
        gl.uniform1i(program.u_screen, TEXTURE_INDEX_FRAME);
        gl.uniform1f(program.u_opacity, opacity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _drawParticles(){                   // todo:画粒子到屏幕上
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
        gl.viewport(0, 0, this.particlesRadix, this.particlesRadix);    // 画256*256大小
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
        gl.uniform1f(program.u_pitch, map.getPitch());
        gl.uniform1f(program.u_bearing, map.getBearing());
        gl.uniform1f(program.u_speed_factor, this.speedFactor);
        gl.uniform1f(program.u_drop_rate, this.dropRate);
        gl.uniform1f(program.u_drop_rate_bump, this.dropRateBump);
        gl.uniform1f(program.u_rand_seed, Math.random());
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.texture.u_particles = [this.texture.u_particles_next,this.texture.u_particles_next=this.texture.u_particles][0];   // 对调this.texture.u_particles_next和this.texture.u_particles
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
