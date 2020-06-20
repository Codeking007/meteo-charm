// fixme:这套用的ui项目的
// fixme:全部都是highp，要不手机计算精度不行，显示不出来
// fixme:if(valid(c)){  改成  if(valid(c)&&texture2D(u_data, c).a==1.0){，要不有的地方没数据还显示
// fixme:不用高清屏window.devicePixelRatio
// fixme:PARTICLESRADIX等5个参数都稍微调了下,移到了meteo.ts的style对象中了，这样就能随时改变了
// fixme:在loadMeteo()把5个参数重新赋值了
// fixme:this.uniform=new Uniform();初始化方法从_initParticles()移到构造方法中了
import imagegl from "./image";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "./gl";

/*const FADEOPACITY = 0.996; // how fast the particle trails fade on each frame
const SPEEDFACTOR = 6.0; // how fast the particles move
const DROPRATE = 0.003; // how often the particles move to a random place
const DROPRATEBUMP = 0.01; // drop rate increase relative to individual particle speed
const PARTICLESRADIX = 64; //num = particlesRadix*particlesRadix*/

const FADEOPACITY = 0.995; // how fast the particle trails fade on each frame
const SPEEDFACTOR = 1 / 600; // how fast the particles move
const DROPRATE = 0.003; // how often the particles move to a random place
const DROPRATEBUMP = 0.01; // drop rate increase relative to individual particle speed
const PARTICLESRADIX = 80; //num = particlesRadix*particlesRadix

const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_INDEX_FRAME = 2;
const TEXTURE_INDEX_PARTICLES = 3;

const drawVert = `
attribute float a_index;
uniform sampler2D u_particles;
uniform float u_particles_radix;
varying vec2 v_pos;
void main() {
    vec4 coord = texture2D(u_particles, vec2(mod(a_index,u_particles_radix)/(u_particles_radix-1.0),floor(a_index / u_particles_radix) / (u_particles_radix-1.0)));
    v_pos = vec2(coord.x*256.0+coord.z,coord.y*256.0+coord.w)/257.0*2.0-1.0;
    gl_PointSize = 1.0;
    gl_Position = vec4(v_pos, 0, 1);
}`;

