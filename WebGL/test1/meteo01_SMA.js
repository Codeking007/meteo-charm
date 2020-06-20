const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_INDEX_COORD = 2;
const TEXTURE_FRAMEBUFFER = 3;
const vert = `
precision highp float;
const float PI = 3.141592653589793;
attribute float a_index;                // 各顶点索引
uniform sampler2D u_lonlat;     // 经纬度的纹理
uniform mat4 u_matrix;
uniform vec2 u_lonlat_radix;      // 经纬度图片的大小
uniform vec3 u_lon;         // 经度最小值、最大值、步长
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
varying vec2 v_index_texCoord;
float x(float lon){
    return (lon+180.0)/360.0;
}
float y(float lat){
    return 0.5-log((1.0+sin(lat*PI/180.0))/(1.0-sin(lat*PI/180.0)))/(4.0*PI);
}
void main(){
    vec2 a_index_texCoord=vec2(fract(a_index/u_lonlat_radix.x),floor(a_index/u_lonlat_radix.x)/u_lonlat_radix.y);
    vec4 coordOriginal = texture2D(u_lonlat,a_index_texCoord);
    vec2 coordRate = vec2((coordOriginal.x*256.0*255.0+coordOriginal.z*255.0),(coordOriginal.y*256.0*255.0+coordOriginal.w*255.0))/65535.0;
    vec2 lonlat=mix(vec2(u_lon.x,u_lat.x),vec2(u_lon.y,u_lat.y),coordRate);
    vec4 pos=u_matrix*vec4(x(lonlat.x),y(lonlat.y),0,1);
    gl_Position = pos;
    v_index_texCoord=a_index_texCoord;
}`;

const frag = ` 
precision highp float;
const float PREC = 255.0/254.0;
uniform sampler2D u_data;       // 数值的纹理
uniform sampler2D u_color;      // 色卡的纹理
uniform vec2 u_min;         // 各通道像素最小值
uniform vec2 u_max;         // 各通道像素最大值
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
uniform float u_opacity;    // 1.0
varying vec2 v_index_texCoord;
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道
float between(float min,float max,float val){
    return (val-min)/(max-min);
}  
void main(){ 
    // float val = length(mix(u_min,u_max,texture2D(u_data, v_index_texCoord).xy*PREC));  //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
    vec2 eachValue=mix(u_min,u_max,texture2D(u_data, v_index_texCoord).xy*PREC);       //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
    float val;
    // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
    if(isVector){       // fixme：双通道
        val = length(eachValue);
    }else{      // fixme：单通道
        val = eachValue[0];
    }
    float colorPos = between(u_cmm[0],u_cmm[1],val);    // 通过色卡横坐标val得到色卡纹理坐标
    gl_FragColor = texture2D(u_color,vec2(colorPos,1.0))*u_opacity;
}`;

