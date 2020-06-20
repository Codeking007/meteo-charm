// fixme:给全调成非渐变的了createColorRamp()
// fixme:色卡纹理变为gl.NEAREST，配合非渐变
// fixme:把viewport的高度和宽度变为1/2，要不手机太慢了canvas.width = mc.width/2;canvas.height = mc.height/2;
import imagegl from "./image";
import util from "./util";

const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 7;
const TEXTURE_INDEX_DATA = 6;

const vert = `
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;
}`;

const frag = `
// precision mediump float;
precision highp float;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
const float PREC = 255.0/254.0;
uniform vec3 u_matrix_invert;
uniform vec3 u_translate_scale;
uniform vec4 u_current_bounds;
uniform vec2 u_view;
uniform vec3 u_lon;
uniform vec3 u_lat;
uniform sampler2D u_data;
uniform sampler2D u_color;
uniform vec2 u_min;
uniform vec2 u_max;
uniform vec2 u_cmm;
uniform float u_type;
uniform float u_opacity;
varying vec2 v_pos;
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道
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
void main(){
    vec2 texture_point=(v_pos+1.0)/2.0;
    vec2 current_pos=vec2(texture_point.x,1.0-texture_point.y)*u_view;
    // fixme:是否在正方形内
    if(current_pos.x>=u_current_bounds[0]&&current_pos.x<=u_current_bounds[1]&&current_pos.y>=u_current_bounds[2]&&current_pos.y<=u_current_bounds[3]){
        // fixme:像素点转换成经纬度(正方形就变成圆形了)
        vec2 lon_lat=orthographicProjectionInvert(current_pos);
        vec2 c = coord(lon_lat);
        if(valid(c)){
            vec2 eachValue=mix(u_min,u_max,texture2D(u_data, c).xy*PREC);
            float val;
            if(isVector){       // fixme：双通道
                val = length(eachValue);  //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            }else{      // fixme：单通道
                val = eachValue[0];
            }
            gl_FragColor = texture2D(u_color,vec2(between(u_cmm[0],u_cmm[1],val),1.0))*u_opacity;
        }
    }
}`;
export default class {
    private canvas!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;
    private visiable!: boolean;
    private program!: any;
    private meteo: any;
    private stopTime: any;
    private animateHandle: any;
    private globe: any;
    private view: any;

    constructor(globe, view) {
        this.globe = globe;
        this.view = view;
        this._init();
        this._initGL();
    }

    _init() {
        const canvas = this.canvas = document.getElementById("shade") as any;
        this.gl = canvas.getContext("webgl", {
            antialiasing: false,
            preserveDrawingBuffer: true
        }) as WebGLRenderingContext;
        canvas.style.pointerEvents = 'none';
        canvas.style.width = this.view.width*2;
        canvas.style.height = this.view.height*2;
        canvas.width = this.view.width;
        canvas.height = this.view.height;

    }

    _initGL() {
        const gl = this.gl;
        const vertShader = util.createShader(gl, gl.VERTEX_SHADER, vert);
        const fragShader = util.createShader(gl, gl.FRAGMENT_SHADER, frag);
        this.program = util.createProgram(gl, vertShader, fragShader);
        //初始化静态信息
        const posBuffer = util.createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        util.bindAttribute(gl, posBuffer, this.program["a_position"], 2);
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.program["u_opacity"], 0.8);
    }

    setColor(color) {
        const color2D = util.createColorRamp(color, "gradient");  // 非渐变
        const colorTexture = util.createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR);
        this.gl.uniform1i(this.program["u_color"], TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.program["u_cmm"], new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    load(url, vector) {
        return new Promise(resolve => {
            imagegl.load(url).then((meteo) => {
                resolve(meteo);
            });
        });
    }

    loadMeteo(meteo, shadeParams, precision) {
        this.meteo = meteo;
        // 形成数据纹理
        util.createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
        this.gl.uniform1i(this.program["u_data"], TEXTURE_INDEX_DATA);
        this.gl.uniform3fv(this.program["u_lon"], meteo.lon);
        this.gl.uniform3fv(this.program["u_lat"], meteo.lat);
        this.gl.uniform2fv(this.program["u_min"], [meteo.minAndMax[0][0], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][0] : 0]);
        this.gl.uniform2fv(this.program["u_max"], [meteo.minAndMax[0][1], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][1] : 0]);
        if (shadeParams.computeAsVector[1])
            this.gl.uniform1f(this.program["u_type"], 2.0);
        else
            this.gl.uniform1f(this.program["u_type"], 1.0);
        this._render();
    }

    _render() {
        const _this = this;
        this.stopTime = new Date().getTime() + 1;
        if (_this.animateHandle)
            return;
        frame();

        function frame() {
            _this._frame();
            if (new Date().getTime() < _this.stopTime) {
                _this.animateHandle = requestAnimationFrame(frame);
            } else {
                delete _this.animateHandle;
            }

        }
    }

    _frame() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        gl.uniform3fv(this.program.u_matrix_invert, this.globe.projection.rotate());
        let translate=this.globe.projection.translate();
        let scale=this.globe.projection.scale();
        gl.uniform3fv(this.program.u_translate_scale, [translate[0],translate[1],scale]);
        let currentBounds: any = this.globe.bounds(this.view);
        gl.uniform4fv(this.program.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        gl.uniform2fv(this.program.u_view, [this.view.width,this.view.height]);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        console.group("热力图参数");
        console.warn("this.globe.projection.rotate()");
        console.log(this.globe.projection.rotate());

        console.warn("this.globe.projection.translate()+this.globe.projection.scale()");
        console.log([translate[0],translate[1],scale]);

        console.warn("this.globe.bounds(this.view)");
        console.log([currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);

        console.warn("this.globe.projectionBounds()");
        let projectionBounds:(Array<Array<number>>)=this.globe.projectionBounds();
        console.log([projectionBounds[0][0], projectionBounds[1][0],projectionBounds[0][1], projectionBounds[1][1]]);
        console.groupEnd();
    }

    show() {
        this.visiable = true;
        this._render();
    }

    hide() {
        this.visiable = false;
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    setZIndex(z) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity) {
        this.gl.uniform1f(this.program.u_opacity, opacity);
    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }
}

