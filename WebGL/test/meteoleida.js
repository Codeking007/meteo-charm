const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR_GRID = 0;
const TEXTURE_INDEX_DATA_GRID = 1;

const gribVertexShader = `
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

const gribFragmentShader = `
// precision mediump float;
precision highp float;
const float PREC = 255.0/250.0;
uniform mat4 u_matrix_invert;
uniform vec3 u_lon;         // 经度最小值、最大值、步长
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
uniform sampler2D u_data;   //  图片纹理单元=1
uniform sampler2D u_color;  //  色卡纹理单元=0
uniform vec3 u_coord;
uniform vec2 u_min;         // 各通道像素最小值
uniform vec2 u_max;         // 各通道像素最大值
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
uniform float u_type;       // todo：用了几个通道？？
uniform float u_opacity;    // 1.0
varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
vec2 tilePos(vec2 pos){     
    vec4 p0 = u_matrix_invert*vec4(pos,0,1);
    vec4 p1 = u_matrix_invert*vec4(pos,1,1);    
    p0 = p0/p0.w;
    p1 = p1/p1.w;
    float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
    return mix(p0,p1,t).xy;     // todo:线性混合
//return p1.xy;
}
vec2 coord(vec2 pos){   // pos:经纬度
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
}
vec2 geoPos(vec2 pos){
    float lon = mix(-180.0,180.0,pos.x);
    float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
    return vec2(lon,lat);
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
        if(valid(c)){
            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));  //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);    // 通过色卡横坐标val得到色卡纹理坐标
            vec4 color = texture2D(u_color,vec2(colorPos,1.0));
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0))*u_opacity;//vec4(color.rgb,color.a*u_opacity);//texture2D(u_color,vec2(colorPos,1.0));//
        }
    }
}`;

class Meteo {
    constructor(map) {
        this.map = map;
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
        const vertShader = createShader(gl, gl.VERTEX_SHADER, gribVertexShader);
        const fragShader = createShader(gl, gl.FRAGMENT_SHADER, gribFragmentShader);
        this.gribProgram = createProgram(gl, vertShader, fragShader);
        //初始化静态信息
        const posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        bindAttribute(gl, posBuffer, this.gribProgram.a_position, 2);
        this.gl.useProgram(this.gribProgram);
        this.gl.uniform1f(this.gribProgram.u_opacity, 1.0);
    }

    show() {
        this.visiable = true;
        this._render();
    }

    setColor(color) {
        const color2D = createColorRamp(color); // 画色卡
        const colorTexture = createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR_GRID);
        this.gl.uniform1i(this.gribProgram.u_color, TEXTURE_INDEX_COLOR_GRID);
        this.gl.uniform2fv(this.gribProgram.u_cmm, new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    load(url, vector) {
        return MeteoImage.load(url).then((meteo) => {
            // todo
            debugger
            meteo=computeTextureByData();

            this.meteo = meteo;
            debugger
            // 形成数据纹理
            createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA_GRID);
            this.gl.uniform1i(this.gribProgram.u_data, TEXTURE_INDEX_DATA_GRID);
            this.gl.uniform3fv(this.gribProgram.u_lon, meteo.lon);
            this.gl.uniform3fv(this.gribProgram.u_lat, meteo.lat);
            this.gl.uniform2fv(this.gribProgram.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.gribProgram.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);
            if (!vector){
                this.gl.uniform1f(this.gribProgram.u_type, 1.0);
            }else{
                this.gl.uniform1f(this.gribProgram.u_type, 2.0);
            }
            this._render();
        });
    }




    _render() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;
        // fixme:gl.viewport(x, y, width, height)==>用来设置视口，即指定从标准设备到窗口坐标的x、y仿射变换
        // x：GLint，用来设定视口的左下角水平坐标。默认值：0。
        // y：GLint，用来设定视口的左下角垂直坐标。默认值：0。
        // width：非负数Glsizei，用来设定视口的宽度。默认值：canvas的宽度。
        // height：非负数Glsizei，用来设定视口的高度。默认值：canvas的高度。
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        gl.uniformMatrix4fv(this.gribProgram.u_matrix_invert, false, this._matrixInvert());
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    _matrixInvert() {
        // 逆矩阵
        debugger
        return mat4.invert(new Float32Array(16), this._matrix());
    }

    _matrix() { // mapbox坐标
        debugger
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
        this.gl.uniform1f(this.gribProgram.u_opacity, opacity);
    }

}