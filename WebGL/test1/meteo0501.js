// fixme:等值线+mapbox显示气压相对高点和相对低点
const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_FRAMEBUFFER = 2;
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
            /*float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));  //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);    // 通过色卡横坐标val得到色卡纹理坐标
            vec4 color = texture2D(u_color,vec2(colorPos,1.0));
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0))*u_opacity;  // vec4(color.rgb,color.a*u_opacity);//texture2D(u_color,vec2(colorPos,1.0));*/
            
            /*vec2 val = texture2D(u_data, c).xy*PREC;
            const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
            const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
            vec4 val1 = fract(val.x * bitShift); 
            val1 -= val1.gbaa * bitMask; 
            vec4 val2 = fract(val.y * bitShift); 
            val2 -= val2.gbaa * bitMask; 
            gl_FragColor = vec4(val1.x,val2.x,val1.y,val2.y);*/
            
            /*vec2 point[4];
            vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
            point[0]=c + vec2(-onePixel.x, onePixel.y);
            point[1]=c + vec2(onePixel.x, -onePixel.y);
            point[2]=c + vec2(onePixel.x, onePixel.y);
            point[3]=c + vec2(-onePixel.x, -onePixel.y);
            float t=0.25;
            float invT = 1.0 - t;
            vec2 P = point[0] * pow(invT,3.0) +point[1] * 3.0 * t * pow(invT,2.0) +point[2] * 3.0 * invT * pow(t,2.0) +point[3] * pow(t,3.0);
            
            vec2 val = texture2D(u_data, P).xy*PREC;
            const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
            const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
            vec4 val1 = fract(val.x * bitShift); 
            val1 -= val1.gbaa * bitMask; 
            vec4 val2 = fract(val.y * bitShift); 
            val2 -= val2.gbaa * bitMask; 
            gl_FragColor = vec4(val1.x,val2.x,val1.y,val2.y);*/
            
            /*vec2 point[4];
            vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
//            point[0]=c + vec2(-onePixel.x, onePixel.y);
//            point[1]=c + vec2(onePixel.x, -onePixel.y);
//            point[2]=c + vec2(onePixel.x, onePixel.y);
//            point[3]=c + vec2(-onePixel.x, -onePixel.y);
            point[0]=vec2(floor(c.x*u_textureSize.x)/u_textureSize.x,ceil(c.y*u_textureSize.y)/u_textureSize.y);
            point[1]=vec2(ceil(c.x*u_textureSize.x)/u_textureSize.x,floor(c.y*u_textureSize.y)/u_textureSize.y);
            point[2]=vec2(ceil(c.x*u_textureSize.x)/u_textureSize.x,ceil(c.y*u_textureSize.y)/u_textureSize.y);
            point[3]=vec2(floor(c.x*u_textureSize.x)/u_textureSize.x,floor(c.y*u_textureSize.y)/u_textureSize.y);
            // 气压值大小
            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));
            vec2 value[4];
            value[0]=mix(u_min,u_max,texture2D(u_data, point[0]).xy*PREC);
            value[1]=mix(u_min,u_max,texture2D(u_data, point[1]).xy*PREC);
            value[2]=mix(u_min,u_max,texture2D(u_data, point[2]).xy*PREC);
            value[3]=mix(u_min,u_max,texture2D(u_data, point[3]).xy*PREC);
            // 卷积因数
            float kernel[4];
//            kernel[0]=1.0/(pow((value[0]-val)/(value[0]-value[1]),2.0));
//            kernel[1]=1.0/(pow((value[1]-val)/(value[0]-value[1]),2.0));
//            kernel[2]=1.0/(pow((value[2]-val)/(value[2]-value[3]),2.0));
//            kernel[3]=1.0/(pow((value[3]-val)/(value[2]-value[3]),2.0));
            kernel[0]=1.0/(pow(length(c-point[0]),1.0));
            kernel[1]=1.0/(pow(length(c-point[1]),1.0));
            kernel[2]=1.0/(pow(length(c-point[2]),1.0));
            kernel[3]=1.0/(pow(length(c-point[3]),1.0));
            
            vec2 p;
//            if(abs(value[0]-value[1])>abs(value[2]-value[3])){
//                if(abs(val-value[0])>abs(val-value[1])){
//                    p=(point[1]*kernel[1]+point[2]*kernel[2]+point[3]*kernel[3])/(kernel[1]+kernel[2]+kernel[3]);
//                }else{
//                    p=(point[0]*kernel[0]+point[2]*kernel[2]+point[3]*kernel[3])/(kernel[0]+kernel[2]+kernel[3]);
//                }
//            }else{
//                if(abs(val-value[2])>abs(val-value[3])){
//                    p=(point[0]*kernel[0]+point[1]*kernel[1]+point[3]*kernel[3])/(kernel[0]+kernel[1]+kernel[3]);
//                }else{
//                    p=(point[0]*kernel[0]+point[1]*kernel[1]+point[2]*kernel[2])/(kernel[0]+kernel[1]+kernel[2]);
//                }
//            }
            if(length(value[0]-value[1])>length(value[2]-value[3])){
                if(inTriangle(c,point[1],point[2],point[3])){
                    p=(value[1]*kernel[1]+value[2]*kernel[2]+value[3]*kernel[3])/(kernel[1]+kernel[2]+kernel[3]);
                }else{
                    p=(value[0]*kernel[0]+value[2]*kernel[2]+value[3]*kernel[3])/(kernel[0]+kernel[2]+kernel[3]);
                }
            }else{
                if(inTriangle(c,point[0],point[1],point[3])){
                    p=(value[0]*kernel[0]+value[1]*kernel[1]+value[3]*kernel[3])/(kernel[0]+kernel[1]+kernel[3]);
                }else{
                    p=(value[0]*kernel[0]+value[1]*kernel[1]+value[2]*kernel[2])/(kernel[0]+kernel[1]+kernel[2]);
                }
            }
            
            vec2  interpolationVal = (p-u_min)/(u_max-u_min);
            const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
            const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
            vec4 val1 = fract(interpolationVal.x * bitShift); 
            val1 -= val1.gbaa * bitMask; 
            vec4 val2 = fract(interpolationVal.y * bitShift); 
            val2 -= val2.gbaa * bitMask; 
            gl_FragColor = vec4(val1.x,val2.x,val1.y,val2.y);*/
    
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
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道 
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
        // kernel[i] = floor(length(mix(u_min,u_max,vec2(val1,val2)))/500.0);
        vec2 eachValue=mix(u_min,u_max,vec2(val1,val2));
        // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
        if(isVector){       // fixme：双通道
            kernel[i] = floor(length(eachValue)/500.0);
        }else{      // fixme：单通道
            kernel[i] = floor(eachValue[0]/500.0);
        }
    }
    if(!(kernel[0]==kernel[1]&&kernel[1]==kernel[2]&&kernel[2]==kernel[3])){
        gl_FragColor =vec4(1.0,1.0,1.0,1.0);
    }
     
    /*vec4 val=texture2D(u_frameImage, v_texCoord);
    float val1 = unpackDepth(vec4(val.x,val.z,0.0,0.0)); 
    float val2 = unpackDepth(vec4(val.y,val.w,0.0,0.0)); 
    float kernel1 = mod(length(mix(u_min,u_max,vec2(val1,val2))),500.0);
    if(kernel1<10.0){
        gl_FragColor = vec4(1.0,1.0,1.0,1.0);
    }*/
    
    /*vec2 point[4];
    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    point[0]=v_texCoord + vec2(-onePixel.x, 0.0);
    point[1]=v_texCoord + vec2(onePixel.x, 0.0);
    point[2]=v_texCoord + vec2(0.0, onePixel.y);
    point[3]=v_texCoord + vec2(0.0, -onePixel.y);
    float t=0.25;
    float invT = 1.0 - t;
    vec2 P = point[0] * pow(invT,3.0) +point[1] * 3.0 * t * pow(invT,2.0) +point[2] * 3.0 * invT * pow(t,2.0) +point[3] * pow(t,3.0);
    
    vec4 val=texture2D(u_frameImage, P);
    float val1 = unpackDepth(vec4(val.x,val.z,0.0,0.0)); 
    float val2 = unpackDepth(vec4(val.y,val.w,0.0,0.0)); 
    float kernel1 = mod(length(mix(u_min,u_max,vec2(val1,val2))),500.0);
    if(kernel1<5.0){
        gl_FragColor = vec4(1.0,1.0,1.0,1.0);
    }*/
    
