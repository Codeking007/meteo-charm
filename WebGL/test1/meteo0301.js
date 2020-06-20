const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;  // 色卡
const TEXTURE_INDEX_DATA = 1;   // 图片
const TEXTURE_FRAMEBUFFER = 2;  // 热力
const TEXTURE_FRAMEKERNEL1 = 3; // 卷积1
const TEXTURE_FRAMEKERNEL2 = 4; // 卷积2

const vert = `
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;     // 传进来了WebGL坐标点
}`;

const frag = `
precision highp float;
const float PREC = 255.0/254.0;
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
uniform vec2 u_textureSize; // 纹理图片大小
uniform float u_kernel[9];  // 卷积内核系数
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
void main(){
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
        if(valid(c)){ 
            // fixme:2-
            vec2 val = texture2D(u_data, c).xy*PREC;
            const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
            const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
            vec4 val1 = fract(val.x * bitShift); 
            val1 -= val1.gbaa * bitMask; 
            vec4 val2 = fract(val.y * bitShift); 
            val2 -= val2.gbaa * bitMask; 
            gl_FragColor = vec4(val1.x,val2.x,val1.y,val2.y);
            
        }
        
        
    }
}`;

const vertKernel = `
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

const fragKernel = `
precision highp float;
uniform sampler2D u_data;   //  图片纹理单元=2/3、4
uniform vec2 u_textureSize; // 纹理图片大小
uniform float u_kernel[9];  // 卷积内核系数
varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
} 
float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift); 
    return depth;
  }
void main(){
      vec2 tp = v_pos/2.0+0.5; 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = tp;
        if(valid(c)){
            vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
            vec2 point[9];
            point[0]=c + vec2(-onePixel.x, onePixel.y);
            point[1]=c + vec2(0.0, onePixel.y);
            point[2]=c + vec2(onePixel.x, onePixel.y);
            point[3]=c + vec2(-onePixel.x, 0.0);
            point[4]=c + vec2(0.0, 0.0);
            point[5]=c + vec2(onePixel.x, 0.0);
            point[6]=c + vec2(-onePixel.x, -onePixel.y);
            point[7]=c + vec2(0.0, -onePixel.y);
            point[8]=c + vec2(onePixel.x, -onePixel.y);
            float kernelWeight;
            vec2 val;
            for(int i=0;i<9;i++){
                vec4 rgbaDepth=texture2D(u_data, point[i]);
                float val1 = unpackDepth(vec4(rgbaDepth.r,rgbaDepth.b,0.0,0.0)); 
                float val2 = unpackDepth(vec4(rgbaDepth.g,rgbaDepth.a,0.0,0.0)); 
                val += vec2(val1,val2)*u_kernel[i];
                kernelWeight +=u_kernel[i];
            }
            val /=kernelWeight;
            const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
            const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
            vec4 val1 = fract(val.x * bitShift); 
            val1 -= val1.gbaa * bitMask; 
            vec4 val2 = fract(val.y * bitShift); 
            val2 -= val2.gbaa * bitMask; 
            gl_FragColor = vec4(val1.x,val2.x,val1.y,val2.y);
        }
    }
}`;

const vert1 = `
attribute vec2 a_pos;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main(){
    gl_Position = vec4(a_pos,0.0,1.0);
    v_texCoord = a_texCoord;     
}`;

const frag1 = `
precision highp float;
uniform sampler2D u_frameImage;
uniform vec2 u_textureSize;   
uniform vec2 u_min;         // 各通道像素最小值
uniform vec2 u_max;         // 各通道像素最大值
varying vec2 v_texCoord;
float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift); 
    return depth;
  }
  
