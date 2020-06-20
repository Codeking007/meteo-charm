import debug from "webgl-debug";
import {WebGL,GLFbo,GLTwinsFbo,GLProgram,BufferObject} from "../../src/gl";
import drawFrag from "./drawFrag.glsl";
import drawVert from "./drawVert.glsl";
import quadVert from "./quadVert.glsl";
import screenFrag from "./screenFrag.glsl";
import updateFrag from "./updateFrag.glsl";
import {MeteoImage} from "./image";
import {mat4} from "gl-matrix";

const FADEOPACITY = 0.996; // how fast the particle trails fade on each frame
const SPEEDFACTOR = 6.0; // how fast the particles move
const DROPRATE = 0.003; // how often the particles move to a random place
const DROPRATEBUMP = 0.01; // drop rate increase relative to individual particle speed
const PARTICLESRADIX = 64; //num = particlesRadix*particlesRadix
// const im=imageData1;
const TEXTURE_INDEX_COLOR = 0;      // 色卡纹理
const TEXTURE_INDEX_DATA = 1;       // 数据纹理
const TEXTURE_INDEX_FRAME = 2;      // 屏幕纹理
const TEXTURE_INDEX_PARTICLES = 3;  // 粒子纹理
class Uniform {
    private _u_lat: any;
    private _u_lon: any;
    private _u_max!: any[];
    private _u_min!: any[];
    private _u_cmm!: Float32Array;
    private _u_count!: number;
    constructor(){

    }

    get u_lat(): any {
        return this._u_lat;
    }

    set u_lat(value: any) {
        this._u_lat = value;
    }

    get u_lon(): any {
        return this._u_lon;
    }

    set u_lon(value: any) {
        this._u_lon = value;
    }

    get u_max(): any[] {
        return this._u_max;
    }

    set u_max(value: any[]) {
        this._u_max = value;
    }

    get u_min(): any[] {
        return this._u_min;
    }

    set u_min(value: any[]) {
        this._u_min = value;
    }

    get u_cmm(): Float32Array {
        return this._u_cmm;
    }

    set u_cmm(value: Float32Array) {
        this._u_cmm = value;
    }

    get u_count(): number {
        return this._u_count;
    }

    set u_count(value: number) {
        this._u_count = value;
    }
}
export class Params {
    private _fadeopacity: any;
    private _droprate: any;
    private _speedfactor: any;
    private _dropratebump: any;
    private _particlesradix: any;

    constructor() {
        this._fadeopacity=0.996;
        this._speedfactor=6.0;
        this._droprate=0.003;
        this._dropratebump=0.01;
        this._particlesradix=64;
    }

    get fadeopacity(): any {
        return this._fadeopacity;
    }

    set fadeopacity(value: any) {
        this._fadeopacity = value;
    }

    get droprate(): any {
        return this._droprate;
    }

    set droprate(value: any) {
        this._droprate = value;
    }

    get speedfactor(): any {
        return this._speedfactor;
    }

    set speedfactor(value: any) {
        this._speedfactor = value;
    }

    get dropratebump(): any {
        return this._dropratebump;
    }

    set dropratebump(value: any) {
        this._dropratebump = value;
    }

    get particlesradix(): any {
        return this._particlesradix;
    }

    set particlesradix(value: any) {
        this._particlesradix = value;
    }
}
export class Mgl{
    private map:any;
    private pxRatio:any;
    private meteo:any;
    private canvas!: HTMLCanvasElement;
    private is2!: boolean;
    private wgl!:WebGL;
    private meteoImage!:MeteoImage;
    private fadeOpacity!: number;
    private speedFactor!: number;
    private dropRate!: number;
    private dropRateBump!: number;
    private particlesRadix!: number;
    private gl!: WebGLRenderingContext;
    private updateProgram!: GLProgram;
    private screenProgram!: GLProgram;
    private drawProgram!: GLProgram;
    private buffer!:BufferObject;
    private uniform!: any;
    private framebuffer!: GLTwinsFbo;
    private particlesBuffer!: GLTwinsFbo;
    private _animateHandle!: number;
    private hasAppendCanvas: boolean;

    /*private particleProgram!:GLProgram;
    private pointProgram!:GLProgram;
    private particle!: GLTwinsFbo;*/

    constructor(){
        let canvas =this.canvas = document.createElement("canvas");
        this.hasAppendCanvas=false;
    }

