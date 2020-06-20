const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_VALUE = 1;

const vert = `
precision mediump float;
attribute vec2 a_position;
uniform int u_size;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0.0,1.0);
    v_pos = a_position;
}`;

const frag = `
precision mediump float;
const float PI = 3.141592653589793;
uniform vec2 u_lon;
uniform vec2 u_lat;
uniform sampler2D u_value;
uniform sampler2D u_color;
uniform vec3 u_coord;
uniform vec2 u_vmm;
uniform vec2 u_cmm;
varying vec2 v_pos;
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
vec2 coord(float lon,float lat){
    return vec2((lon-u_lon[0])/(u_lon[1]-u_lon[0]),(lat-u_lat[0])/(u_lat[1]-u_lat[0]));
}
// float computeVal(float lon,float lat){
//     float x = (lon-u_lon[0])/u_lon[2];
//     float y = (lat-u_lat[0])/u_lat[2];
//     vec2 cx = vec2(floor(x)*u_lon[2]+u_lon[0],ceil(x)*u_lon[2]+u_lon[0]);
//     vec2 cy = vec2(floor(y)*u_lat[2]+u_lat[0],ceil(y)*u_lat[2]+u_lat[0]);
//     mat2 vs = mat2(getVal(cx[0],cy[0]),getVal(cx[1],cy[0]),
//                    getVal(cx[0],cy[1]),getVal(cx[1],cy[1]));
//     // return mix(mix(vs[0][0],vs[0][1],fract(x)),mix(vs[1][0],vs[1][1],fract(x)),fract(y));
//     return getVal(lon,lat);
// }
void main(){
    float lon = lon(v_pos.x);
    float lat = lat(v_pos.y);
    float val = texture2D(u_value,coord(lon,lat)).r;
    gl_FragColor = texture2D(u_color,vec2(val,1.0));
}`;
class Meteo{
    constructor(tileSize) {
        this.tileSize = tileSize?tileSize:TILESIZE_DEFAULT;
        const gl = this.gl = document.getElementById("c").getContext("webgl");
        // this.canvas = document.createElement("canvas");
        // this.canvas.width = this.tileSize;
        // this.canvas.height = this.tileSize;
        // const gl = this.gl = this.canvas.getContext("webgl");
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vert);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
        const program = this.program = createProgram(gl, vertexShader, fragmentShader);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        const posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        const posLoc = gl.getAttribLocation(program, "a_position");
        bindAttribute(gl,posBuffer,posLoc,2);
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
        const pixels = new Uint8Array(this.tileSize * this.tileSize * 4);
        this.gl.readPixels(0, 0, this.tileSize, this.tileSize, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        return {width:this.tileSize,height:this.tileSize,data:pixels};
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
        const mm = getMinAndMax(ctx.getImageData(8, image.height - 1, 8, 1).data);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_lon"),-180,180);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_lat"),-85.25,89.25);
        this.gl.uniform2fv(this.gl.getUniformLocation(this.program, "u_vmm"),mm[0]);
        console.log(getCoord(ctx.getImageData(12, image.height - 1, 4, 1).data));

        function getCoord(uintArray){
            let d = new Float32Array(3);
            let u = new Uint8Array(d.buffer);
            for (let m = 0; m < d.length; m++)
                for(let n=0;n<4;n++)
                    u[4*m+n] = uintArray[4*n+m];
            return d;
        }
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