const drawFrag = `
precision highp float;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
const float PREC = 255.0/254.0;
uniform vec3 u_matrix_invert;    // 顺带把顶点坐标反转成和图片对应的了
uniform vec3 u_translate_scale;
uniform vec4 u_current_bounds;
uniform vec2 u_view;
uniform sampler2D u_data;       //  图片纹理单元=1
uniform sampler2D u_color;      //  色卡纹理单元=0
uniform vec2 u_min;             // 各通道像素最小值
uniform vec2 u_max;             // 各通道像素最大值
uniform vec3 u_lon;             // 经度最小值、最大值、步长
uniform vec3 u_lat;             // 纬度最小值、最大值、步长
uniform vec2 u_cmm;             // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
varying vec2 v_pos;
float between(float min,float max,float val){
    return (val-min)/(max-min);
}  
vec2 coord(vec2 pos){
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
float asinD3(float x) {
  return (x > 1.0 ? halfPi : x) < -1.0 ? -halfPi : asin(x);
}
vec2 projectRotateTransformInvert1(vec2 point){
    // 1-1==>x = b.invert(x, y)
    vec2 x=vec2((point.x - u_translate_scale[0]) / u_translate_scale[2], (u_translate_scale[1] - point.y) / u_translate_scale[2]);
    // 1-2==>x && a.invert(x[0], x[1])
    vec2 invert1;
    /*if(x!=null){*/
        float z = length(x);
        float c = asinD3(z);
        float sc = sin(c);
        float cc = cos(c);
        invert1=vec2(atan(x[0] * sc, z * cc),asinD3((z!=0.0) ? (x[1] * sc / z) : z));
    /*}else{
        invert1=x;
    }*/
    return invert1;
}
vec2 projectRotateTransformInvert2(vec2 invert1){
    vec2 invert2;
    // 2-1==>x = b.invert(x, y)
    float deltaPhi=radians(u_matrix_invert[1]);
    float deltaGamma=radians(u_matrix_invert[2]);
    
    float cosDeltaPhi = cos(deltaPhi);
    float sinDeltaPhi = sin(deltaPhi);
    float cosDeltaGamma = cos(deltaGamma);
    float sinDeltaGamma = sin(deltaGamma);
    
    float cosPhi = cos(invert1[1]);
    float x = cos(invert1[0]) * cosPhi;
    float y = sin(invert1[0]) * cosPhi;
    float z = sin(invert1[1]);
    float k = z * cosDeltaGamma - y * sinDeltaGamma;
    invert1=vec2(atan(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),asinD3(k * cosDeltaPhi - x * sinDeltaPhi));
    
    // 2-2==>x && a.invert(x[0], x[1])
    /*if(invert1!=null){*/
    float deltaLambda=radians(u_matrix_invert[0])*(-1.0);
        invert1[0] += deltaLambda;
        invert2=vec2((((invert1[0] > PI) ? (invert1[0] - PI*2.0):(invert1[0]))<-PI)?(invert1[0]+PI*2.0):(invert1[0]),invert1[1]);
    /*}else{
        invert2=invert1;
    }*/
    return invert2;
}
vec2 orthographicProjectionInvert(vec2 point){  // 像素点转换成经纬度
    // (1)==>point = projectRotateTransform.invert(point[0], point[1]);
    // 1==>x = b.invert(x, y)
    vec2 invert1=projectRotateTransformInvert1(point);
    // 2==>x && a.invert(x[0], x[1])
    vec2 invert2=projectRotateTransformInvert2(invert1);
    // (2)==>point && [point[0] * degrees, point[1] * degrees]
    vec2 lon_lat;
    /*if(invert2!=null){*/
        lon_lat=degrees(invert2);
    /*}else{
        lon_lat=invert2;
    }*/
    return lon_lat;
}
void main() {
    vec2 texture_point=(v_pos+1.0)/2.0;
    vec2 current_pos=vec2(texture_point.x,1.0-texture_point.y)*u_view;
    // fixme:是否在正方形内
    if(current_pos.x>=u_current_bounds[0]&&current_pos.x<=u_current_bounds[1]&&current_pos.y>=u_current_bounds[2]&&current_pos.y<=u_current_bounds[3]){
        // fixme:像素点转换成经纬度(正方形就变成圆形了)
        vec2 lon_lat=orthographicProjectionInvert(current_pos);
        vec2 c = coord(lon_lat);
        if(valid(c)&&texture2D(u_data, c).a==1.0){
            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));  // 通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);                    // 通过色卡横坐标val得到色卡纹理坐标
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));               // 得到色卡颜色，即相应点的颜色
        }
    }
}`;

const quadVert = `
precision highp float;
attribute vec2 a_pos;       // 传进来的是从[0,0]到[1,1]的范围，不是从[-1,-1]到[1,1]的范围，所以下面要转换
varying vec2 v_pos;
void main() {
    v_pos = a_pos;
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);    // 从0~1转到1~-1，不是-1~1，因为图片是反转的，所以这里对应一下
}`;

const screenFrag = `
precision highp float;
uniform sampler2D u_screen;     // 屏幕纹理单元=2
uniform float u_opacity;
varying vec2 v_pos;
void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_pos);      // 跟顶点坐标一样反过来
    // a hack to guarantee opacity fade out even with a value close to 1.0
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
}`;