    constructAll(map:any,params:Params) {
        if(map){
            this.map = map;
        }
        this.pxRatio = window.devicePixelRatio === 1?2:1;
        // this.pxRatio = Math.max(Math.floor(window.devicePixelRatio)||1, 2);
        // this.pxRatio = 1;//window.devicePixelRatio;
        this.meteoImage=new MeteoImage();
        this._init();
        this._initGL(params);
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();

        const params = {depth: false, stencil: false, antialias: false};
        let gl =this.gl= this.canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl =this.gl= this.canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        const wgl = this.wgl = new WebGL(gl);
        this.canvas.style.cssText= mapCanvas.style.cssText;
        this.canvas.style.pointerEvents= 'none';
        this.canvas.width = mapCanvas.width*this.pxRatio; // todo:*this.pxRatio?
        this.canvas.height = mapCanvas.height*this.pxRatio;
        if(!this.hasAppendCanvas){
            div.appendChild(this.canvas);
            this.hasAppendCanvas=true;
        }
        map.on('resize',(e:any)=>{
            const mc = e.target.getCanvas();
            this.canvas.style.width= mc.style.width;
            this.canvas.style.height= mc.style.height;
            this.canvas.style.pointerEvents = mc.style.pointerEvents;
            this.canvas.width = mc.width*this.pxRatio;
            this.canvas.height = mc.height*this.pxRatio;
            this.resize();
        });
        map.on('move',(e:any)=>{
            // this._render();
            /*const matrix = mat4.identity(new Float32Array(4));
            mat4.multiply(matrix,this._matrix(), new Float32Array([0.1,0.2,0,1]));
            console.log(matrix[0]/matrix[3],matrix[1]/matrix[3]);*/
        });
        map.on('load',()=>{
            // this._render();
        });
    }

