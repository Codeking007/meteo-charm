const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_FRAMEBUFFER = 2;
const TEXTURE_FRAMEISOLINE = 3;
const TEXTURE_FRAMEFONT = 4;
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
void main(){
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
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
                val += texture2D(u_data, point[i]).xy*PREC*u_kernel[i];
                kernelWeight +=u_kernel[i];
            }
            val /=kernelWeight;  
            /*const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
            const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
            vec4 val1 = fract(val.x * bitShift); 
            val1 -= val1.gbaa * bitMask; 
            vec4 val2 = fract(val.y * bitShift); 
            val2 -= val2.gbaa * bitMask; 
            gl_FragColor = vec4(val1.x,val2.x,val1.y,val2.y);*/
            
            vec2 val1=floor(val * 65535.0 / 256.0);
            vec2 val2=val*65535.0-val1*256.0;
            gl_FragColor = vec4(val1/255.0,val2/255.0);
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
uniform float u_isoline;     // 等值线数值间距
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
varying vec2 v_texCoord;
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道
const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
float between(float min,float max,float val){
    return (val-min)/(max-min);
}    
float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift); 
    return depth;
  }
void main(){
    // todo:有的图有的地方没值，透明度为0.0，得在帧缓冲区着色器对象里判断
    float kernel[5];
    vec4 value[5];
    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    value[0]=texture2D(u_frameImage, v_texCoord + vec2(-onePixel.x, 0.0));
    value[1]=texture2D(u_frameImage, v_texCoord + vec2(onePixel.x, 0.0));
    value[2]=texture2D(u_frameImage, v_texCoord + vec2(0.0, onePixel.y));
    value[3]=texture2D(u_frameImage, v_texCoord + vec2(0.0, -onePixel.y));
    value[4]=texture2D(u_frameImage, v_texCoord + vec2(0.0, 0.0));
    for(int i=0;i<5;i++){
        vec4 rgbaDepth = value[i];
        float val1 = (rgbaDepth.x*256.0*255.0+rgbaDepth.z*255.0)/65535.0; 
        float val2 = (rgbaDepth.y*256.0*255.0+rgbaDepth.w*255.0)/65535.0; 
        // kernel[i] = floor(length(mix(u_min,u_max,vec2(val1,val2)))/u_isoline);
        vec2 eachValue=mix(u_min,u_max,vec2(val1,val2));
        // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
        if(isVector){       // fixme：双通道
            kernel[i] = floor(length(eachValue)/u_isoline);
        }else{      // fixme：单通道
            kernel[i] = floor(eachValue[0]/u_isoline);
        }
    } 
    if(!(kernel[0]==kernel[1]&&kernel[1]==kernel[2]&&kernel[2]==kernel[3]&&kernel[3]==kernel[0])){
        int showLines=0;
        float currentValue;
        for(int i=0;i<4;i++){
            if(kernel[i]>=kernel[4]){
                showLines++; 
                currentValue=kernel[i];
            }
        }
        if(showLines<=3){ 
            // todo:精度有问题
            // todo:正负数怎么搞
            // vec4 isolineValue = fract(between(length(u_min),length(u_max),currentValue*u_isoline) * bitShift); 
            vec4 isolineValue; 
            if(isVector){ 
                isolineValue = fract(between(length(u_min),length(u_max),currentValue*u_isoline) * bitShift); 
            }else{
                isolineValue = fract(between(u_min[0],u_max[0],currentValue*u_isoline) * bitShift); 
            }
            isolineValue -= isolineValue.gbaa * bitMask; 
            gl_FragColor =isolineValue;
//            gl_FragColor =vec4(1.0,1.0,1.0,1.0);
        }
    }
}`;

const vertFont = ` 
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_texCoord = a_texCoord;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

const fragFont = `
precision highp float;
uniform sampler2D u_numbers;   //  字体纹理单元=6
varying vec2 v_texCoord;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
void main(){ 
    vec4 fontColor=texture2D(u_numbers, v_texCoord);
    if(fontColor.g>0.3){
        gl_FragColor=vec4(0.5,1.0,0.5,1.0);
    }else{
        gl_FragColor=vec4(0.0,0.0,0.0,0.0);
    }
    
//    gl_FragColor=fontColor;
}`;

const vertAll = ` 
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

const fragAll = `
precision highp float;
uniform sampler2D u_frameIsoline;   // 等值线纹理单元
uniform sampler2D u_frameFont;     // 数值纹理
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift); 
    return depth;
  }