const updateFrag = `
precision highp float;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
const float PREC = 255.0/254.0;
uniform vec3 u_matrix_invert;
uniform vec3 u_translate_scale;
uniform vec4 u_current_bounds;
uniform vec2 u_view;
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
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
const float H=0.0000360;
float random(const vec2 co) {       // 伪随机数
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
vec2 coord(vec2 pos){
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
vec2 sum(vec2 point,float val){
     if(point.y + val > 1.0){
            point.x += 1.0/255.0;
            point.y += val - 256.0/255.0;
        }else if(point.y + val < 0.0){
            point.x -= 1.0/255.0;
            point.y += val + 256.0/255.0;
        }else{
            point.y += val;
        }
    return point;
}
vec4 random4(const vec2 seed){
    vec2 re = vec2(random(seed + 1.3),random(seed + 2.1));
    vec2 val1=floor(re * 65535.0 / 256.0);
    vec2 val2=re*65535.0-val1*256.0;
    return vec4(val1/255.0,val2/255.0);
}
float asinD3(float x) {
  return (x > 1.0 ? halfPi : x) < -1.0 ? -halfPi : asin(x);
}
vec2 projectRotateTransformInvert1(vec2 point){
    // 1-1==>x = b.invert(x, y)
    vec2 x=vec2((point.x - u_translate_scale[0]) / u_translate_scale[2], (u_translate_scale[1] - point.y) / u_translate_scale[2]);
    // 1-2==>x && a.invert(x[0], x[1])
    vec2 invert1;
    /*if(x!=null){*/
        float z = length(x);
        float c = asinD3(z);
        float sc = sin(c);
        float cc = cos(c);
        invert1=vec2(atan(x[0] * sc, z * cc),asinD3((z!=0.0) ? (x[1] * sc / z) : z));
    /*}else{
        invert1=x;
    }*/
    return invert1;
}
vec2 projectRotateTransformInvert2(vec2 invert1){
    vec2 invert2;
    // 2-1==>x = b.invert(x, y)
    float deltaPhi=radians(u_matrix_invert[1]);
    float deltaGamma=radians(u_matrix_invert[2]);
    
    float cosDeltaPhi = cos(deltaPhi);
    float sinDeltaPhi = sin(deltaPhi);
    float cosDeltaGamma = cos(deltaGamma);
    float sinDeltaGamma = sin(deltaGamma);
    
    float cosPhi = cos(invert1[1]);
    float x = cos(invert1[0]) * cosPhi;
    float y = sin(invert1[0]) * cosPhi;
    float z = sin(invert1[1]);
    float k = z * cosDeltaGamma - y * sinDeltaGamma;
    invert1=vec2(atan(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),asinD3(k * cosDeltaPhi - x * sinDeltaPhi));
    
    // 2-2==>x && a.invert(x[0], x[1])
    /*if(invert1!=null){*/
    float deltaLambda=radians(u_matrix_invert[0])*(-1.0);
        invert1[0] += deltaLambda;
        invert2=vec2((((invert1[0] > PI) ? (invert1[0] - PI*2.0):(invert1[0]))<-PI)?(invert1[0]+PI*2.0):(invert1[0]),invert1[1]);
    /*}else{
        invert2=invert1;
    }*/
    return invert2;
}
vec2 orthographicProjectionInvert(vec2 point){  // 像素点转换成经纬度
    // (1)==>point = projectRotateTransform.invert(point[0], point[1]);
    // 1==>x = b.invert(x, y)
    vec2 invert1=projectRotateTransformInvert1(point);
    // 2==>x && a.invert(x[0], x[1])
    vec2 invert2=projectRotateTransformInvert2(invert1);
    // (2)==>point && [point[0] * degrees, point[1] * degrees]
    vec2 lon_lat;
    /*if(invert2!=null){*/
        lon_lat=degrees(invert2);
    /*}else{
        lon_lat=invert2;
    }*/
    return lon_lat;
}
 
vec2 projectRotateTransform1(vec2 lon_lat){  
    // 1-1==>a(x, y)==>forwardRotationLambda(deltaLambda)
    float deltaLambda=radians(u_matrix_invert[0]);
    lon_lat[0] += deltaLambda;
    vec2 forwardRotationLambda=vec2( ( ((lon_lat[0] > PI) ? (lon_lat[0] - PI*2.0):(lon_lat[0])) <-PI) ?(lon_lat[0]+PI*2.0):(lon_lat[0]),lon_lat[1]);
    
    // 1-2==>b(x[0], x[1])==>rotationPhiGamma(deltaPhi, deltaGamma).rotation(lambda, phi)
    float deltaPhi=radians(u_matrix_invert[1]);
    float deltaGamma=radians(u_matrix_invert[2]);
    
    float cosDeltaPhi = cos(deltaPhi);
    float sinDeltaPhi = sin(deltaPhi);
    float cosDeltaGamma = cos(deltaGamma);
    float sinDeltaGamma = sin(deltaGamma);

    float cosPhi = cos(forwardRotationLambda[1]);
    float x = cos(forwardRotationLambda[0]) * cosPhi;
    float y = sin(forwardRotationLambda[0]) * cosPhi;
    float z = sin(forwardRotationLambda[1]);
    float k = z * cosDeltaPhi + x * sinDeltaPhi;
    vec2 rotationPhiGamma=vec2(atan(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),asinD3(k * cosDeltaGamma + y * sinDeltaGamma));
    return rotationPhiGamma;
}
vec2 projectRotateTransform2(vec2 projection1){
    // 2-1==>a(x, y)==>orthographicRaw(x, y)
    vec2 orthographicRaw=vec2(cos(projection1.y) * sin(projection1.x), sin(projection1.y));
    // 2-2==>b(x[0], x[1])==>scaleTranslate(k, dx, dy).transform(x, y)
    vec2 transform=vec2(u_translate_scale[0] + u_translate_scale[2] * orthographicRaw.x, u_translate_scale[1] - u_translate_scale[2] * orthographicRaw.y);
    return transform;
}
vec2 orthographicProjection(vec2 lon_lat){       // 经纬度转换为像素点
    vec2 projection1=projectRotateTransform1(radians(lon_lat));
    vec2 projection2=projectRotateTransform2(projection1);
    return projection2;
}
vec4 distortion(float lon,float lat,float x,float y) {
    float hLon = lon < 0.0 ? H : -H;
    float hLat = lat < 0.0 ? H : -H;
    vec2 pLon = orthographicProjection(vec2(lon + hLon, lat));   // 经纬度转换为像素点
    vec2 pLat = orthographicProjection(vec2(lon, lat + hLat));
    // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1° lon
    // changes depending on lat. Without this, there is a pinching effect at the poles.
    // 子午线比例因子:没有这个在南北极会出现挤压效应
    float k = cos(radians(lat));
    return vec4(
        (pLon[0] - x) / hLon / k,
        (pLon[1] - y) / hLon / k,
        (pLat[0] - x) / hLat,
        (pLat[1] - y) / hLat
    );
} 
vec2 distort(float lon,float lat,float x,float y,vec2 wind) {
    /*float u = wind[0] * u_speed_factor*(u_current_bounds[3]-u_current_bounds[2]+1.0);
    float v = wind[1] * u_speed_factor*(u_current_bounds[3]-u_current_bounds[2]+1.0);*/
    // fixme:把速度系数u_speed_factor放到外面去了
    float u = wind[0];
    float v = wind[1];
    vec4 d = distortion(lon, lat, x, y);
    
    // Scale distortion vectors by u and v, then add.
    vec2 scaleWind;
    scaleWind[0] = d[0] * u + d[2] * v;
    scaleWind[1] = d[1] * u + d[3] * v;
    // fixme:因为zoom越大投影算出来的速度越大，即单位时间内移动的距离越大，所以移动距离的最大限定要跟zoom层的大小有关，这里是zoom/100，这样就可以解决由于高版本d3的projection.invert()对任何像素点都能算出经纬度所导致计算边界点distort扭转距离过大导致错误的情况
    if (abs(scaleWind[0]) <= u_translate_scale[2] / 100.0 && abs(scaleWind[1]) <= u_translate_scale[2] / 100.0) {
        wind[0] = scaleWind[0];
        wind[1] = scaleWind[1];
    }
    return wind;
}
void main() {
    vec4 point = texture2D(u_particles, v_pos);     // 没反转v_pos，因为u_particles纹理的方向跟v_pos一样
    vec2 pos = vec2((point.x*256.0+point.z),(point.y*256.0+point.w))/257.0;
    vec2 seed = (pos+v_pos) * u_rand_seed;      // a random seed to use for the particle drop
    vec2 target=vec2(0.0,0.0);
    vec4 re = random4(seed);
    vec2 current_pos=vec2(pos.x,1.0-pos.y)*u_view;
    // fixme:是否在正方形内
    if(current_pos.x>=u_current_bounds[0]&&current_pos.x<=u_current_bounds[1]&&current_pos.y>=u_current_bounds[2]&&current_pos.y<=u_current_bounds[3]){
        // fixme:像素点转换成经纬度(正方形就变成圆形了)
        vec2 lon_lat=orthographicProjectionInvert(current_pos);
        vec2 c = coord(lon_lat);
        if(valid(c)&&texture2D(u_data, c).a==1.0){
            vec2 uv = mix(u_min,u_max,texture2D(u_data, c).xy*PREC);    //  通过图片的纹理坐标c获得各通道像素值,然后线性混合，得到风uv值
            float drop_rate = u_drop_rate + length(uv) / length(u_max) * u_drop_rate_bump;
            float drop = step(1.0 - drop_rate, random(seed));
            target=distort(lon_lat[0],lon_lat[1],current_pos.x,current_pos.y,uv)*u_speed_factor*(u_current_bounds[3]-u_current_bounds[2]+1.0);
            target=(target.xy+1.0)/(2.0);
            point.xz = sum(point.xz,target.x/255.0);
            point.yw = sum(point.yw,target.y/255.0);
            if(valid(vec2((point.x*256.0+point.z),(point.y*256.0+point.w))/257.0)){
                re = mix(point,re,drop);
            }
        }
    }
    gl_FragColor = re;
}`;

