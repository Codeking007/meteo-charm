import debug from "webgl-debug";
import {WebGL,GLFbo,GLTwinsFbo,GLProgram,BufferObject} from "./gl";
import particleFrag from "./glsl/particleFrag.glsl";
import particleVert from "./glsl/particleVert.glsl";
import pointFrag from "./glsl/pointFrag.glsl";
import pointVert from "./glsl/pointVert.glsl";
const TEXTURE_INDEX_COLOR = 0;      // 色卡纹理
const TEXTURE_INDEX_DATA = 1;       // 数据纹理
const TEXTURE_INDEX_FRAME = 2;      // 屏幕纹理
const TEXTURE_INDEX_PARTICLES = 0;  // 粒子纹理
const PARTICLESRADIX = 20;

export default class {

    private canvas:HTMLCanvasElement;
    private is2:boolean;
    private wgl!:WebGL;
    private particleProgram!:GLProgram;
    private pointProgram!:GLProgram;
    private particle!: GLTwinsFbo;
    private buffer!:BufferObject;

    constructor(canvas:HTMLCanvasElement) {
        this.canvas = canvas;
        const params = {depth: false, stencil: false, antialias: false};
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        let gl = canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl = canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        this.initGL(gl);
    }

    public play(){
        const _this = this;
        frame();
        function frame(){
            _this.frame();
            requestAnimationFrame(frame);
        }
    }

    private initGL(gl: WebGLRenderingContext) {
        const wgl = this.wgl = new WebGL(gl);
        this.particleProgram = wgl.createProgram(wgl.compileShader(gl.VERTEX_SHADER,particleVert),wgl.compileShader(gl.FRAGMENT_SHADER,particleFrag));
        this.pointProgram = wgl.createProgram(wgl.compileShader(gl.VERTEX_SHADER,pointVert),wgl.compileShader(gl.FRAGMENT_SHADER,pointFrag));
        //生成随机点
        const ps = new Uint8Array(PARTICLESRADIX * PARTICLESRADIX * 4);
        for (let i = 0; i < ps.length; i++) {
            ps[i] = Math.random() * 255;
        }
        this.particle = wgl.createTwinsFbo(0,PARTICLESRADIX,PARTICLESRADIX,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST,ps);
        const l = Math.pow(PARTICLESRADIX,2);
        const pointIndex = new Float32Array(l);
        for (let m = 0; m < l; m++){                        // 设置各粒子的索引
            pointIndex[m]=m;
        }
        this.buffer = {};
        this.buffer.pointIndex = wgl.createBuffer(pointIndex);
        this.buffer.quad = wgl.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
    }

    private frame(){
        this.drawPoint();
        this.updateParticle();
    }

    private drawPoint() {
        const wgl = this.wgl;
        wgl.viewport(this.canvas.width, this.canvas.height);
        const program = this.pointProgram;
        program.use();
        wgl.bindTexture(this.particle.current.texture,TEXTURE_INDEX_PARTICLES);
        wgl.gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        wgl.bindAttribute(program.attribute.a_index,this.buffer.pointIndex,1);
        wgl.gl.uniform1f(program.uniform.u_particles_radix, PARTICLESRADIX);
        wgl.gl.drawArrays(wgl.gl.POINTS, 0, PARTICLESRADIX*PARTICLESRADIX);
    }

    private updateParticle() {
        const wgl = this.wgl;
        wgl.viewport(PARTICLESRADIX, PARTICLESRADIX);
        this.particleProgram.use();
        this.particle.bindFrameBuffer();
        wgl.bindTexture(this.particle.current.texture,TEXTURE_INDEX_PARTICLES);
        wgl.gl.uniform1i(this.particleProgram.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        wgl.drawQuad(this.particleProgram.attribute.a_pos,this.buffer.quad);
        wgl.unbindFrameBuffer();
        this.particle.swap();
    }

}