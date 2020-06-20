import {MeteoImage} from "../../../image";
import {mat4} from "gl-matrix";
import {WebGL,GLFbo,GLTwinsFbo,GLProgram,BufferObject} from "../../../gl";
import vert from "./glsl/vert.glsl";
import frag from "./glsl/frag.glsl";
import mapboxgl from "mapbox-gl";
import IWebGL from "@/util/meteo";
const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 7;
const TEXTURE_INDEX_DATA = 6;

export class Shade implements IWebGL{
    private map: any;
    private canvas!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;
    private visiable!: boolean;
    private program!: GLProgram;
    private meteo: any;
    private stopTime: any;
    private animateHandle: any;
    private meteoImage: MeteoImage;
    private is2!: boolean;
    private wgl!:WebGL;

    constructor(map:mapboxgl.Map) {
        this.map = map;
        this.meteoImage=new MeteoImage();
        this._init();
        this._initGL();
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this.canvas = document.createElement("canvas");
        const params = {depth: false, stencil: false, antialias: false};
        let gl =this.gl= canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl =this.gl= canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        const wgl = this.wgl = new WebGL(gl);
        canvas.style.cssText = mapCanvas.style.cssText;
        canvas.style.pointerEvents = 'none';
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        div.appendChild(canvas);
        map.on('resize', (e:any) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this._render();
        });
        map.on('move', (e:any) => {
            if (!this.visiable) return;
            this._render();
        });
        map.on('load', () => {
            if (!this.visiable) return;
            this._render();
        });
    }

    _initGL() {
        const gl = this.gl;
        this.program = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER,vert),this.wgl.compileShader(gl.FRAGMENT_SHADER,frag));

        //初始化静态信息
        const posBuffer = this.wgl.createBuffer(new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.wgl.bindAttribute(this.program.attribute["a_position"],posBuffer, 2);
        this.program.use();
        this.wgl.gl.uniform1f(this.program.uniform["u_opacity"], 0.8);
    }

    setColor(color:Array<any>) {
        // console.log(this.wgl.gcd([3,2,4]));
        // console.log(this.wgl.getGcd([0.0024,-4,0.0004]));
        console.log(this.wgl.getGcd([0.4-0.2,0.7-0.4]));

        console.log("---------")
        this.wgl.createColor(color,"gradient");
        console.log("---------")
        this.wgl.createColor(color,"ungradient");
        const color2D = this.wgl.createColorRamp(color);
        this.wgl.createTexture(TEXTURE_INDEX_COLOR,color2D.length / 4, 1,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,this.gl.LINEAR,color2D);
        this.wgl.gl.uniform1i(this.program.uniform["u_color"], TEXTURE_INDEX_COLOR);
        this.wgl.gl.uniform2fv(this.program.uniform["u_cmm"], new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    load(url:string) {
        return new Promise(resolve => {
            this.meteoImage.load(url).then((meteo:any) => {
                resolve(meteo);
            });
        });
    }

    loadMeteo(meteo:any, shadeParams:any, precision:any) {
        this.meteo = meteo;
        // 形成数据纹理
        this.wgl.createTexture(TEXTURE_INDEX_DATA, this.meteo.width, this.meteo.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, this.meteo.data);

        this.wgl.gl.uniform1i(this.program.uniform["u_data"], TEXTURE_INDEX_DATA);
        this.wgl.gl.uniform3fv(this.program.uniform["u_lon"], meteo.lon);
        this.wgl.gl.uniform3fv(this.program.uniform["u_lat"], meteo.lat);
        this.wgl.gl.uniform2fv(this.program.uniform["u_min"], [meteo.minAndMax[0][0], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][0] : 0]);
        this.wgl.gl.uniform2fv(this.program.uniform["u_max"], [meteo.minAndMax[0][1], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][1] : 0]);
        if (shadeParams.computeAsVector[1])
            this.wgl.gl.uniform1f(this.program.uniform["u_type"], 2.0);
        else
            this.wgl.gl.uniform1f(this.program.uniform["u_type"], 1.0);
        this._render();
    }

    _render() {
        const _this = this;
        this.stopTime = new Date().getTime() + 200;
        if (_this.animateHandle)
            return;
        frame();

        function frame() {
            _this._frame();
            if (new Date().getTime() < _this.stopTime) {
                _this.animateHandle = requestAnimationFrame(frame);
            } else {
                delete _this.animateHandle;
            }

        }
    }

    _frame() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.wgl.gl.uniformMatrix4fv(this.program.uniform["u_matrix_invert"], false, this._matrixInvert());
        this.wgl.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    _matrix(){
        const scale = this.map.transform.worldSize;
        const matrix = mat4.identity(<mat4>new Float32Array(16));
        mat4.scale(matrix, matrix, [scale, scale, 1]);
        mat4.multiply(matrix,this.map.transform.projMatrix, matrix);
        return matrix as Float32Array;
    }

    _matrixInvert(){
        return mat4.invert(<mat4>new Float32Array(16), <mat4>this._matrix()) as Float32Array;
    }

    show() {
        this.visiable = true;
        this._render();
    }

    hide() {
        this.visiable = false;
        this.wgl.gl.clearColor(0, 0, 0, 0);
        this.wgl.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    setZIndex(z:string) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity:number) {
        this.wgl.gl.uniform1f(this.program.uniform["u_opacity"], opacity);
    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }
}