class Uniform {
    private _u_lat: any;
    private _u_lon: any;
    private _u_max!: any[];
    private _u_min!: any[];
    private _u_cmm!: Float32Array;
    private _u_count!: number;

    constructor() {

    }

    get u_lat(): any {
        return this._u_lat;
    }

    set u_lat(value: any) {
        this._u_lat = value;
    }

    get u_lon(): any {
        return this._u_lon;
    }

    set u_lon(value: any) {
        this._u_lon = value;
    }

    get u_max(): any[] {
        return this._u_max;
    }

    set u_max(value: any[]) {
        this._u_max = value;
    }

    get u_min(): any[] {
        return this._u_min;
    }

    set u_min(value: any[]) {
        this._u_min = value;
    }

    get u_cmm(): Float32Array {
        return this._u_cmm;
    }

    set u_cmm(value: Float32Array) {
        this._u_cmm = value;
    }

    get u_count(): number {
        return this._u_count;
    }

    set u_count(value: number) {
        this._u_count = value;
    }
}

export default class {
    private pxRatio: number;
    private meteo: any;
    private canvas!: any;
    private is2!: boolean;
    private wgl!: WebGL;
    private fadeOpacity!: number;
    private speedFactor!: number;
    private dropRate!: number;
    private dropRateBump!: number;
    private particlesRadix!: number;
    private gl!: WebGLRenderingContext;
    private updateProgram!: GLProgram;
    private screenProgram!: GLProgram;
    private drawProgram!: GLProgram;
    private buffer!: BufferObject;
    private uniform!: any;
    private framebuffer!: GLTwinsFbo;
    private particlesBuffer!: GLTwinsFbo;
    private animateHandle: number;
    private globe: any;
    private view: any;

