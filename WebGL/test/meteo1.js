const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_VALUE = 1;

const vert = `
precision mediump float;
const float PI = 3.141592653589793;
attribute vec2 a_position;
uniform int u_size;
uniform vec3 u_coord;
uniform vec2 u_lon;
uniform vec2 u_lat;
varying vec2 v_coord;
float ms = exp2(u_coord.z);
float sinh(float val){
    return (exp(val)-exp(-val))/2.0;
}
float lon(float x){
    return (u_coord.x + (x + 1.0)/2.0)/ms*360.0 - 180.0;
}
float lat(float y){
    return atan(sinh(PI*(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms)))*180.0/PI;
}
void main(){
    float lon = lon(a_position.x);
    float lat = lat(a_position.y);
    v_coord = vec2((lon-u_lon.x)/(u_lon.y-u_lon.x),(lat-u_lat.x)/(u_lat.y-u_lat.x));
    gl_Position = vec4(v_coord.x*2.0,v_coord.y*2.0, 0, 1);
    // v_coord = vec2(lon,lat);
    // v_coord = a_position;
}`;

const frag = `
precision mediump float;
const vec4 nc = vec4(0,0,0,0);
uniform sampler2D u_value;
uniform sampler2D u_color;
uniform vec2 u_vmm;
uniform vec2 u_cmm;
varying vec2 v_coord;
bool valid(vec2 coord){
    return coord.x >= 0.0 && coord.x <= 1.0 && coord.y >= 0.0 && coord.y <= 1.0;
}
void main(){
    if(valid(v_coord)){
        vec4 val = texture2D(u_value,v_coord);
        float colorVal = u_vmm.x+val.x*(u_vmm.y-u_vmm.x);
        if(colorVal<u_cmm.x)
            colorVal = u_cmm.x;
        if(colorVal>u_cmm.y)
            colorVal = u_cmm.y;
        vec4 color = texture2D(u_color,vec2((colorVal-u_cmm.x)/(u_cmm.y-u_cmm.x),1.0));
        if(val.a != 0.0)
            gl_FragColor = color;
    }
}`;
class Meteo{
    constructor(tileSize) {
        this.tileSize = tileSize?tileSize:TILESIZE_DEFAULT;
        const gl = this.gl = document.getElementById("c").getContext("webgl");
        // this.canvas = document.createElement("canvas");
        // this.canvas.width = this.tileSize;
        // this.canvas.height = this.tileSize;
        // const gl = this.gl = this.canvas.getContext("webgl",{preserveDrawingBuffer: true});
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vert);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
        const program = this.program = createProgram(gl, vertexShader, fragmentShader);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_size"),this.tileSize);
        const posBuffer = createBuffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
        const posLoc = gl.getAttribLocation(program, "a_position");
        bindAttribute(gl,posBuffer,posLoc,2);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.useProgram(this.program);
    }

    setColor(color){
        const color2D = createColorRamp(color);
        const colorTexture = createTexture(this.gl,this.gl.LINEAR,color2D,TEXTURE_INDEX_COLOR,color2D.length/4,1);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_color"), TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.gl.getUniformLocation(this.program, "u_cmm"),new Float32Array([color[0][0],color[color.length-1][0]]));
    }

    load(url,vector){
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = ()=>{
                this._loadImage(image);
                resolve();
            };
            image.src = url;
        });
    }

    getVectorTile(x,y,z){
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, "u_coord"),x,y,z);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        return base64Img2Blob(this.canvas.toDataURL("image/png"));
        function base64Img2Blob(code){
            let parts = code.split(';base64,');
            let contentType = parts[0].split(':')[1];
            let raw = window.atob(parts[1]);
            let rawLength = raw.length;
            let uInt8Array = new Uint8Array(rawLength);
            for(let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }
            return new Blob([uInt8Array], {type: contentType});
        }
    }
    _loadImage(image){
        //this.valueTexture = createTexture(this.gl, this.gl.LINEAR, image);
        //读取图片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        // 形成数据纹理
        const valueTexture = createTexture(this.gl,this.gl.LINEAR, new Uint8Array(ctx.getImageData(0, 0, image.width, image.height - 1).data),TEXTURE_INDEX_VALUE,image.width,image.height - 1);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_value"), TEXTURE_INDEX_VALUE);
        // 最大最小值
        const mm = getMinAndMax(ctx.getImageData(1, image.height - 1, 8, 1).data);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_lon"),-180,180);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_lat"),-78,78);
        this.gl.uniform2fv(this.gl.getUniformLocation(this.program, "u_vmm"),mm[0]);
        function getMinAndMax(uintArray){
            let mm = new Array(3);
            for (let n = 0; n < mm.length; n++) {
                let d = mm[n] = new Float32Array(2);
                let u = new Uint8Array(d.buffer);
                for (let m = 0; m < u.length; m++)
                    u[m] = uintArray[4 * m + n];
            }
            return mm;
        };
    }
}