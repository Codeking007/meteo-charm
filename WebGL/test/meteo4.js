const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;

const vert = `
attribute vec2 a_position;
uniform int u_size;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0.0,1.0);
    v_pos = a_position;
}`;

const frag = `
// precision mediump float;
precision highp float;
const float PREC = 255.0/250.0;
uniform vec3 u_lon;
uniform vec3 u_lat;
uniform sampler2D u_value;
uniform sampler2D u_color;
uniform vec3 u_coord;
uniform vec2 u_min;
uniform vec2 u_max;
uniform vec2 u_cmm;
uniform float u_type;
varying vec2 v_pos;
float ms = exp2(u_coord.z);
float sinh(float val){
    return (exp(val)-exp(-val))/2.0;
}
float lon(float x){
    return (u_coord.x + (x + 1.0)/2.0)/ms*360.0 - 180.0;
}
float lat(float y){
    return degrees(atan((exp(180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms))-exp(-180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms)))/2.0));
    // return atan(sinh(PI*(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms)))*180.0/PI;
}
float between(float min,float max,float val){return (val-min)/(max-min);}
vec2 coord(float lon,float lat){return vec2(between(u_lon[0],u_lon[1],lon),between(u_lat[0],u_lat[1],lat));}
void main(){
    float lon = lon(v_pos.x);
    float lat = lat(v_pos.y);
    float val;
    if(u_type == 2.0)
        val = length(mix(u_min,u_max,texture2D(u_value, coord(lon,lat)).xy*PREC));
    else
        val = mix(u_min.x,u_max.x,texture2D(u_value, coord(lon,lat)).x)*PREC;
    float colorPos = between(u_cmm[0],u_cmm[1],val);
    gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));
}`;
class Meteo{
    constructor() {
        this.tileSize = TILESIZE_DEFAULT;
        // const gl = this.gl = document.getElementById("c").getContext("webgl");
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.tileSize;
        this.canvas.height = this.tileSize;
        const gl = this.gl = this.canvas.getContext("webgl");
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vert);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
        const program = this.program = createProgram(gl, vertexShader, fragmentShader);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        const posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        bindAttribute(gl,posBuffer,program.a_position,2);
        this.gl.useProgram(this.program);
    }

    setColor(color){
        const color2D = createColorRamp(color);
        const colorTexture = createTexture(this.gl,this.gl.LINEAR,color2D,color2D.length/4,1,TEXTURE_INDEX_COLOR);
        this.gl.uniform1i(this.program.u_color, TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.program.u_cmm,new Float32Array([color[0][0],color[color.length-1][0]]));
    }

    load(url,vector){
        return MeteoImage.load(url).then((meteo)=>{
            this.meteo=meteo;
            // 形成数据纹理
            createTexture(this.gl,this.gl.LINEAR, meteo.data,meteo.width,meteo.height,TEXTURE_INDEX_DATA);
            this.gl.uniform1i(this.program.u_value, TEXTURE_INDEX_DATA);
            this.gl.uniform3fv(this.program.u_lon,meteo.lon);
            this.gl.uniform3fv(this.program.u_lat,meteo.lat);
            this.gl.uniform2fv(this.program.u_min, [meteo.minAndMax[0][0],vector?meteo.minAndMax[1][0]:0]);
            this.gl.uniform2fv(this.program.u_max, [meteo.minAndMax[0][1],vector?meteo.minAndMax[1][1]:0]);
            if(vector)
                this.gl.uniform1f(this.program.u_type,2.0);
            else
                this.gl.uniform1f(this.program.u_type,1.0);
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
}