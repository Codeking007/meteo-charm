// fixme:先铺热力图，再找相对高低点、重复卷积
const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_FRAMEBUFFER = 2;
const TEXTURE_FRAMEKERNEL1 = 3;
const TEXTURE_FRAMEKERNEL2 = 4;
const TEXTURE_FRAMEHLPOINTS = 5;
const TEXTURE_INDEX_NUMBERS = 6;

const vert = ` 
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

const frag = `
// precision mediump float;
precision highp float;
const float PREC = 255.0/254.0;
uniform mat4 u_matrix_invert;
uniform vec3 u_lon;         // 经度最小值、最大值、步长
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
uniform sampler2D u_data;   //  图片纹理单元=1
uniform sampler2D u_color;  //  色卡纹理单元=0
uniform sampler2D u_numbers;   //  字体纹理单元=6
uniform vec3 u_coord;
uniform vec2 u_min;         // 各通道像素最小值
uniform vec2 u_max;         // 各通道像素最大值
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
uniform float u_type;       // todo：用了几个通道？？
uniform float u_opacity;    // 1.0
uniform vec2 u_textureSize; // 纹理图片大小
uniform float u_kernel[9];  // 卷积内核系数
varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道
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
bool inTriangle(vec2 p,vec2 a,vec2 b,vec2 c){
//叉乘判断p是否在三角形abc中，如果pa叉乘pb的方向与pb叉乘pc的方向与pc叉乘pa的方向都相同，那就在三角形里
    vec2 pa=a-p;
    vec2 pb=b-p;
    vec2 pc=c-p;
    float directionpapb=pa.x*pb.y-pa.y*pb.x;
    float directionpbpc=pb.x*pc.y-pb.y*pc.x;
    float directionpcpa=pc.x*pa.y-pc.y*pa.x;
    return (directionpapb>0.0&&directionpbpc>0.0&&directionpcpa>0.0)||(directionpapb<0.0&&directionpbpc<0.0&&directionpcpa<0.0);
}
float getNumber(float value, float digit) {   // fixme:获取数字对应的位置
    int thisDigit = int(value / digit);
    int upperDigit = int(thisDigit / 10) * 10;
    return float(thisDigit - upperDigit);
}
const vec2 u_num=vec2(5.0,5.0);
const float a=1.0/u_num.x;
const float b=1.0/u_num.y;
const float c1=a*0.5;
const float c2=b*0.5;
const float fontNum=4.0;
const float d=c1/fontNum;
vec4 getFontColor(vec2 texCoord,float testValue,float wei,float num){
    if(mod(texCoord.x,a)/c1<d/c1*num){
        if (testValue >= wei) {
            float xOffset = mod(mod(texCoord.x,a),d)/d*(1.0/16.0);      // 这样写也行==>float xOffset = mod(mod(texCoord.x,a)/d*(1.0/16.0),1.0/16.0); 
            float yOffset = mod(texCoord.y,b)/c2; 
            texCoord.x = getNumber(testValue, wei) / 16.0 + xOffset;
            texCoord.y = 1.0-(0.0 + yOffset);
        }else {
            texCoord.x = 12.0/16.0;  // fixme:小于10，就不显示前面的0。想显示前面的0，就加上offset
        }
    }
    return vec4(1.0,1.0,1.0,2.0)-texture2D(u_numbers, texCoord);
}
int getLen(float x){  //有几位整数位 // log10(x)+1
     return int(log2(x)/log2(10.0)+1.0);
}
void main(){
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
        if(valid(c)){ 
//            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));  //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            vec2 eachValue=mix(u_min,u_max,texture2D(u_data, c).xy*PREC);       //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float val;
            // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
            if(isVector){       // fixme：双通道
                val = length(eachValue);
            }else{      // fixme：单通道
                val = eachValue[0];
            }
            float colorPos = between(u_cmm[0],u_cmm[1],val);    // 通过色卡横坐标val得到色卡纹理坐标
            vec4 color = texture2D(u_color,vec2(colorPos,1.0));
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0))*u_opacity;  // vec4(color.rgb,color.a*u_opacity);//texture2D(u_color,vec2(colorPos,1.0));
            
            vec2 texCoord = v_pos/2.0+0.5;
            float testValue = 85.624;
            vec4 fontColor;
            if(mod(texCoord.x,a)<=c1&&mod(texCoord.y,b)<=c2){
                if(mod(texCoord.x,a)/c1<d/c1*1.0){
                    fontColor =getFontColor(texCoord,testValue,10.0,1.0);
                }else if(mod(texCoord.x,a)/c1<d/c1*2.0){
                    fontColor =getFontColor(texCoord,testValue,1.0,2.0);
                }else if(mod(texCoord.x,a)/c1<d/c1*3.0){ 
                    fontColor =getFontColor(texCoord,testValue,0.1,3.0);
                }else if(mod(texCoord.x,a)/c1<d/c1*4.0){
                    fontColor =getFontColor(texCoord,testValue,0.01,4.0);
                }
            }else{
                 fontColor = vec4(1.0,1.0,1.0,1.0);
            }
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0))*u_opacity*fontColor; // Display the number
            
        }
    }
}`;

class Meteo {
    constructor(map) {
        this.map = map;
        this._init();
        this._initGL();
        this.imageNum=2;
        this.lastTimeForUpdate = Date.now();
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
        // mapCanvas.style.backgroundColor='#ccffca';
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
            /*debugger
            this.lastTimeForUpdate = Date.now();
            setTimeout(()=>{
                debugger
                let now = Date.now();
                if(now - this.lastTimeForUpdate>=200){*/
                    this._render();
                /*}
            },200);*/
            /*let now = Date.now();
            var elapsed = now - this.lastTimeForUpdate;
            this.lastTimeForUpdate = now;
            debugger
            if(elapsed>1){
                this._render();
            }*/

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

        //初始化静态信息
        this.gl.useProgram(this.program);
        const posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        bindAttribute(gl, posBuffer, this.program.a_position, 2);
        this.gl.uniform1f(this.program.u_opacity, 1.0);
    }




    show() {
        this.visiable = true;
        this._render();
    }

    setColor(color) {
        this.gl.useProgram(this.program);
        const color2D = createColorRamp(color); // 画色卡
        const colorTexture =this.colorTexture= createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR);
        this.gl.uniform1i(this.program.u_color, TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.program.u_cmm, new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    load(url, vector) {

        var image0 = new Image();
        if (!image0) {
            console.log('Failed to create the image object');
            return false;
        }
        // Register the event handler to be called when image loading is completed
        image0.onload = ()=>{
            const numTexture =this.numTexture=createTexture(this.gl, this.gl.LINEAR, image0, image0.width, image0.height, TEXTURE_INDEX_NUMBERS);
            this.gl.uniform1i(this.program.u_numbers, TEXTURE_INDEX_NUMBERS);
            this.imageNum-=1;
            this._render();
        };
        // Tell the browser to load an Image
        image0.src = './resources/numbers.png';

        MeteoImage.load(url).then((meteo) => {
            this.gl.useProgram(this.program);
            this.meteo = meteo;
            // 形成数据纹理
            // this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
            const dataTexture =this.dataTexture=createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
            this.gl.uniform1i(this.program.u_data, TEXTURE_INDEX_DATA);
            this.gl.uniform3fv(this.program.u_lon, meteo.lon);
            this.gl.uniform3fv(this.program.u_lat, meteo.lat);
            this.gl.uniform2fv(this.program.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.program.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);
            if (!vector){
                this.gl.uniform1f(this.program.u_type, 1.0);
            }else{
                this.gl.uniform1f(this.program.u_type, 2.0);
            }
            /*let u_kernel=new Float32Array([1.0/16.0,2.0/16.0,1.0/16.0,
                                            2.0/16.0,2.0/16.0,2.0/16.0,
                                            1.0/16.0,2.0/16.0,1.0/16.0]);*/
            /*let u_kernel=new Float32Array([1.0/8.0,1.0/8.0,1.0/8.0,
                                            1.0/8.0,0.0,1.0/8.0,
                                            1.0/8.0,1.0/8.0,1.0/8.0]);*/
            /*let u_kernel=new Float32Array([0.0,-1.0,0.0,
                                            -1.0,5.0,-1.0,
                                            0.0,-1.0,0.0]);*/
            let u_kernel=new Float32Array([1.0/9.0,1.0/9.0,1.0/9.0,
                                            1.0/9.0,1.0/9.0,1.0/9.0,
                                            1.0/9.0,1.0/9.0,1.0/9.0]);
            this.gl.uniform1fv(this.program["u_kernel[0]"], u_kernel);
            this.imageNum-=1;
            this._render();
        });
    }

    _render() {
        debugger
        if(!(this.imageNum!=null&&this.imageNum===0)){
            return;
        }
        const _this = this;
        this._stopTime = new Date().getTime()+200;
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

    _frame() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;
        const param_u_scale=1.0;
        // fixme：(1)第一次铺热力图同时卷积一次

        // fixme:gl.viewport(x, y, width, height)==>用来设置视口，即指定从标准设备到窗口坐标的x、y仿射变换
        // x：GLint，用来设定视口的左下角水平坐标。默认值：0。
        // y：GLint，用来设定视口的左下角垂直坐标。默认值：0。
        // width：非负数Glsizei，用来设定视口的宽度。默认值：canvas的宽度。
        // height：非负数Glsizei，用来设定视口的高度。默认值：canvas的高度。
        gl.viewport(0, 0, this.gl.canvas.width*param_u_scale, this.gl.canvas.height*param_u_scale);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_COLOR);
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_DATA);
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_NUMBERS);
        gl.bindTexture(gl.TEXTURE_2D, this.numTexture);
        gl.uniformMatrix4fv(this.program.u_matrix_invert, false, this._matrixInvert());
        this.gl.uniform2fv(this.program.u_textureSize, [this.gl.canvas.width, this.gl.canvas.height]);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
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