void main(){ 
    vec2 texCoord = v_pos/2.0+0.5;
    vec4 isolineColor=texture2D(u_frameIsoline, texCoord);
    vec4 fontColor=texture2D(u_frameFont, texCoord);
    if(isolineColor.r>0.0||isolineColor.g>0.0||isolineColor.b>0.0||isolineColor.a>0.0){
//        gl_FragColor=vec4(1.0,1.0,1.0,1.0);

        //  彩色线，代表比例值
//        gl_FragColor=isolineColor;

        // 102000线是分界线，显示单独的颜色
        float rate=unpackDepth(isolineColor);
        if(ceil((rate*(u_cmm.y-u_cmm.x)+u_cmm.x)/200.0-0.5)*200.0==102000.0){       // ceil(x-0.5)相当于四舍五入方法，WebGL没round方法
            gl_FragColor=vec4(16.0/255.0,245.0/255.0,255.0/255.0,1.0);
        }else{
            gl_FragColor=vec4(1.0,1.0,1.0,1.0);
        }
    }
    /*if(fontColor.a==1.0){
        gl_FragColor=fontColor;
    }*/
    
//    gl_FragColor=fontColor;
      
}`;

class Meteo {
    constructor(map) {
        this.map = map;
        this.imageNum=2;
        this.fontInfo = {
            letterWidth:32,
            letterHeight: 32,
            spaceWidth: 32,
            spacing: 0,
            textureWidth: 512,
            textureHeight: 32,
            glyphInfos: {
                '0': { x: 0*32, y: 0, width: 32, },
                '1': { x: 1*32, y: 0, width: 32, },
                '2': { x: 2*32, y: 0, width: 32, },
                '3': { x: 3*32, y: 0, width: 32, },
                '4': { x: 4*32, y: 0, width: 32, },
                '5': { x: 5*32, y: 0, width: 32, },
                '6': { x: 6*32, y: 0, width: 32, },
                '7': { x: 7*32, y: 0, width: 32, },
                '8': { x: 8*32, y: 0, width: 32, },
                '9': { x: 9*32, y: 0, width: 32, },
                '.': { x: 10*32, y: 0, width: 32, },
                '-': { x: 11*32, y: 0, width: 32, }
            },
            fontWidthNumber:10,              // 一行几个数值
            fontHeightNumber:10,             // 一列几个数值
            fontWidthNumberRate:0.7,        // 每个数值横向显示比例
            fontHeightNumberRate:0.1,       // 每个数值纵向显示比例
            isolineValue:200                // 等值线间距
        };
        this.fontPositions=[];      // 存放数值顶点坐标
        this.fontTexcoords=[];      // 存放数值纹理坐标
        this.fontNumVertices=0;     // 存放数值坐标数量
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
            this.fbo = this.initFramebufferObject(this.gl);
            this.fboIsoline = this.initFramebufferObject(this.gl);
            this.fboFont = this.initFramebufferObject(this.gl);
            // fixme:1
            this.pixels = new Uint8Array(this.gl.drawingBufferWidth * this.gl.drawingBufferHeight * 4);
            /*// fixme:2
            this.pixels = new Uint8Array(Math.floor(this.gl.drawingBufferWidth/this.fontInfo.fontWidthNumber) * Math.floor(this.gl.drawingBufferHeight/this.fontInfo.fontHeightNumber) * 4);*/
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

        const vertShader1 = createShader(gl, gl.VERTEX_SHADER, vert1);
        const fragShader1 = createShader(gl, gl.FRAGMENT_SHADER, frag1);
        this.program1 = createProgram(gl, vertShader1, fragShader1);

        const vertShaderFont = createShader(gl, gl.VERTEX_SHADER, vertFont);
        const fragShaderFont = createShader(gl, gl.FRAGMENT_SHADER, fragFont);
        this.programFont = createProgram(gl, vertShaderFont, fragShaderFont);

        const vertShaderAll = createShader(gl, gl.VERTEX_SHADER, vertAll);
        const fragShaderAll = createShader(gl, gl.FRAGMENT_SHADER, fragAll);
        this.programAll = createProgram(gl, vertShaderAll, fragShaderAll);

        const fbo=this.fbo = this.initFramebufferObject(this.gl);
        if (!fbo) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }
        const fboIsoline=this.fboIsoline = this.initFramebufferObject(this.gl);
        if (!fboIsoline) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }
        const fboFont=this.fboFont = this.initFramebufferObject(this.gl);
        if (!fboFont) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }

        //初始化静态信息
        this.gl.useProgram(this.program);
        const posBuffer =this.posBuffer= createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        const texBuffer =this.texBuffer= createBuffer(gl, new Float32Array([1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]));
        bindAttribute(gl, posBuffer, this.program.a_position, 2);
        this.gl.uniform1f(this.program.u_opacity, 1.0);

        // fixme:1
        this.pixels = new Uint8Array(this.gl.drawingBufferWidth * this.gl.drawingBufferHeight * 4);
        /*// fixme:2
        this.pixels = new Uint8Array(Math.floor(this.gl.drawingBufferWidth/this.fontInfo.fontWidthNumber) * Math.floor(this.gl.drawingBufferHeight/this.fontInfo.fontHeightNumber) * 4);*/

    }

    show() {
        this.visiable = true;
        this._render();
    }

    setColor(color) {
        // todo:要传进来对应色卡，虽然没用到色卡颜色，但用到它的最大最小值来算东西
        this.gl.useProgram(this.program1);
        this.gl.uniform2fv(this.program1.u_cmm, new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    load(url, vector) {
        let image0 = new Image();
        if (!image0) {
            console.log('Failed to create the image object');
            return false;
        }
        // Register the event handler to be called when image loading is completed
        image0.onload = ()=>{
            this.gl.useProgram(this.programFont);
            const numTexture =this.numTexture=createTexture(this.gl, this.gl.LINEAR, image0, image0.width, image0.height, TEXTURE_INDEX_NUMBERS);
            this.imageNum-=1;
            this._render();
        };
        // Tell the browser to load an Image
        image0.src = './resources/numbers.png';

        MeteoImage.load(url).then((meteo) => {
            const w = meteo.width;
            const h = meteo.height;
            const data = meteo.data;
            const min = meteo.minAndMax[0][0];
            const max = meteo.minAndMax[0][1];
            const step = this.fontInfo.isolineValue;
            let _data = standard(data,h,w,min,max,step);    // fixme:数值最低的等级是0，其余数值的都是相对最低等级0的等级
            const info = [];
            const _data1 = polygon(_data,h,w-1,info);
            // fixme:la/ha={信息索引:[val,lon,lat]}
            const la = new Map();
            const ha = new Map();
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w - 1; x++) {
                    const pval = _data1[y*(w-1)+x];
                    const ival = info[pval];
                    const val = data[(y*w+x)*4];
                    if(ival[1]&&(!ival[2])){
                        if((!la.has(pval))||val<la.get(pval)[0])
                            la.set(pval,[val,x*0.25-180,y*0.25-90]);    // fixme:这里直接用的图片，所以不用什么算法来换算成经纬度，图片就是按等经纬度间隔来存的
                    }
                    if(ival[2]&&(!ival[1])){
                        if((!ha.has(pval))||val>ha.get(pval)[0])
                            ha.set(pval,[val,x*0.25-180,y*0.25-90]);
                    }
                }
            }
            const ps = [];
            for (let v of la.values())
                ps.push(turf.point([v[1], v[2]], {v:-1,val:Math.round(min+(max-min)*v[0]/254),
                    description:"L\r\n" +(Math.round(min+(max-min)*v[0]/254)/100).toFixed(0)    // fixme:单位百帕
                }));
            for (let v of ha.values())
                ps.push(turf.point([v[1], v[2]], {v:1,val:Math.round(min+(max-min)*v[0]/254),
                    description:"H\n\r" +(Math.round(min+(max-min)*v[0]/254)/100).toFixed(0)    // fixme:单位百帕
                }));
            let clickedLayer=this.map.getLayer('isolineHLPoints');
            if(clickedLayer){
                this.map.setLayoutProperty('isolineHLPoints', 'visibility', 'visible');
                this.map.getSource('isolineHLPoints').setData(turf.featureCollection(ps));
            }else {
                /*this.map.addLayer({
                    'id': 'isolineHLPoints',
                    'type': 'circle',
                    "source": {
                        "type": "geojson",
                        "data": turf.featureCollection(ps)
                    },
                    'layout': {
                        'visibility': 'visible'
                    },
                    'paint': {
                        "circle-radius":  {
                            'base': 3,
                            'stops': [[2,3],[6, 5]]
                        },
                        /!*"circle-color": "#e8c305",*!/
                        "circle-color":
                        /!*{
                            'type': 'identity',
                            'property': 'color'
                        }*!/
                            [
                                'match',
                                ['get', 'v'],
                                -1, '#E8161C',
                                1, '#08FF08',
                                /!* other *!/ '#ccc'
                            ],
                        "circle-opacity":1
                    }
                });*/
                this.map.addLayer({
                    'id': 'isolineHLPoints',
                    'type': 'symbol',
                    "source": {
                        "type": "geojson",
                        "data": turf.featureCollection(ps)
                    },
                    'layout': {
                        'visibility': 'visible',
                        // "text-size": 12,
                        "text-size" : {
                            'base': 13,
                            'stops': [[2,15],[3,14],[4, 13]]
                        },
                        "text-field": "{description}",
                        // "text-allow-overlap":true
                    },
                    'paint': {
                        "text-color": [
                            'match',
                            ['get', 'v'],
                            -1, '#E8161C',
                            1, '#08FF08',
                            /* other */ '#ccc'
                        ]
                    }
                });
            }

            this.gl.useProgram(this.program);
            this.meteo = meteo;
            // 形成数据纹理
            const dataTexture =this.dataTexture=createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
            this.gl.uniform1i(this.program.u_data, TEXTURE_INDEX_DATA);
            this.gl.uniform3fv(this.program.u_lon, meteo.lon);
            this.gl.uniform3fv(this.program.u_lat, meteo.lat);
            this.gl.uniform1fv(this.program["u_kernel[0]"], new Float32Array([1.0/16.0,2.0/16.0,1.0/16.0,
                                                                            2.0/16.0,2.0/16.0,2.0/16.0,
                                                                            1.0/16.0,2.0/16.0,1.0/16.0]));

            this.gl.useProgram(this.program1);
            this.gl.uniform2fv(this.program1.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.program1.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);
            // this.cmm=[Math.pow((Math.pow(meteo.minAndMax[0][0],2)+Math.pow(vector ? meteo.minAndMax[1][0]:0,2)),0.5), Math.pow((Math.pow(meteo.minAndMax[0][1],2)+Math.pow(vector ? meteo.minAndMax[1][1]:0,2)),0.5)];
            if(vector){      // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
                this.cmm=[Math.pow((Math.pow(meteo.minAndMax[0][0],2)+Math.pow(vector ? meteo.minAndMax[1][0]:0,2)),0.5), Math.pow((Math.pow(meteo.minAndMax[0][1],2)+Math.pow(vector ? meteo.minAndMax[1][1]:0,2)),0.5)];
            }else{
                this.cmm=[meteo.minAndMax[0][0], meteo.minAndMax[0][1]];
            }
            this.imageNum-=1;
            this._render();

            //数据标准化，避免反复操作不一致
            function standard(data,h,w,min,max,step) {
                const re = new Uint8ClampedArray(h*(w-1));//去掉相等的180
                const low = Math.floor(min/step);
                const ratio = (max-min)/254;
                let i = 0;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w-1; x++) {
                        re[i] = (min+data[(y*w+x)*4]*ratio)/step-low;
                        i++;
                    }
                }
                return re;
            }

            function polygon(data, h, w,info) {
                // const info = [];//[start,isLow,isHigh]
                let index = 0;
                let infoIndex = 0;
                const re = new Uint16Array(h*w);
                const k0 = new Uint8Array(6);
                const k1 = new Uint16Array(3);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        refreshK0(k0,data,h,w,y,x);
                        refreshK1(k1,re,h,w,y,x);
                        //判断连接，刷新，如果刷新需要重新刷新k1
                        const lk = link(k0,k1,re,info,index);
                        if(lk!==-1){
                            refreshK1(k1,re,h,w,y,x);
                            infoIndex = lk;
                        }
                        // const low = (k0[0]!==255&&k0[3]<k0[0])||(k0[0]!==255&&k0[3]<k0[1])||(k0[0]!==255&&k0[3]<k0[2]);
                        // const high =(k0[0]!==255&&k0[3]>k0[0])||(k0[0]!==255&&k0[3]>k0[1])||(k0[0]!==255&&k0[3]>k0[2]);
                        const low = k0.findIndex(val=>val!==255&&val>k0[3])!==-1;
                        const high = k0.findIndex(val=>val!==255&&val<k0[3])!==-1;
                        const ki = k0.findIndex(val=>val===k0[3]);
                        if(ki===3||k1[2]===0xffff||index===0){
                            re[index]=infoIndex;
                            if(infoIndex<info.length)
                                info[infoIndex]=[index,low,high];
                            else
                                info.push([index,low,high]);
                            infoIndex = info.length;
                        }else{
                            const val = k1[ki];
                            re[index]=val;
                            info[val][1] = info[val][1]||low;
                            info[val][2] = info[val][2]||high;
                        }
                        index++;
                    }
                    //判断收尾是否相连
                    const re0 = re[y*w];
                    const re1 = re[(y+1)*w-1];
                    if(data[y*w]===data[(y+1)*w-1]&&re0!==re1){
                        //替换起始位置靠后的
                        const from = info[re0][0]<info[re1][0]?re1:re0;
                        const to = info[re0][0]<info[re1][0]?re0:re1;
                        infoIndex = linkInfo(re,info,from,to,index);
                    }
                }
                return re;

                function link(k0,k1,data,info,index) {
                    if(k0[1]===255||k1[2]===0xffff||k0[1]!==k0[2]||k1[1]===k1[2])
                        return -1;
                    //替换起始位置靠后的
                    const from = info[k1[1]][0]<info[k1[2]][0]?k1[2]:k1[1];
                    const to = info[k1[1]][0]<info[k1[2]][0]?k1[1]:k1[2];
                    return linkInfo(data,info,from,to,index);
                }

                function linkInfo(data,info,from,to,index) {
                    for (let i = info[from][0]; i < index; i++) {
                        if(data[i]===from)data[i]=to;
                    }
                    info[to][1] = info[to][1]||info[from][1];
                    info[to][2] = info[to][2]||info[from][2];
                    info[from] = null;
                    return from;
                }

                function refreshK0(kernel,data,h,w,y,x){
                    // 0 1
                    // 2 3 4
                    //   5
                    //4,5后加，修正low和high
                    const py = y-1;
                    const px = x>0?x-1:w-1;
                    kernel[0]=y-1<0?255:data[py*w+px];
                    kernel[1]=y-1<0?255:data[py*w+x];
                    kernel[2]=data[y*w+px];
                    kernel[3]=data[y*w+x];
                    kernel[4]=data[y*w+((x+1)===w?0:(x+1))];
                    kernel[5]=data[((y+1)===h?y:(y+1))*w+x];
                }

                function refreshK1(kernel,data,h,w,y,x){
                    const py = y-1;
                    const px = x>0?x-1:w-1;
                    kernel[0]=y-1<0?0xffff:data[py*w+px];
                    kernel[1]=y-1<0?0xffff:data[py*w+x];
                    kernel[2]=x===0?0xffff:data[y*w+px];
                }
            }
        });
    }


    initFramebufferObject(gl) {
        let framebuffer, texture;

        // Create a frame buffer object (FBO)
        // fixme:(1)gl.createFramebuffer()：创建帧缓冲区对象
        framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            console.log('Failed to create frame buffer object');
            gl.deleteFramebuffer(framebuffer);
        }

        // Create a texture object and set its size and parameters
        // fixme:(2)创建纹理对象并设置其尺寸和参数
        texture = gl.createTexture(); // Create a texture object
        if (!texture) {
            console.log('Failed to create texture object');
            gl.deleteTexture(texture);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
        // fixme:将纹理的尺寸设为OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT，比<canvas>略小一些，以加快绘制的速度
        // fixme:gl.texImage2D()函数可以为纹理对象分配一块存储纹理图像的区域，供WebGL在其中进行绘制
        // fixme:调用该函数，将最后一个参数设为null，就可以创建一块空白的区域。第5章中这个参数是传入的纹理图像Image对象。
        // fixme:将创建出来的纹理对象存储在framebuffer.texture属性上，以便稍后访问
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.gl.canvas.width, this.gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Attach the texture and the renderbuffer object to the FBO
        // fixme:(5)使用帧缓冲区对象的方式与使用渲染缓冲区类似：先将缓冲区绑定到目标上，然后通过操作目标来操作缓冲区对象，而不能直接操作缓冲区对象
        // fixme:gl.bindFramebuffer(target,framebuffer)：将framebuffer指定的帧缓冲区对象绑定到target目标上。如果framebuffer为null，那么已经绑定到target目标上的帧缓冲区对象将被解除绑定
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数framebuffer：指定被绑定的帧缓冲区对象
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);   // fixme：必须先绑定帧缓冲区(这步在步骤里是最后一步，但这里还是得用)
        // fixme:本例使用一个纹理对象来替代颜色缓冲区，所以就将这个纹理对象指定为帧缓冲区的颜色关联对象
        // fixme:gl.framebufferTexture2D(target,attachment,textarget,texture,level)：将texture指定的纹理对象关联到绑定在target目标上的帧缓冲区
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数attachment：指定关联的类型
        // fixme:参数attachment=gl.COLOR_ATTACHMENT0时，表示texture是颜色关联对象
        // fixme:参数attachment=gl.DEPTH_ATTACHMENT时，表示texture是深度关联对象
        // fixme:参数textarget：同第二步的gl.texImage2D()的第1个参数(gl.TEXTURE_2D或gl.TEXTURE_CUBE)
        // fixme:参数texture：指定关联的纹理对象
        // fixme:参数level：指定为0(在使用MIPMAP时纹理时指定纹理的层级)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        framebuffer.texture = texture; // fixme:保存纹理对象 // Store the texture object

        // Check if FBO is configured correctly
        // fixme:(7)检查帧缓冲区是否正确配置
        // fixme:gl.checkFramebufferStatus(target)：检查绑定在target上的帧缓冲区对象的配置状态
        // fixme:参数target：必须是gl.FRAMEBUFFER
        let e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (gl.FRAMEBUFFER_COMPLETE !== e) {
            console.log('Frame buffer object is incomplete: ' + e.toString());
            return error();
        }

        // Unbind the buffer object
        // fixme:这里也是全清空了
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return framebuffer;
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

    _frame() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;
        // fixme:(1)帧缓冲区热力图
        // fixme:重要:将纹理对象绑定到纹理单元上
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEBUFFER); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fbo.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        // fixme:gl.viewport(x, y, width, height)==>用来设置视口，即指定从标准设备到窗口坐标的x、y仿射变换
        // x：GLint，用来设定视口的左下角水平坐标。默认值：0。
        // y：GLint，用来设定视口的左下角垂直坐标。默认值：0。
        // width：非负数Glsizei，用来设定视口的宽度。默认值：canvas的宽度。
        // height：非负数Glsizei，用来设定视口的高度。默认值：canvas的高度。
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_DATA);
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.uniformMatrix4fv(this.program.u_matrix_invert, false, this._matrixInvert());
        this.gl.uniform2fv(this.program.u_textureSize, [this.gl.canvas.width, this.gl.canvas.height]);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // fixme:(2)帧缓冲区等值线
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEISOLINE); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboIsoline.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboIsoline);

        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program1);
        bindAttribute(gl, this.posBuffer, this.program1.a_pos, 2);
        bindAttribute(gl, this.texBuffer, this.program1.a_texCoord, 2);
        gl.uniform1i(this.program1.u_frameImage, TEXTURE_FRAMEBUFFER);
        this.gl.uniform1f(this.program1.u_isoline, this.fontInfo.isolineValue);
        //初始化静态信息
        this.gl.uniform2fv(this.program1.u_textureSize, [this.gl.canvas.width, this.gl.canvas.height]);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        // console.time("mark");
        let perFontWidth=Math.floor(this.gl.drawingBufferWidth/this.fontInfo.fontWidthNumber);
        let perFontHeight=Math.floor(this.gl.drawingBufferHeight/this.fontInfo.fontHeightNumber);
        let fontArray=[];

        // fixme:1:一次性readPixels
        // fixme:1-1:所有位置筛选
        /*this.gl.readPixels(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
        for(let heightNumber=0;heightNumber<this.fontInfo.fontHeightNumber;heightNumber++){
            for(let widthNumber=0;widthNumber<this.fontInfo.fontWidthNumber;widthNumber++){
                for(let y=0;y<perFontHeight;y++){
                    if(heightNumber*this.fontInfo.fontWidthNumber+widthNumber+1===fontArray.length){
                        break;
                    }
                    for(let x=0;x<perFontWidth;x++){
                        let indexX=perFontWidth*widthNumber+x;
                        let indexY=perFontHeight*heightNumber+y;
                        let pixelsIndex=(indexY*this.gl.drawingBufferWidth+indexX)*4;
                        if(this.pixels[pixelsIndex]!==0||this.pixels[pixelsIndex+1]!==0||this.pixels[pixelsIndex+2]!==0||this.pixels[pixelsIndex+3]!==0){
                            let rate=(this.pixels[pixelsIndex]*1.0+this.pixels[pixelsIndex+1]/256.0+this.pixels[pixelsIndex+2]/(256.0*256.0)+this.pixels[pixelsIndex+3]/(256.0*256.0*256.0))/255.0;
                            fontArray.push([pixelsIndex/4,Math.round((rate*(this.cmm[1]-this.cmm[0])+this.cmm[0])/this.fontInfo.isolineValue)*this.fontInfo.isolineValue]);
                            break;
                        }else if(x===perFontWidth-1&&y===perFontHeight-1){
                            fontArray.push(-1);
                            break;
                        }
                    }
                }
            }
        }*/
        // fixme:1-2:留上下左右边缘，防止数值重叠
        this.gl.readPixels(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
        for(let heightNumber=0;heightNumber<this.fontInfo.fontHeightNumber;heightNumber++){
            for(let widthNumber=0;widthNumber<this.fontInfo.fontWidthNumber;widthNumber++){
                for(let y=0+Math.floor(perFontHeight/5);y<perFontHeight-Math.floor(perFontHeight/5);y++){
                    if(heightNumber*this.fontInfo.fontWidthNumber+widthNumber+1===fontArray.length){
                        break;
                    }
                    for(let x=0+Math.floor(perFontWidth/5);x<perFontWidth-Math.floor(perFontWidth/5);x++){
                        let indexX=perFontWidth*widthNumber+x;
                        let indexY=perFontHeight*heightNumber+y;
                        let pixelsIndex=(indexY*this.gl.drawingBufferWidth+indexX)*4;
                        if(this.pixels[pixelsIndex]!==0||this.pixels[pixelsIndex+1]!==0||this.pixels[pixelsIndex+2]!==0||this.pixels[pixelsIndex+3]!==0){
                            let rate=(this.pixels[pixelsIndex]*1.0+this.pixels[pixelsIndex+1]/256.0+this.pixels[pixelsIndex+2]/(256.0*256.0)+this.pixels[pixelsIndex+3]/(256.0*256.0*256.0))/255.0;
                            fontArray.push([pixelsIndex/4,Math.round((rate*(this.cmm[1]-this.cmm[0])+this.cmm[0])/this.fontInfo.isolineValue)*this.fontInfo.isolineValue]);
                            break;
                        }else if(x===perFontWidth-1&&y===perFontHeight-1){
                            fontArray.push(-1);
                            break;
                        }
                    }
                }
            }
        }


        /*  // fixme:2:分批readPixels
        for(let i=0;i<this.fontInfo.fontWidthNumber*this.fontInfo.fontHeightNumber;i++){
            let heightNumber=Math.floor(i/this.fontInfo.fontWidthNumber);
            let widthNumber=i%this.fontInfo.fontWidthNumber;
            this.gl.readPixels(perFontWidth*widthNumber, perFontHeight*heightNumber,perFontWidth, perFontHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
            /!*!// fixme:2-2三角函数筛选
            for(let x=0;x<perFontWidth;x++){
                if(i+1===fontArray.length){
                    break;
                }
                let sinx=Math.sin(x/perFontWidth*4*Math.PI);
                let paramY=new Uint8Array([Math.floor((sinx+1)*perFontHeight/2)]);
                for(let y=0;y<paramY.byteLength;y++){
                    let indexX=x;
                    let indexY=paramY[y];
                    let pixelsIndex=(indexY*perFontWidth+indexX)*4;
                    if(this.pixels[pixelsIndex]!==0||this.pixels[pixelsIndex+1]!==0||this.pixels[pixelsIndex+2]!==0||this.pixels[pixelsIndex+3]!==0){
                        let rate=(this.pixels[pixelsIndex]*1.0+this.pixels[pixelsIndex+1]/256.0+this.pixels[pixelsIndex+2]/(256.0*256.0)+this.pixels[pixelsIndex+3]/(256.0*256.0*256.0))/255.0;
                        fontArray.push([(perFontHeight*heightNumber+y)*this.gl.drawingBufferWidth+(perFontWidth*widthNumber+x),
                            Math.round((rate*(this.cmm[1]-this.cmm[0])+this.cmm[0])/this.fontInfo.isolineValue)*this.fontInfo.isolineValue]);
                        break;
                    }else if(x===perFontWidth-1&&y===perFontHeight-1){
                        fontArray.push(-1);
                        break;
                    }
                }
            }*!/

            // fixme:2-1:遍历所有筛选
            for(let y=0;y<perFontHeight;y+=Math.floor(perFontHeight/40)){
                if(i+1===fontArray.length){
                    break;
                }
                for(let x=0;x<perFontWidth;x+=Math.floor(perFontWidth/40)){
                    let indexX=x;
                    let indexY=y;
                    let pixelsIndex=(indexY*perFontWidth+indexX)*4;
                    if(this.pixels[pixelsIndex]!==0||this.pixels[pixelsIndex+1]!==0||this.pixels[pixelsIndex+2]!==0||this.pixels[pixelsIndex+3]!==0){
                        let rate=(this.pixels[pixelsIndex]*1.0+this.pixels[pixelsIndex+1]/256.0+this.pixels[pixelsIndex+2]/(256.0*256.0)+this.pixels[pixelsIndex+3]/(256.0*256.0*256.0))/255.0;
                        fontArray.push([(perFontHeight*heightNumber+y)*this.gl.drawingBufferWidth+(perFontWidth*widthNumber+x),
                            Math.round((rate*(this.cmm[1]-this.cmm[0])+this.cmm[0])/this.fontInfo.isolineValue)*this.fontInfo.isolineValue]);
                        break;
                    }else if(x===perFontWidth-1&&y===perFontHeight-1){
                        fontArray.push(-1);
                        break;
                    }
                }
            }
        }*/

        // console.timeEnd("mark");
        this.fontPositions=[];
        this.fontTexcoords=[];
        this.fontNumVertices=0;
        /*for(let i=0;i<fontArray.length;i++){
            if(fontArray[i].length===2){
                this.makeVerticesForString(this.fontInfo,fontArray[i]);
            }
        }*/
        this.showVerticesWithMapbox(this.fontInfo,fontArray);

        // fixme:(3)颜色缓冲区文字显示
        // todo:为什么不做第四步，而直接在第三步就显示出来的话，readPixels总读不出来数？？？？？？？？
        /*this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEFONT); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboFont.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboFont);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programFont);
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_INDEX_NUMBERS); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.numTexture); // fixme:这里放的是帧缓冲区的纹理图像
        this.gl.uniform1i(this.programFont.u_numbers, TEXTURE_INDEX_NUMBERS);
        //初始化静态信息
        const posBufferFont = createBuffer(gl, new Float32Array(this.fontPositions));
        bindAttribute(gl, posBufferFont, this.programFont.a_position, 2);
        const texBufferFont = createBuffer(gl, new Float32Array(this.fontTexcoords));
        bindAttribute(gl, texBufferFont, this.programFont.a_texCoord, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, this.fontNumVertices);*/

        // fixme:(4)颜色缓冲区文字显示+等值线显示
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programAll);
        bindAttribute(gl, this.posBuffer, this.programAll.a_position, 2);
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEISOLINE); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboIsoline.texture); // fixme:这里放的是帧缓冲区的纹理图像
        this.gl.uniform1i(this.programAll.u_frameIsoline, TEXTURE_FRAMEISOLINE);
        this.gl.uniform2fv(this.programAll.u_cmm, new Float32Array([this.cmm[0], this.cmm[1]]));
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEFONT); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboFont.texture); // fixme:这里放的是帧缓冲区的纹理图像
        this.gl.uniform1i(this.programAll.u_frameFont, TEXTURE_FRAMEFONT);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    makeVerticesForString(fontInfo, fontArray) {
        let fontIndex=fontArray[0];
        let fontIndexX=2.0*(fontIndex%this.gl.canvas.width/this.gl.canvas.width)-1.0;
        let fontIndexY=2.0*(Math.floor(fontIndex/this.gl.canvas.width)/this.gl.canvas.height)-1.0;
        let s=fontArray[1].toString();
        let len = s.length;
        let numVertices = len * 6;
        let positions = new Float32Array(numVertices * 2);
        let texcoords = new Float32Array(numVertices * 2);
        let offset = 0;
        let maxX = fontInfo.textureWidth;
        let maxY = fontInfo.textureHeight;
        // fixme:偏移半个长宽==>显示在中心
        let x = fontIndexX-fontInfo.letterWidth*len/maxX*(this.fontInfo.fontWidthNumberRate/this.fontInfo.fontWidthNumber);
        let y=fontIndexY-fontInfo.letterHeight/maxY*(this.fontInfo.fontHeightNumberRate/this.fontInfo.fontHeightNumber);
        let y2=y+fontInfo.letterHeight/maxY*this.fontInfo.fontHeightNumberRate/this.fontInfo.fontHeightNumber*2;

        for (let ii = 0; ii < len; ++ii) {
            let letter = s[ii];
            let glyphInfo = fontInfo.glyphInfos[letter];
            if (glyphInfo) {
                x = x ;
                let x2 = x + glyphInfo.width/maxX*(this.fontInfo.fontWidthNumberRate/this.fontInfo.fontWidthNumber*2);
                let u1 = glyphInfo.x / maxX;
                let v1 = (glyphInfo.y + fontInfo.letterHeight) / maxY;
                let u2 = (glyphInfo.x + glyphInfo.width) / maxX;
                let v2 = glyphInfo.y / maxY;

                // 6 vertices per letter
                positions[offset + 0] = x;
                positions[offset + 1] = y;
                texcoords[offset + 0] = u1;
                texcoords[offset + 1] = v1;

                positions[offset + 2] = x2;
                positions[offset + 3] = y;
                texcoords[offset + 2] = u2;
                texcoords[offset + 3] = v1;

                positions[offset + 4] = x;
                positions[offset + 5] = y2;
                texcoords[offset + 4] = u1;
                texcoords[offset + 5] = v2;

                positions[offset + 6] = x;
                positions[offset + 7] = y2;
                texcoords[offset + 6] = u1;
                texcoords[offset + 7] = v2;

                positions[offset + 8] = x2;
                positions[offset + 9] = y;
                texcoords[offset + 8] = u2;
                texcoords[offset + 9] = v1;

                positions[offset + 10] = x2;
                positions[offset + 11] = y2;
                texcoords[offset + 10] = u2;
                texcoords[offset + 11] = v2;

                x = x2;
                offset += 12;
            } else {
                // we don't have this character so just advance
                x += fontInfo.spaceWidth/maxX*(this.gl.canvas.width/this.fontInfo.fontWidthNumber)/this.gl.canvas.width;
            }
        }
        // return ArrayBufferViews for the portion of the TypedArrays
        // that were actually used.
        this.fontPositions.push(...Array.apply( [], positions ));
        this.fontTexcoords.push(...Array.apply( [], texcoords ));
        this.fontNumVertices+=offset / 2;
    }

    showVerticesWithMapbox(fontInfo, fontArrays) {
        this.geojson1 = {
            "type": "FeatureCollection",
            "features": []
        };
        let martix=this._matrixInvert();
        for(let i=0;i<fontArrays.length;i++){
            let fontArray=fontArrays[i];
            if(fontArray.length===2){
                let fontIndex=fontArray[0];
                let fontIndexX=2.0*(fontIndex%this.gl.canvas.width/this.gl.canvas.width)-1.0;
                let fontIndexY=2.0*(Math.floor(fontIndex/this.gl.canvas.width)/this.gl.canvas.height)-1.0;
                let x=fontIndexX;
                let y=fontIndexY;
                const p0 = mat4.identity(new Float32Array(4)); // 定义为单元阵
                const p1 = mat4.identity(new Float32Array(4)); // 定义为单元阵
                mat4.multiply(p0, martix, new Float32Array([x,y,0,1]));
                mat4.multiply(p1, martix, new Float32Array([x,y,1,1]));
                for(let ii=0;ii<4;ii++){
                    p0[ii]/=p0[3];
                    p1[ii]/=p1[3];
                }
                let t= (p0[2]===p1[2]?0.0:(0.0 - p0[2])/(p1[2] - p0[2]));
                const tp=new Float32Array([p0[0]*(1-t)+p1[0]*t,p0[1]*(1-t)+p1[1]*t]);
                if(tp[1]<1.0&&tp[1]>0.0){
                    let lon = -180.0*(1-tp[0])+180.0*tp[0];
                    let lat = (Math.atan((Math.exp(Math.PI*(1.0-2.0*tp[1]))-Math.exp(-Math.PI*(1.0-2.0*tp[1])))/2.0))* 180.0 / Math.PI;
                    this.geojson1.features.push({
                        "type": "Feature",
                        "properties": {
                            "description": fontArray[1]/100,    // 单位是百帕
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lon,lat]
                        }
                    });
                }
            }
        }
        let clickedLayer=this.map.getLayer('isolineFont');
        if(clickedLayer){
            this.map.setLayoutProperty('isolineFont', 'visibility', 'visible');
            this.map.getSource('isolineFont').setData(this.geojson1);
        }else {
            this.map.addLayer({
                'id': 'isolineFont',
                'type': 'symbol',
                "source": {
                    "type": "geojson",
                    "data": this.geojson1
                },
                'layout': {
                    'visibility': 'visible',
                    // "text-size": 12,
                    "text-size" : {
                        'base': 10,
                        'stops': [[2,12],[3,11],[4, 10]]
                    },
                    "text-field": "{description}",
                    // "text-allow-overlap":true
                },
                'paint': {
                    "text-color": "#10f5ff"
                }
            });
        }
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