void main(){
    // todo:有的图有的地方没值，透明度为0.0，得在帧缓冲区着色器对象里判断
    float kernel[4];
    vec4 value[4];
    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    value[0]=texture2D(u_frameImage, v_texCoord + vec2(-onePixel.x, 0.0));
    value[1]=texture2D(u_frameImage, v_texCoord + vec2(onePixel.x, 0.0));
    value[2]=texture2D(u_frameImage, v_texCoord + vec2(0.0, onePixel.y));
    value[3]=texture2D(u_frameImage, v_texCoord + vec2(0.0, -onePixel.y));
    for(int i=0;i<4;i++){
        vec4 rgbaDepth = value[i];
        float val1 = unpackDepth(vec4(rgbaDepth.x,rgbaDepth.z,0.0,0.0)); 
        float val2 = unpackDepth(vec4(rgbaDepth.y,rgbaDepth.w,0.0,0.0)); 
        kernel[i] = floor(length(mix(u_min,u_max,vec2(val1,val2)))/500.0);
    }
    if(!(kernel[0]==kernel[1]&&kernel[1]==kernel[2]&&kernel[2]==kernel[3])){
        gl_FragColor =vec4(1.0,1.0,1.0,1.0);
    }
}`;

class Meteo {
    constructor(map) {
        this.map = map;
        this._init();
        this._initGL();
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
            debugger
            /*this.lastTimeForUpdate = Date.now();
            setTimeout(()=>{
                debugger
                let now = Date.now();
                if(now - this.lastTimeForUpdate>=1){*/
                    this._render();
                /*}
            },1);*/
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

        const vertKernelShader = createShader(gl, gl.VERTEX_SHADER, vertKernel);
        const fragKernelShader = createShader(gl, gl.FRAGMENT_SHADER, fragKernel);
        this.programKernel = createProgram(gl, vertKernelShader, fragKernelShader);

        const vertShader1 = createShader(gl, gl.VERTEX_SHADER, vert1);
        const fragShader1 = createShader(gl, gl.FRAGMENT_SHADER, frag1);
        this.program1 = createProgram(gl, vertShader1, fragShader1);

        //初始化静态信息
        this.gl.useProgram(this.program);
        const posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        bindAttribute(gl, posBuffer, this.program.a_position, 2);
        this.gl.uniform1f(this.program.u_opacity, 1.0);

        this.gl.useProgram(this.programKernel);
        const posBufferKernel = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        bindAttribute(gl, posBufferKernel, this.programKernel.a_position, 2);

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
        return MeteoImage.load(url).then((meteo) => {
            this.gl.useProgram(this.program);
            this.meteo = meteo;
            // 形成数据纹理
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

            this.gl.useProgram(this.programKernel);
            this.gl.uniform1fv(this.programKernel["u_kernel[0]"], u_kernel);

            this.gl.useProgram(this.program1);
            this.gl.uniform2fv(this.program1.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.program1.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);

            this.gl.useProgram(this.program);

            this._render();
        });
    }


    initFramebufferObject(gl) {
        let framebuffer, texture;

        framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            console.log('Failed to create frame buffer object');
            gl.deleteFramebuffer(framebuffer);
        }

        texture = gl.createTexture();
        if (!texture) {
            console.log('Failed to create texture object');
            gl.deleteTexture(texture);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.gl.canvas.width, this.gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        framebuffer.texture = texture; // fixme:保存纹理对象

        var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (gl.FRAMEBUFFER_COMPLETE !== e) {
            console.log('Frame buffer object is incomplete: ' + e.toString());
            return null;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return framebuffer;
    }


    _render() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;


        // fixme：(1)第一次铺热力图同时卷积一次
        const fbo=this.fbo=this.initFramebufferObject(this.gl);
        if (!fbo) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }
        // 将纹理对象绑定到纹理单元上
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEBUFFER);
        this.gl.bindTexture(this.gl.TEXTURE_2D, fbo.texture);


        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_COLOR);
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_DATA);
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.uniformMatrix4fv(this.program.u_matrix_invert, false, this._matrixInvert());
        this.gl.uniform2fv(this.program.u_textureSize, [this.gl.canvas.width, this.gl.canvas.height]);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // fixme:(3)多次卷积内核
        const fboKernel=this.fboKernel=[this.initFramebufferObject(this.gl),this.initFramebufferObject(this.gl)];
        this.fboKernel[0].textureId=TEXTURE_FRAMEKERNEL1;
        this.fboKernel[1].textureId=TEXTURE_FRAMEKERNEL2;
        let ilength=10;
        for(let i=0;i<ilength;i++){
            this.gl.activeTexture(this.gl.TEXTURE0+this.fboKernel[i%2].textureId);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboKernel[i%2].texture);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboKernel[i%2]);
            gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            gl.useProgram(this.programKernel);
            if(i==0){
                this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEBUFFER); // Set a texture object to the texture unit
                this.gl.bindTexture(this.gl.TEXTURE_2D, fbo.texture); // fixme:这里放的是帧缓冲区的纹理图像
                this.gl.uniform1i(this.programKernel.u_data, TEXTURE_FRAMEBUFFER);
            }else{
                gl.activeTexture(gl.TEXTURE0+this.fboKernel[(i+1)%2].textureId);
                gl.bindTexture(gl.TEXTURE_2D, this.fboKernel[(i+1)%2].texture);
                this.gl.uniform1i(this.programKernel.u_data, this.fboKernel[(i+1)%2].textureId);
            }

            this.gl.uniform2fv(this.programKernel.u_textureSize, [this.gl.canvas.width, this.gl.canvas.height]);
            gl.drawArrays(this.gl.TRIANGLES, 0, 6);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        // fixme:(4)将绘制目标切换为颜色缓冲区
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program1);
        gl.uniform1i(this.program1.u_frameImage, this.fboKernel[(ilength+1)%2].textureId);
        gl.activeTexture(gl.TEXTURE0+this.fboKernel[(ilength+1)%2].textureId);
        gl.bindTexture(gl.TEXTURE_2D, this.fboKernel[(ilength+1)%2].texture);
        //初始化静态信息
        const posBuffer1 = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        bindAttribute(gl, posBuffer1, this.program1.a_pos, 2);
        const texBuffer1 = createBuffer(gl, new Float32Array([1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]));
        bindAttribute(gl, texBuffer1, this.program1.a_texCoord, 2);
        this.gl.uniform2fv(this.program1.u_textureSize, [this.gl.canvas.width, this.gl.canvas.height]);
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