    _initGL(params:Params) {
        debugger
        const gl = this.gl;
        this.fadeOpacity = params.fadeopacity; // how fast the particle trails fade on each frame
        this.speedFactor = params.speedfactor; // how fast the particles move
        this.dropRate = params.droprate; // how often the particles move to a random place
        this.dropRateBump = params.dropratebump; // drop rate increase relative to individual particle speed
        this.particlesRadix = params.particlesradix;   // 粒子基数
        //初始化program
        this.drawProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER,drawVert),this.wgl.compileShader(gl.FRAGMENT_SHADER,drawFrag));
        this.screenProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER,quadVert),this.wgl.compileShader(gl.FRAGMENT_SHADER,screenFrag));
        this.updateProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER,quadVert),this.wgl.compileShader(gl.FRAGMENT_SHADER,updateFrag));
        this.buffer = {};
        //初始化静态信息
        this.buffer.quad = this.wgl.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        //生成初始化例子纹理
        this._initParticles(this.particlesRadix);
        this.resize();
    }

    _initParticles(num:number){
        const l = Math.pow(num,2);
        this.uniform=new Uniform();
        this.uniform.u_count = l;           // 画多少个点，256*256=65536个，不应该写uniform，会误导
        const data = new Uint8Array(l * 4);
        for (let i = 0; i < l; i++) {        // todo:随后这里会是什么值？     // 随机设置粒子的像素值==>这里设置的是坐标xyzw
            data[i] = Math.floor(Math.random() * 255);      // todo:为什么是256而不是255
        }
        this.particlesBuffer= this.wgl.createTwinsFbo(TEXTURE_INDEX_PARTICLES,num,num,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,this.gl.NEAREST,data);
        const a_index = new Float32Array(l);
        for (let m = 0; m < l; m++){                        // 设置各粒子的索引
            a_index[m]=m;
        }
        this.buffer.a_index = this.wgl.createBuffer(a_index);
    }

    resize(){
        const gl = this.gl;
        const ps = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);   // todo:随后这里会是什么值   // 空像素值，全是0
        this.framebuffer = this.wgl.createTwinsFbo(TEXTURE_INDEX_FRAME,this.gl.canvas.width,this.gl.canvas.height,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,this.gl.NEAREST,ps);
    }

    setColor(color:Array<any>){
        const color2D = this.wgl.createColorRamp(color);
        this.wgl.createTexture(TEXTURE_INDEX_COLOR,color2D.length/4,1,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,this.gl.LINEAR,color2D);
        this.uniform.u_cmm = new Float32Array([color[0][0],color[color.length-1][0]]);
        return this;
    }

    load(url:string){
        return new Promise((resolve, reject) => {
            this.meteoImage.load(url).then((meteo)=>{
                this.meteo=meteo as object;
                // 形成数据纹理
                this.wgl.createTexture(TEXTURE_INDEX_DATA,this.meteo.width,this.meteo.height,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,this.gl.LINEAR, this.meteo.data);
                // console.log(meteo);
                this.uniform.u_min = [this.meteo.minAndMax[0][0],this.meteo.minAndMax[1][0]];
                this.uniform.u_max = [this.meteo.minAndMax[0][1],this.meteo.minAndMax[1][1]];
                this.uniform.u_lon = this.meteo.lon;
                this.uniform.u_lat = this.meteo.lat;
                resolve();
            });
        })

    }

    play(){
        const _this = this;
        frame();
        function frame(){
            _this._render();
            _this._animateHandle =requestAnimationFrame(frame);
        }
    }

    stop(){
        if(this._animateHandle){
            cancelAnimationFrame(this._animateHandle);
            delete this._animateHandle;
        }
    }

    _render(){
        if(!this.meteo)return;
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        this._drawScreen();
        this._updateParticles();
    }

    _drawScreen(){
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        this.framebuffer.bindFrameBuffer();
        this._drawTexture(this.framebuffer.current.texture, this.fadeOpacity);
        this._drawParticles();
        this.wgl.unbindFrameBuffer();
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this._drawTexture(this.framebuffer.buffer.texture, 1.0);
        // gl.disable(gl.BLEND);
        this.framebuffer.swap();   // 对调this.texture.frame_last和this.texture.frame
    }

    _drawTexture(texture:WebGLTexture, opacity:number){     // todo:获取屏幕的像素，然后做透明度处理再保存进帧缓冲区
        const gl = this.gl;
        const program = this.screenProgram;
        program.use();
        this.wgl.bindAttribute(program.attribute.a_pos,this.buffer.quad,2);
        this.wgl.bindTexture(texture, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1i(program.uniform.u_screen, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1f(program.uniform.u_opacity, opacity);
        this.wgl.gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _drawParticles(){                   // todo:画粒子到屏幕上
        const gl = this.gl;
        const program = this.drawProgram;
        program.use();
        //绑定索引
        this.wgl.bindAttribute(program.attribute.a_index,this.buffer.a_index,1);
        //颜色
        this.wgl.gl.uniform1i(program.uniform.u_color, TEXTURE_INDEX_COLOR);
        this.wgl.gl.uniform2fv(program.uniform.u_cmm,this.uniform.u_cmm);
        this.wgl.gl.uniform1i(program.uniform.u_data, TEXTURE_INDEX_DATA);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1f(program.uniform.u_particles_radix, this.particlesRadix);
        this.wgl.gl.uniform2fv(program.uniform.u_min, this.uniform.u_min);
        this.wgl.gl.uniform2fv(program.uniform.u_max, this.uniform.u_max);
        this.wgl.gl.uniform3fv(program.uniform.u_lon, this.uniform.u_lon);
        this.wgl.gl.uniform3fv(program.uniform.u_lat, this.uniform.u_lat);
        this.wgl.gl.uniformMatrix4fv(program.uniform.u_matrix_invert, false, this._matrixInvert());
        this.wgl.gl.drawArrays(gl.POINTS, 0, this.uniform.u_count);
    }

    _updateParticles(){
        const gl = this.gl;
        this.particlesBuffer.bindFrameBuffer();
        this.wgl.viewport(this.particlesRadix, this.particlesRadix);    // 画256*256大小
        const program = this.updateProgram;
        program.use();
        this.wgl.bindAttribute(program.attribute.a_pos,this.buffer.quad,  2);
        gl.uniform1i(program.uniform.u_data, TEXTURE_INDEX_DATA);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1f(program.uniform.u_particles_radix, this.particlesRadix);
        gl.uniform2fv(program.uniform.u_min, this.uniform.u_min);
        gl.uniform2fv(program.uniform.u_max, this.uniform.u_max);
        gl.uniform3fv(program.uniform.u_lon, this.uniform.u_lon);
        gl.uniform3fv(program.uniform.u_lat, this.uniform.u_lat);
        //地图相关
        gl.uniformMatrix4fv(program.uniform.u_matrix, false, this._matrix());
        gl.uniformMatrix4fv(program.uniform.u_matrix_invert, false, this._matrixInvert());
        gl.uniform1f(program.uniform.u_scale, this.map.getZoom());
        gl.uniform1f(program.uniform.u_pitch, this.map.getPitch());
        gl.uniform1f(program.uniform.u_bearing, this.map.getBearing());
        gl.uniform1f(program.uniform.u_speed_factor, this.speedFactor);
        gl.uniform1f(program.uniform.u_drop_rate, this.dropRate);
        gl.uniform1f(program.uniform.u_drop_rate_bump, this.dropRateBump);
        gl.uniform1f(program.uniform.u_rand_seed, Math.random());
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.particlesBuffer.swap();   // 对调this.texture.u_particles_next和this.texture.u_particles
        this.wgl.unbindFrameBuffer();
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

    setParams(params:Params){
        this.fadeOpacity = params.fadeopacity; // how fast the particle trails fade on each frame
        this.speedFactor = params.speedfactor; // how fast the particles move
        this.dropRate = params.droprate; // how often the particles move to a random place
        this.dropRateBump = params.dropratebump; // drop rate increase relative to individual particle speed
        this.particlesRadix = params.particlesradix;   // 粒子基数
        //生成初始化例子纹理
        this._initParticles(this.particlesRadix);
        this.resize();
    }

}