class Meteo{
    constructor(map) {
        this.map = map;
        this.imageNum=2;
        this._init();
        this._initGL();
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this.canvas = document.createElement("canvas");
        this.gl = canvas.getContext("webgl", {antialiasing: false});    // todo:???
        canvas.style.cssText = mapCanvas.style.cssText;
        canvas.style.pointerEvents = 'none';
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        div.appendChild(canvas);
        map.on('resize', (e) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this._render();
        });
        map.on('move', (e) => {
            this._render();
        });
        map.on('load', () => {
            this._render();
        });
    }

    _initGL() {
        const gl = this.gl;
        const vertShader = createShader(gl, gl.VERTEX_SHADER, vert);
        const fragShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
        this.program = createProgram(gl, vertShader, fragShader);
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.program.u_opacity, 0.8);
    }

    show() {
        this.visiable = true;
        this._render();
    }

    setColor(color){
        this.gl.useProgram(this.program);
        const color2D = createColorRamp(color);
        // fixme:色卡渐变
        this.colorTexture = createTexture(this.gl,this.gl.LINEAR,color2D,color2D.length/4,1,TEXTURE_INDEX_COLOR,this.gl.RGBA);
        // fixme:色卡不渐变==>记得不渐变的色卡最后再加个跟最后一个颜色一样的颜色，要不正常的色卡最后那个值就没了
        // this.colorTexture = createTexture(this.gl,this.gl.NEAREST,color2D,color2D.length/4,1,TEXTURE_INDEX_COLOR,this.gl.RGBA);
        this.gl.uniform1i(this.program.u_color, TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.program.u_cmm,new Float32Array([color[0][0],color[color.length-1][0]]));
    }

    load(url, vector){
        this.gl.useProgram(this.program);
        let a_index=this.computeIndex(599,759);
        this.drawLength=a_index.length;
        this.a_index = createBuffer(this.gl, new Float32Array(a_index));
        bindAttribute(this.gl, this.a_index, this.program.a_index, 1);
        let image0 = new Image();
        if (!image0) {
            console.log('Failed to create the image object');
            return false;
        }
        // Register the event handler to be called when image loading is completed
        image0.onload = ()=>{
            const numTexture =this.numTexture=createTexture(this.gl, this.gl.LINEAR, image0, image0.width, image0.height, TEXTURE_INDEX_COORD);
            this.gl.uniform1i(this.program.u_lonlat, TEXTURE_INDEX_COORD);
            // 这个应该就是759、599
            this.gl.uniform2fv(this.program.u_lonlat_radix, new Float32Array([image0.width, image0.height]));
            this.imageNum-=1;
            this._render();
        };
        // Tell the browser to load an Image
        image0.src = './coord.png';

        MeteoImage.load(url).then((meteo) => {
            debugger
            this.meteo = meteo;
            // 形成数据纹理
            this.dataTexture=createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
            this.gl.uniform1i(this.program.u_data, TEXTURE_INDEX_DATA);
            this.gl.uniform3fv(this.program.u_lon, new Float32Array([52.789917,157.18991,0]));
            this.gl.uniform3fv(this.program.u_lat, new Float32Array([7.29969,59.849686,0]));
            this.gl.uniform2fv(this.program.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.program.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);
            this.imageNum-=1;
            this._render();
        });
    }

    computeIndex(row,col){
        const re = new Uint32Array(2*(row-1)*col+(row-2)*2);
        let i = 0;
        for (let y = 0; y < row-1; y++) {
            for (let x = 0; x < col; x++) {
                re[i++] = y*col+x;
                re[i++] = (y+1)*col+x;
            }
            if(y<row-2){
                re[i++] = (y+2)*col-1;
                re[i++] = (y+1)*col;
            }
        }
        return re;
    }

    _render() {
        if(!(this.imageNum!=null&&this.imageNum===0)){
            return;
        }
        const _this = this;
        this._stopTime = new Date().getTime()+500;
        if(_this._animateHandle)
            return;
        frame();
        function frame(){
            _this._frame();
            if(new Date().getTime()<_this._stopTime)
                _this._animateHandle = requestAnimationFrame(frame);
            else
                delete _this._animateHandle;
        }
    }

    _frame(){
        if(!this.meteo)return;
        if(!this.visiable)return;
        const gl = this.gl;
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.program.u_matrix, false, this._matrix());
        gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.drawLength);
    }

    _matrixInvert() {
        // 逆矩阵
        return mat4.invert(new Float32Array(16), this._matrix());
    }

    _matrix() { // mapbox坐标
        const scale = this.map.transform.worldSize;
        const matrix = mat4.identity(new Float32Array(16)); // 定义为单元阵
        mat4.scale(matrix, matrix, [scale, scale, 1]);
        mat4.multiply(matrix, this.map.transform.projMatrix, matrix);
        return matrix;
    }

    hide() {
        this.visiable = false;
        this.gl.clearColor(0, 0, 0, 0); //把清理缓冲区的值设置为黑色
        this.gl.clear(this.gl.COLOR_BUFFER_BIT); //调用clear方法，传入参数gl.COLOR_BUFFER_BIT告诉WebGL使用之前定义的颜色来填充相应区域。
    }

    setZIndex(z) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity) {
        this.gl.uniform1f(this.program.u_opacity, opacity);
    }
}