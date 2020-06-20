import {mat4} from "gl-matrix";
import util from "./util";
import delaunay from "./delaunay"
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const METEO_ARRAY=new Array("extentOfGfs","extentOfRadar");
const vert = `
const float PI = 3.141592653589793;
attribute vec3 a_pos;
uniform mat4 u_matrix;
varying float v_val;
varying vec2 v_pos;
float x(float lon){
    return (lon+180.0)/360.0;
}
float y(float lat){
    return 0.5-log((1.0+sin(lat*PI/180.0))/(1.0-sin(lat*PI/180.0)))/(4.0*PI);
}
void main(){
    gl_Position = u_matrix*vec4(x(a_pos.x),y(a_pos.y),0,1);
    v_val = a_pos.z;
    v_pos = a_pos.xy;
}`;

const frag = `
precision highp float;
uniform sampler2D u_color;
uniform vec2 u_cmm;
uniform vec4 u_pmm;
varying float v_val;
varying vec2 v_pos;
float between(float min,float max,float val){return (val-min)/(max-min);}
void main(){
    if(v_pos.x>=u_pmm.x&&v_pos.x<=u_pmm.y&&v_pos.y>=u_pmm.z&&v_pos.y<=u_pmm.w){
      float colorPos = between(u_cmm[0],u_cmm[1],v_val);
      gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));
    }
        
}`;

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
const float PREC = 255.0;
uniform mat4 u_matrix_invert;
uniform vec3 u_lon;         // 经度最小值、最大值、步长
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
uniform sampler2D u_data;   //  图片纹理单元=1
uniform sampler2D u_color;  //  色卡纹理单元=0
// uniform vec3 u_coord;
// uniform vec2 u_min;         // 各通道像素最小值
// uniform vec2 u_max;         // 各通道像素最大值
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
// uniform float u_type;       // 用了几个通道
uniform float u_opacity;    // 1.0
varying vec2 v_pos;         // 传进来的WebGL坐标系的点，要在main()进行转换
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
            // fixme:这里改成texture2D(u_data, c).r了，因为把值存在了纹素的r分量上，不是以前那样texture2D(u_data, c).xy
            float val = texture2D(u_data, c).r*PREC;  //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);    // 通过色卡横坐标val得到色卡纹理坐标
            // vec4 color = texture2D(u_color,vec2(colorPos,1.0));
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0))*u_opacity;//vec4(color.rgb,color.a*u_opacity);//texture2D(u_color,vec2(colorPos,1.0));//
        
        }
    }
}`;
export default class Shade {
  private map: any;
  private displayType: any;
  private gl: any;
  private canvas: HTMLCanvasElement;
  private program: any | WebGLProgram;
  private gribProgram: any | WebGLProgram;
  private meteo: any;
  private drawLength: number;
  private visiable: boolean;
    constructor(map,displayType) {
        this.map = map;
        this.displayType=displayType;
        this._init();
        this._initGL();
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this.canvas = document.createElement("canvas");
        this.gl = canvas.getContext("webgl", {antialiasing: true});
        canvas.style.cssText= mapCanvas.style.cssText;
        canvas.style.pointerEvents= 'none';
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        div.appendChild(canvas);
        map.on('resize',(e)=>{
            const mc = e.target.getCanvas();
            canvas.style.width= mc.style.width;
            canvas.style.height= mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this._render();
        });
        map.on('move',(e)=>{
            this._render();
        });
        map.on('load',()=>{
            this._render();
        });
    }

    _initGL() {
        const gl = this.gl;
      if(this.displayType==METEO_ARRAY[0]){
        const vertShader = util.createShader(gl, gl.VERTEX_SHADER, vert);
        const fragShader = util.createShader(gl, gl.FRAGMENT_SHADER, frag);
        this.program = util.createProgram(gl, vertShader, fragShader);
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.program.u_opacity, 1.0);
      }else if(this.displayType==METEO_ARRAY[1]){
        const vertShader = util.createShader(gl, gl.VERTEX_SHADER, gribVertexShader);
        const fragShader = util.createShader(gl, gl.FRAGMENT_SHADER, gribFragmentShader);
        this.gribProgram = util.createProgram(gl, vertShader, fragShader);
        //初始化静态信息
        const posBuffer = util.createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        util.bindAttribute(gl, posBuffer, this.gribProgram.a_position, 2);
        this.gl.useProgram(this.gribProgram);
        this.gl.uniform1f(this.gribProgram.u_opacity, 1.0);
      }

    }

    setColor(color){
      if(this.displayType==METEO_ARRAY[0]){
        this.gl.useProgram(this.program);
        const color2D = util.createColorRamp(color);
        const colorTexture = util.createTexture(this.gl,this.gl.LINEAR,color2D,color2D.length/4,1,TEXTURE_INDEX_COLOR,this.gl.RGBA);
        this.gl.uniform1i(this.program.u_color, TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.program.u_cmm,new Float32Array([color[0][0],color[color.length-1][0]]));
      }else if(this.displayType==METEO_ARRAY[1]){
        this.gl.useProgram(this.gribProgram);
        const color2D = util.createColorRamp(color); // 画色卡
        const colorTexture = util.createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR,this.gl.RGBA);
        this.gl.uniform1i(this.gribProgram.u_color, TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.gribProgram.u_cmm, new Float32Array([color[0][0], color[color.length - 1][0]]));

      }

    }

    load(meteo0,meteo1){
      if(this.displayType==METEO_ARRAY[0]){
        this.gl.useProgram(this.program);
        if(meteo1){
          this.meteo=meteo0;
          this.meteo.forEach(function(value, index, s){
            value[2]=Math.sqrt(Math.pow(value[2],2)+Math.pow(meteo1[index][2],2))
          });
        }else{
          this.meteo=meteo0;
        }

        const ps:any = delaunay.triangulate(this.meteo);
        const triangles = new Float32Array(ps.length*3);
        for (let i = 0; i < ps.length; i++) {
          for (let j = 0; j < 3; j++) {
            triangles[3*i+j] = this.meteo[ps[i]][j];
          }
        }
        // this.drawLength = ps.length;
        //初始化静态信息
        // const posBuffer = createBuffer(this.gl, new Float32Array([-180,80,17,180,80,17,180,-80,17]));
        // this.drawLength = 3;
        const posBuffer = util.createBuffer(this.gl, triangles);
        this.drawLength = ps.length;
        util.bindAttribute(this.gl,posBuffer,this.program.a_pos,3);
      }else if(this.displayType==METEO_ARRAY[1]){
        this.gl.useProgram(this.gribProgram);
        this.meteo = meteo0;
        // 形成数据纹理
        util.createTexture(this.gl, this.gl.LINEAR, meteo0.data, meteo0.width, meteo0.height, TEXTURE_INDEX_DATA,this.gl.LUMINANCE);
        this.gl.uniform1i(this.gribProgram.u_data, TEXTURE_INDEX_DATA);
        this.gl.uniform3fv(this.gribProgram.u_lon, meteo0.lon);
        this.gl.uniform3fv(this.gribProgram.u_lat, meteo0.lat);
      }
      this._render();
    }

    _render(){
        if(!this.meteo)return;
        if(!this.visiable)return;
        const gl = this.gl;
      if(this.displayType==METEO_ARRAY[0]){
        this.gl.useProgram(this.program);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        gl.uniformMatrix4fv(this.program.u_matrix, false, this._matrix());
        gl.uniform4fv(this.program.u_pmm, new Float32Array([120.6,124.5,29.8,33.2]));
        gl.drawArrays(this.gl.TRIANGLES, 0, this.drawLength);
      }else if(this.displayType==METEO_ARRAY[1]){
        this.gl.useProgram(this.gribProgram);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        gl.uniformMatrix4fv(this.gribProgram.u_matrix_invert, false, this._matrixInvert());
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
      }

    }

  _matrixInvert() {
    // 逆矩阵
    return mat4.invert(new Float32Array(16), this._matrix());
  }

    _matrix(){
        const scale = this.map.transform.worldSize;
        const matrix = mat4.identity(new Float32Array(16));
        mat4.scale(matrix, matrix, [scale, scale, 1]);
        mat4.multiply(matrix,this.map.transform.projMatrix, matrix);
        return matrix;
    }

    show(){
        this.visiable = true;
        this._render();
    }

    hide(){
        this.visiable = false;
        this.gl.clearColor(0,0,0,0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    setZIndex(z){
        this.canvas.style.zIndex = z;
    }


    setOpacity(opacity){
        this.gl.uniform1f(this.program.u_opacity, opacity);
    }

}