//    gl_FragColor = texture2D(u_frameImage,v_texCoord);
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
        const vertShader = createShader(gl, gl.VERTEX_SHADER, vert);
        const fragShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
        this.program = createProgram(gl, vertShader, fragShader);

        const vertShader1 = createShader(gl, gl.VERTEX_SHADER, vert1);
        const fragShader1 = createShader(gl, gl.FRAGMENT_SHADER, frag1);
        this.program1 = createProgram(gl, vertShader1, fragShader1);

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

    judgeHighOrLowPoints(highOrLow,width,height,currentIndex,leftIndex,rightIndex,topIndex,bottomIndex,data){
        if(highOrLow=="high"){
            if(leftIndex>0&&leftIndex<height*width*4){
                if(data[leftIndex+3]==255&&data[currentIndex]<data[leftIndex]){     // (1)有数据并且(2)大于等于那个中心点==>反着判断
                    return false;
                }
            }
            if(rightIndex>0&&rightIndex<height*width*4){
                if(data[rightIndex+3]==255&&data[currentIndex]<data[rightIndex]){
                    return false;
                }
            }
            if(topIndex>0&&topIndex<height*width*4){
                if(data[topIndex+3]==255&&data[currentIndex]<data[topIndex]){
                    return false;
                }
            }
            if(bottomIndex>0&&bottomIndex<height*width*4){
                if(data[bottomIndex+3]==255&&data[currentIndex]<data[bottomIndex]){
                    return false;
                }
            }
            return true;
        }else if(highOrLow=="low"){
            if(leftIndex>0&&leftIndex<height*width*4){
                if(data[leftIndex+3]==255&&data[currentIndex]>data[leftIndex]){
                    return false;
                }
            }
            if(rightIndex>0&&rightIndex<height*width*4){
                if(data[rightIndex+3]==255&&data[currentIndex]>data[rightIndex]){
                    return false;
                }
            }
            if(topIndex>0&&topIndex<height*width*4){
                if(data[topIndex+3]==255&&data[currentIndex]>data[topIndex]){
                    return false;
                }
            }
            if(bottomIndex>0&&bottomIndex<height*width*4){
                if(data[bottomIndex+3]==255&&data[currentIndex]>data[bottomIndex]){
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    showHLWithMapbox(meteo){
        let data=meteo.data;
        let height=meteo.height;
        let width=meteo.width;
        let lon=meteo.lon;
        let lat=meteo.lat;
        let geojson = {
            "type": "FeatureCollection",
            "features": []
        };
        let geojson1 = {
            "type": "FeatureCollection",
            "features": []
        };
        for(let y=0;y<height;y++){
            for(let x=0;x<width;x++){
                // fixme:XXXIndex==>在data中的索引
                let currentIndex=width*y*4+x*4;
                if(data[currentIndex+3]==255) {   // 有数据的情况下==>a=1.0
                    let leftIndex = currentIndex - 1 * 4;
                    let rightIndex = currentIndex + 1 * 4;
                    let topIndex = currentIndex - width * 1 * 4;
                    let bottomIndex = currentIndex + width * 1 * 4;
                    if(data[currentIndex]>=204||data[currentIndex]<=50){
                        let highPoint=this.judgeHighOrLowPoints("high",width,height,currentIndex,leftIndex,rightIndex,topIndex,bottomIndex,data);
                        let lowPoint=this.judgeHighOrLowPoints("low",width,height,currentIndex,leftIndex,rightIndex,topIndex,bottomIndex,data);
                        if(highPoint||lowPoint){
                            geojson.features.push({
                                "type": "Feature",
                                "properties": {
                                    // "color": highPoint?"#E8161C":(lowPoint?"#08FF08":"#FFFFFF")
                                    "color": highPoint?"E8161C":(lowPoint?"08FF08":"#FFFFFF"),
                                    "description": data[currentIndex],
                                },
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [lon[0]+lon[2]*x,lat[0]+lat[2]*y]
                                }
                            });
                        }
                    }
                    if((lon[0]+lon[2]*x)>=-180&&(lon[0]+lon[2]*x)<=-90&&(lat[0]+lat[2]*y)>=-90&&(lat[0]+lat[2]*y)<=-45){
                        geojson1.features.push({
                            "type": "Feature",
                            "properties": {
                                "description": data[currentIndex].toFixed(1),
                            },
                            "geometry": {
                                "type": "Point",
                                "coordinates": [lon[0]+lon[2]*x,lat[0]+lat[2]*y]
                            }
                        });
                    }

                    /*if(data[currentIndex]===254||data[currentIndex]===0){
                        geojson.features.push({
                            "type": "Feature",
                            "properties": {
                                "color": data[currentIndex]===254?"#E8161C":(data[currentIndex]===0?"#08FF08":"#FFFFFF"),
                            },
                            "geometry": {
                                "type": "Point",
                                "coordinates": [lon[0]+lon[2]*x,lat[0]+lat[2]*y]
                            }
                        });
                    }*/

            }
        }
    }

        var clickedLayer=this.map.getLayer('circleHLPoints');
        if(clickedLayer){
            this.map.setLayoutProperty('circleHLPoints', 'visibility', 'visible');
            this.map.getSource('circleHLPoints').setData(geojson);
        }else{
            this.map.addLayer({
                'id': 'circleHLPoints',
                'type': 'circle',
                "source": {
                    "type": "geojson",
                    "data": geojson
                },
                'layout': {
                    'visibility': 'visible',
                },
                'paint': {
                    "circle-radius":  {
                        'base': 3,
                        'stops': [[2,3],[6, 5]]
                    },
                    /*"circle-color": "#e8c305",*/
                    "circle-color":
                    /*{
                        'type': 'identity',
                        'property': 'color'
                    }*/
                    [
                        'match',
                        ['get', 'color'],
                        'E8161C', '#0a2be8',
                        '08FF08', '#ff1eb1',
                        /* other */ '#ccc'
                    ],
                    "circle-opacity":1
                }
            });

        }

        var clickedLayer=this.map.getLayer('typhoonWarningSymbol');
        if(clickedLayer){
            this.map.setLayoutProperty('typhoonWarningSymbol', 'visibility', 'visible');
            this.map.getSource('typhoonWarningSymbol').setData(geojson1);
        }else {
            this.map.addLayer({
                'id': 'typhoonWarningSymbol',
                'type': 'symbol',
                "source": {
                    "type": "geojson",
                    "data": geojson1
                },
                'layout': {
                    'visibility': 'visible',
                    "text-size": 15,
                    "text-field": "{description}",
                    "text-allow-overlap":true
                },
                'paint': {
                    "text-color": "#10f5ff"
                }
            });
        }
    }

    load(url, vector) {
        return MeteoImage.load(url).then((meteo) => {
            debugger;
            this.showHLWithMapbox(meteo);
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
            debugger
            this.gl.uniform1fv(this.program["u_kernel[0]"], new Float32Array([1.0/16.0,2.0/16.0,1.0/16.0,
                                                                            2.0/16.0,2.0/16.0,2.0/16.0,
                                                                            1.0/16.0,2.0/16.0,1.0/16.0]));

            this.gl.useProgram(this.program1);
            this.gl.uniform2fv(this.program1.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.program1.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);



            this.gl.useProgram(this.program);

            this._render();
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
        var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
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
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;

        const fbo=this.fbo = this.initFramebufferObject(this.gl);
        if (!fbo) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }
        // fixme:重要:将纹理对象绑定到纹理单元上
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEBUFFER); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, fbo.texture); // fixme:这里放的是帧缓冲区的纹理图像


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
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_COLOR);
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.activeTexture(gl.TEXTURE0+TEXTURE_INDEX_DATA);
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.uniformMatrix4fv(this.program.u_matrix_invert, false, this._matrixInvert());
        this.gl.uniform2fv(this.program.u_textureSize, [this.gl.canvas.width, this.gl.canvas.height]);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // fixme:将绘制目标切换为颜色缓冲区
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program1);
        gl.uniform1i(this.program1.u_frameImage, TEXTURE_FRAMEBUFFER);

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