    constructor(globe, view) {
        this.globe = globe;
        this.view = view;
        // this.pxRatio = window.devicePixelRatio === 1 ? 2 : 1;
        // this.pxRatio = Math.max(Math.floor(window.devicePixelRatio)||1, 2);
        this.pxRatio = 1;//window.devicePixelRatio;
        this.uniform = new Uniform(); // 常量配置
        this._init();
        this._initGL();
    }

    _init() {
        const canvas: any = this.canvas = document.getElementById("mgl");
        const params = {depth: false, stencil: false, antialias: false};
        let gl = this.gl = canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl = this.gl = canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        const wgl = this.wgl = new WebGL(gl);
        canvas.style.pointerEvents = 'none';
        canvas.style.width = this.view.width;
        canvas.style.height = this.view.height;
        canvas.width = this.view.width * this.pxRatio;
        canvas.height = this.view.height * this.pxRatio;
    }

    _initGL() {
        const gl = this.gl;
        this.fadeOpacity = FADEOPACITY; // how fast the particle trails fade on each frame
        this.speedFactor = SPEEDFACTOR; // how fast the particles move
        this.dropRate = DROPRATE; // how often the particles move to a random place
        this.dropRateBump = DROPRATEBUMP; // drop rate increase relative to individual particle speed
        this.particlesRadix = PARTICLESRADIX;   // 粒子基数
        //初始化program
        this.drawProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, drawVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, drawFrag));
        this.screenProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, quadVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, screenFrag));
        this.updateProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, quadVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, updateFrag));
        this.buffer = {};
        //初始化静态信息
        this.buffer.quad = this.wgl.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));

        //生成初始化例子纹理
        this._initParticles(this.particlesRadix);
        this.resize();
    }

    _initParticles(num) {
        const l = Math.pow(num, 2);
        // this.uniform=new Uniform();
        this.uniform.u_count = l;           // 画多少个点，256*256=65536个，不应该写uniform，会误导
        const data = new Uint8Array(l * 4);
        for (let i = 0; i < l; i++) {        // todo:随后这里会是什么值？     // 随机设置粒子的像素值==>这里设置的是坐标xyzw
            data[i] = Math.floor(Math.random() * 255);      // todo:为什么是256而不是255
        }
        this.particlesBuffer = this.wgl.createTwinsFbo(TEXTURE_INDEX_PARTICLES, num, num, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, data);
        const a_index = new Float32Array(l);
        for (let m = 0; m < l; m++) {                        // 设置各粒子的索引
            a_index[m] = m;
        }
        this.buffer.a_index = this.wgl.createBuffer(a_index);
    }

    resize() {
        const gl = this.gl;
        const ps = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);   // todo:随后这里会是什么值   // 空像素值，全是0
        this.framebuffer = this.wgl.createTwinsFbo(TEXTURE_INDEX_FRAME, this.gl.canvas.width, this.gl.canvas.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, ps);
    }

    setColor(color) {
        const color2D = this.wgl.createColorRamp(color);
        this.wgl.createTexture(TEXTURE_INDEX_COLOR, color2D.length / 4, 1, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, color2D);
        this.uniform.u_cmm = new Float32Array([color[0][0], color[color.length - 1][0]]);
        return this;
    }

    load(url) {
        return new Promise(resolve => {
            imagegl.load(url).then((meteo) => {
                resolve(meteo);
            });
        });
    }

    loadMeteo(meteo, mglParams, precision) {
        this.fadeOpacity = mglParams.params.fadeOpacity; // how fast the particle trails fade on each frame
        this.speedFactor = mglParams.params.speedFactor; // how fast the particles move
        this.dropRate = mglParams.params.dropRate; // how often the particles move to a random place
        this.dropRateBump = mglParams.params.dropRateBump; // drop rate increase relative to individual particle speed
        this.particlesRadix = mglParams.params.particlesRadix;   // 粒子基数
        this.meteo = meteo as object;
        // 形成数据纹理
        this.wgl.createTexture(TEXTURE_INDEX_DATA, this.meteo.width, this.meteo.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, this.meteo.data);
        // console.log(meteo);
        this.uniform.u_min = [this.meteo.minAndMax[0][0], this.meteo.minAndMax[1][0]];
        this.uniform.u_max = [this.meteo.minAndMax[0][1], this.meteo.minAndMax[1][1]];
        this.uniform.u_lon = this.meteo.lon;
        this.uniform.u_lat = this.meteo.lat;
    }

    play(clear) {
        if (clear) {
            this.resize();
        }

        //生成初始化例子纹理
        this._initParticles(this.particlesRadix);
        const _this = this;
        if (_this.animateHandle)
            return;
        frame();

        function frame() {
            _this._render();
            _this.animateHandle = requestAnimationFrame(frame);
        }
    }

    stop() {
        if (this.animateHandle) {
            cancelAnimationFrame(this.animateHandle);
            delete this.animateHandle;
        }
        // todo:app
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.resize();
    }

    _render() {
        if (!this.meteo) return;
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        this._drawScreen();
        this._updateParticles();
    }

    _drawScreen() {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        this.framebuffer.bindFrameBuffer();
        this._drawTexture(this.framebuffer.current.texture, this.fadeOpacity);
        this._drawParticles();
        this.wgl.unbindFrameBuffer();
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this._drawTexture(this.framebuffer.buffer.texture, 1.0);
        // gl.disable(gl.BLEND);
        this.framebuffer.swap();   // 对调this.texture.frame_last和this.texture.frame
    }

    _drawTexture(texture: WebGLTexture, opacity: number) {
        const gl = this.gl;
        const program = this.screenProgram;
        program.use();
        this.wgl.bindAttribute(program.attribute.a_pos, this.buffer.quad, 2);
        this.wgl.bindTexture(texture, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1i(program.uniform.u_screen, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1f(program.uniform.u_opacity, opacity);
        this.wgl.gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _drawParticles() {
        const gl = this.gl;
        const program = this.drawProgram;
        program.use();
        //绑定索引
        this.wgl.bindAttribute(program.attribute.a_index, this.buffer.a_index, 1);
        //颜色
        this.wgl.gl.uniform1i(program.uniform.u_color, TEXTURE_INDEX_COLOR);
        this.wgl.gl.uniform2fv(program.uniform.u_cmm, this.uniform.u_cmm);
        this.wgl.gl.uniform1i(program.uniform.u_data, TEXTURE_INDEX_DATA);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1f(program.uniform.u_particles_radix, this.particlesRadix);
        this.wgl.gl.uniform2fv(program.uniform.u_min, this.uniform.u_min);
        this.wgl.gl.uniform2fv(program.uniform.u_max, this.uniform.u_max);
        this.wgl.gl.uniform3fv(program.uniform.u_lon, this.uniform.u_lon);
        this.wgl.gl.uniform3fv(program.uniform.u_lat, this.uniform.u_lat);
        this.wgl.gl.uniform3fv(program.uniform.u_matrix_invert, this.globe.projection.rotate());
        let translate = this.globe.projection.translate();
        let scale = this.globe.projection.scale();
        this.wgl.gl.uniform3fv(program.uniform.u_translate_scale, [translate[0], translate[1], scale]);
        let currentBounds: any = this.globe.bounds(this.view);
        this.wgl.gl.uniform4fv(program.uniform.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        this.wgl.gl.uniform2fv(program.uniform.u_view, [this.view.width, this.view.height]);
        this.wgl.gl.drawArrays(gl.POINTS, 0, this.uniform.u_count);
    }

    _updateParticles() {
        const gl = this.gl;
        this.particlesBuffer.bindFrameBuffer();
        this.wgl.viewport(this.particlesRadix, this.particlesRadix);    // 画256*256大小
        const program = this.updateProgram;
        program.use();
        this.wgl.bindAttribute(program.attribute.a_pos, this.buffer.quad, 2);
        gl.uniform1i(program.uniform.u_data, TEXTURE_INDEX_DATA);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1f(program.uniform.u_particles_radix, this.particlesRadix);
        gl.uniform2fv(program.uniform.u_min, this.uniform.u_min);
        gl.uniform2fv(program.uniform.u_max, this.uniform.u_max);
        gl.uniform3fv(program.uniform.u_lon, this.uniform.u_lon);
        gl.uniform3fv(program.uniform.u_lat, this.uniform.u_lat);
        //地图相关
        gl.uniform3fv(program.uniform.u_matrix_invert, this.globe.projection.rotate());
        let translate = this.globe.projection.translate();
        let scale = this.globe.projection.scale();
        gl.uniform3fv(program.uniform.u_translate_scale, [translate[0], translate[1], scale]);
        let currentBounds: any = this.globe.bounds(this.view);
        gl.uniform4fv(program.uniform.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        gl.uniform2fv(program.uniform.u_view, [this.view.width, this.view.height]);

        gl.uniform1f(program.uniform.u_speed_factor, this.speedFactor);
        gl.uniform1f(program.uniform.u_drop_rate, this.dropRate);
        gl.uniform1f(program.uniform.u_drop_rate_bump, this.dropRateBump);
        gl.uniform1f(program.uniform.u_rand_seed, Math.random());
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.particlesBuffer.swap();   // 对调this.texture.u_particles_next和this.texture.u_particles
        this.wgl.unbindFrameBuffer();
    }

    setZIndex(z) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity) {

    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }

}
