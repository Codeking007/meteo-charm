import debug from "webgl-debug";
import {WebGL,GLFbo,GLTwinsFbo,GLProgram,BufferObject} from "./gl";
import particleFrag from "./glsl/particleFrag.glsl";
import screenFrag from "./glsl/screenFrag.glsl";
import quadVert from "./glsl/quadVert.glsl";
import pointFrag from "./glsl/pointFrag.glsl";
import pointVert from "./glsl/pointVert.glsl";
const TEXTURE_INDEX_COLOR = 0;      // 色卡纹理
const TEXTURE_INDEX_DATA = 1;       // 数据纹理
const TEXTURE_INDEX_FRAME = 2;      // 屏幕纹理
const TEXTURE_INDEX_PARTICLES = 3;  // 粒子纹理
const PARTICLESRADIX = 128;

export default class {

    private canvas:HTMLCanvasElement;
    private is2:boolean;
    private wgl!:WebGL;
    private particleProgram!:GLProgram;
    private pointProgram!:GLProgram;
    private screenProgram!:GLProgram;
    private particle!: GLTwinsFbo;
    private screen!: GLTwinsFbo;
    private buffer!:BufferObject;
    private log?:(message:string)=>void;

    constructor(canvas:HTMLCanvasElement,log?:(message:string)=>void) {
        this.canvas = canvas;
        const params = {depth: false, stencil: false, antialias: false};
        const dpr = devicePixelRatio==1?2:devicePixelRatio;
        canvas.width = canvas.clientWidth*dpr;
        canvas.height = canvas.clientHeight*dpr;
        let gl = canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl = canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        this.log = log;
        this.initGL(gl);
        // const sp = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT);
        // if(log&&sp)
        //     log("precision:"+sp.precision+"/rangeMin"+sp.rangeMin+"/rangeMax"+sp.rangeMax);
        if(log){
            log("width:"+this.canvas.width+"|height:"+this.canvas.height+"!devicePixelRatio:"+window.devicePixelRatio);
        }
    }

    public play(){
        const _this:any= this;
        frame();
        // let t = new Date().getTime();
        function frame(){
            _this.frame();
        //     // const t1 = new Date().getTime();
        //     // _this.log((t1-t));
        //     // t = t1;
            requestAnimationFrame(frame);
        }
    }

    private initGL(gl: WebGLRenderingContext) {
        const wgl = this.wgl = new WebGL(gl);
        const quadShader = wgl.compileShader(gl.VERTEX_SHADER,quadVert);
        this.particleProgram = wgl.createProgram(quadShader,wgl.compileShader(gl.FRAGMENT_SHADER,particleFrag));
        this.pointProgram = wgl.createProgram(wgl.compileShader(gl.VERTEX_SHADER,pointVert),wgl.compileShader(gl.FRAGMENT_SHADER,pointFrag));
        this.screenProgram = wgl.createProgram(quadShader,wgl.compileShader(gl.FRAGMENT_SHADER,screenFrag));
        //生成随机点
        const ps = new Uint8Array(PARTICLESRADIX * PARTICLESRADIX * 4);
        for (let i = 0; i < ps.length; i++) {
            ps[i] = Math.random() * 255;
        }
        this.particle = wgl.createTwinsFbo(0,PARTICLESRADIX,PARTICLESRADIX,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST,ps);
        this.screen = wgl.createTwinsFbo(0,this.canvas.width,this.canvas.height,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST,null);
        const l = Math.pow(PARTICLESRADIX,2);
        const pointIndex = new Float32Array(l);
        for (let m = 0; m < l; m++){                        // 设置各粒子的索引
            pointIndex[m]=m;
        }
        this.buffer = {};
        this.buffer.pointIndex = wgl.createBuffer(pointIndex);
        this.buffer.quad = wgl.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        wgl.unbindFrameBuffer();
    }

    private frame(){
        this.drawFrame();
        this.updateParticle();
    }

    private drawFrame() {
        const wgl = this.wgl;
        wgl.viewport(this.canvas.width, this.canvas.height);
        //画上一帧
        this.screen.bindFrameBuffer();
        this.drawTexture(this.screen.current.texture,0.996);
        //画当前帧
        this.drawPoint();
        wgl.unbindFrameBuffer();
        this.screen.swap();
        //画到屏幕
        this.drawTexture(this.screen.current.texture,1.0);
    }

    private drawPoint(){
        const wgl = this.wgl;
        this.pointProgram.use();
        wgl.bindTexture(this.particle.current.texture,TEXTURE_INDEX_PARTICLES);
        wgl.gl.uniform1i(this.pointProgram.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        wgl.bindAttribute(this.pointProgram.attribute.a_index,this.buffer.pointIndex,1);
        wgl.gl.uniform1f(this.pointProgram.uniform.u_particles_radix, PARTICLESRADIX);
        wgl.gl.drawArrays(wgl.gl.POINTS, 0, PARTICLESRADIX*PARTICLESRADIX);
    }

    private drawTexture(texture:WebGLTexture,opacity:number):void{
        const wgl = this.wgl;
        this.screenProgram.use();
        wgl.bindTexture(texture,TEXTURE_INDEX_FRAME);
        wgl.gl.uniform1i(this.screenProgram.uniform.u_screen, TEXTURE_INDEX_FRAME);
        wgl.gl.uniform1f(this.screenProgram.uniform.u_opacity, opacity);
        wgl.drawQuad(this.screenProgram.attribute.a_pos,this.buffer.quad);
    }

    private updateParticle() {
        const wgl = this.wgl;
        this.particleProgram.use();
        this.particle.bindFrameBuffer();
        wgl.viewport(PARTICLESRADIX, PARTICLESRADIX);
        wgl.bindTexture(this.particle.current.texture,TEXTURE_INDEX_PARTICLES);
        wgl.gl.uniform1i(this.particleProgram.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        wgl.drawQuad(this.particleProgram.attribute.a_pos,this.buffer.quad);
        wgl.unbindFrameBuffer();
        this.particle.swap();
    }

}