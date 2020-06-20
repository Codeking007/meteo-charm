import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "../../../gl";
import drawFrag from "./glsl/drawFrag.glsl";
import drawVert from "./glsl/drawVert.glsl";
import quadVert from "./glsl/quadVert.glsl";
import screenFrag from "./glsl/screenFrag.glsl";
import updateFrag from "./glsl/updateFrag.glsl";
import {MeteoArrayBuffer, MeteoImage} from "../../../image";
import {mat4} from "gl-matrix";
import mapboxgl from "mapbox-gl";
import IWebGL, {MeteoResultInterface} from "@/util/meteo/thor-meteo-final";
import {
    MeteoTypeConfigurationInterface,
    MeteoSourceConfigurationInterface,
    MeteoSourceIndex, ProductParamsInterface
} from "@/util/meteo/thor-meteo-final/meteo";

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

    constructor() {

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

export interface MglParams {
    fadeOpacity: number,
    speedFactor: number,
    dropRate: number,
    dropRateBump: number,
    particlesRadix: number,
}

export class Mgl implements IWebGL {
    private map: any;
    private pxRatio: number;
    private meteo: Array<MeteoResultInterface>;
    private canvas!: HTMLCanvasElement;
    private is2!: boolean;
    private wgl!: WebGL;
    private mglParams: MglParams;
    private gl!: WebGLRenderingContext;
    private updateProgram!: GLProgram;
    private screenProgram!: GLProgram;
    private drawProgram!: GLProgram;
    private buffer!: BufferObject;
    private uniform!: any;
    private framebuffer!: GLTwinsFbo;
    private particlesBuffer!: GLTwinsFbo;
    private animateHandle: any;
    private meteoArrayBuffer: MeteoArrayBuffer;

    /*private particleProgram!:GLProgram;
    private pointProgram!:GLProgram;
    private particle!: GLTwinsFbo;*/

    constructor(map: mapboxgl.Map) {
        this.meteo = new Array<MeteoResultInterface>();
        this.map = map;
        this.pxRatio = window.devicePixelRatio === 1 ? 2 : 1;
        // this.pxRatio = Math.max(Math.floor(window.devicePixelRatio)||1, 2);
        // this.pxRatio = 1;//window.devicePixelRatio;
        this.meteoArrayBuffer = new MeteoArrayBuffer();
        this.uniform = new Uniform(); // 常量配置
        this.mglParams = {
            dropRate: DROPRATE,
            dropRateBump: DROPRATEBUMP,
            fadeOpacity: FADEOPACITY,
            particlesRadix: PARTICLESRADIX,
            speedFactor: SPEEDFACTOR,
        };
        this._init();
        this._initGL();
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this.canvas = document.createElement("canvas");
        const params = {depth: false, stencil: false, antialias: false};
        let gl = this.gl = canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl = this.gl = canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        const wgl = this.wgl = new WebGL(gl);
        canvas.style.cssText = mapCanvas.style.cssText;
        canvas.style.pointerEvents = 'none';
        canvas.width = mapCanvas.width * this.pxRatio; // todo:*this.pxRatio?
        canvas.height = mapCanvas.height * this.pxRatio;
        div.appendChild(canvas);
        map.on('resize', (e: any) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width * this.pxRatio;
            canvas.height = mc.height * this.pxRatio;
            this.resize();
        });
        map.on('move', (e: any) => {
            if (this.meteo.length < 1) return;
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.resize();
            // this._render();
        });
        map.on('load', () => {
            // this._render();
        });
    }

    _initGL() {
        const gl = this.gl;
        this.mglParams.fadeOpacity = FADEOPACITY; // how fast the particle trails fade on each frame
        this.mglParams.speedFactor = SPEEDFACTOR; // how fast the particles move
        this.mglParams.dropRate = DROPRATE; // how often the particles move to a random place
        this.mglParams.dropRateBump = DROPRATEBUMP; // drop rate increase relative to individual particle speed
        this.mglParams.particlesRadix = PARTICLESRADIX;   // 粒子基数
        //初始化program
        this.drawProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, drawVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, drawFrag));
        this.screenProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, quadVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, screenFrag));
        this.updateProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, quadVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, updateFrag));
        this.buffer = {};
        //初始化静态信息
        this.buffer.quad = this.wgl.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        //生成初始化例子纹理
        this._initParticles(this.mglParams.particlesRadix);
        this.resize();
    }

    _initParticles(num: number) {
        const l = Math.pow(num, 2);
        this.uniform.u_count = l;           // 画多少个点，256*256=65536个，不应该写uniform，会误导
        const data = new Uint8Array(l * 4);
        for (let i = 0; i < l; i++) {        // todo:随后这里会是什么值？     // 随机设置粒子的像素值==>这里设置的是坐标xyzw
            data[i] = Math.floor(Math.random() * 255);      // todo:为什么是256而不是255
        }
        this.particlesBuffer = this.wgl.createTwinsFbo(TEXTURE_INDEX_PARTICLES, num, num, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, data);
        const a_index = new Float32Array(l);
        for (let m = 0; m < l; m++) {                        // 设置各粒子的索引
            a_index[m] = m;
        }
        this.buffer.a_index = this.wgl.createBuffer(a_index);
    }

    resize() {
        const gl = this.gl;
        const ps = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);   // todo:随后这里会是什么值   // 空像素值，全是0
        this.framebuffer = this.wgl.createTwinsFbo(TEXTURE_INDEX_FRAME, this.gl.canvas.width, this.gl.canvas.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, ps);
    }

    setColor(color: Array<any>) {
        const color2D = this.wgl.createColorRamp(color);
        this.wgl.createTexture(TEXTURE_INDEX_COLOR, color2D.length / 4, 1, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, color2D);
        this.uniform.u_cmm = new Float32Array([color[0][0], color[color.length - 1][0]]);
        return this;
    }

    load(url: number, meteoTypeConfiguration: MeteoTypeConfigurationInterface, meteoSourcePrecision: number, productParams: ProductParamsInterface,): Promise<Array<MeteoResultInterface>> {
        return new Promise((resolve, reject) => {
            this.meteoArrayBuffer.load(url, meteoTypeConfiguration, meteoSourcePrecision, productParams).then((meteoData: Array<Float32Array>) => {
                // debugger
                let meteoResults: Array<MeteoResultInterface> = [];
                if (meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.GFS
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.HYCOM
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.SHH_WW
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C1D
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C2P
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.SAT_WIND) {
                    for (let sourceIndex = 0; sourceIndex < meteoTypeConfiguration.meteoSourceConfiguration.length; sourceIndex++) {
                        let currentMeteoSourceConfiguration: MeteoSourceConfigurationInterface = meteoTypeConfiguration.meteoSourceConfiguration[sourceIndex];
                        for (let typeIndex = 0; typeIndex < meteoTypeConfiguration.meteoTypeIndex.length; typeIndex++) {
                            // fixme；arrayBuffer是从服务器/java传来的大端字节序二进制数据流，要转换成小字节序二进制数据流
                            let originalData: Float32Array = this.meteoArrayBuffer.getFloatArray(meteoData[typeIndex]);
                            meteoResults.push(this.meteoArrayBuffer.resolveData(originalData, currentMeteoSourceConfiguration, meteoSourcePrecision));
                        }
                    }
                } else {
                    /*for (let sourceIndex = 0; sourceIndex < meteoTypeConfiguration.meteoSourceConfiguration.length; sourceIndex++) {
                        // 获取不同气象来源通用的文件
                        let currentMeteoSourceConfiguration: MeteoSourceConfigurationInterface = meteoTypeConfiguration.meteoSourceConfiguration[sourceIndex];
                        currentMeteoSourceConfiguration.baseComponent.then((baseComponentData: Array<Float32Array>) => {
                            for (let typeIndex = 0; typeIndex < meteoTypeConfiguration.meteoTypeIndex.length; typeIndex++) {
                                // 获取不种气象类型的数据文件
                                let currentMeteoTypeIndex: MeteoTypeIndex = meteoTypeConfiguration.meteoTypeIndex[typeIndex];
                                // fixme；arrayBuffer是从服务器/java传来的大端字节序二进制数据流，要转换成小字节序二进制数据流
                                let originalData = this.meteoArrayBuffer.getFloatArray(data);
                                this.meteoArrayBuffer.resolveData(originalData, meteoTypeConfiguration, meteoSourcePrecision);

                                for (let additionalFileIndex = 0; additionalFileIndex < meteoTypeConfiguration.baseComponentUrl.length; additionalFileIndex++) {
                                    // 获取不同气象类型所要加载的额外文件
                                    let currentBaseComponentUrl: string = meteoTypeConfiguration.baseComponentUrl[additionalFileIndex];
                                }
                            }
                        })
                    }*/
                }


                resolve(meteoResults);
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    loadMeteo(meteoResults: Array<MeteoResultInterface>, meteoTypeConfiguration: MeteoTypeConfigurationInterface) {
        // todo:
        this.mglParams.fadeOpacity = meteoTypeConfiguration.mglParams.fadeOpacity; // how fast the particle trails fade on each frame
        this.mglParams.speedFactor = meteoTypeConfiguration.mglParams.speedFactor; // how fast the particles move
        this.mglParams.dropRate = meteoTypeConfiguration.mglParams.dropRate; // how often the particles move to a random place
        this.mglParams.dropRateBump = meteoTypeConfiguration.mglParams.dropRateBump; // drop rate increase relative to individual particle speed
        this.mglParams.particlesRadix = meteoTypeConfiguration.mglParams.particlesRadix;   // 粒子基数

        if (meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.GFS
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.HYCOM
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.SHH_WW
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C1D
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C2P
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.SAT_WIND) {
            this.meteo = meteoResults;
            // 形成数据纹理
            this.wgl.createTexture(TEXTURE_INDEX_DATA, meteoResults[0].width, meteoResults[0].height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, this.meteoArrayBuffer.mergeGridPixelData(meteoResults));
            // console.log(meteo);
            this.uniform.u_min = [meteoResults[0].minAndMax[0], meteoResults[1].minAndMax[0]];
            this.uniform.u_max = [meteoResults[0].minAndMax[1], meteoResults[1].minAndMax[1]];
            this.uniform.u_lon = meteoResults[0].lon;
            this.uniform.u_lat = meteoResults[0].lat;
        }


    }

    show(clear: boolean) {
        if (clear) {
            this.resize();
        }
        //生成初始化例子纹理
        this._initParticles(this.mglParams.particlesRadix);

        const _this = this;
        if (_this.animateHandle)
            return;
        frame();

        function frame() {
            _this._render();
            _this.animateHandle = requestAnimationFrame(frame);
        }
    }

    hide() {
        if (this.animateHandle) {
            cancelAnimationFrame(this.animateHandle);
            delete this.animateHandle;
        }
        // todo:app
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.resize();
    }

    _render() {
        if (this.meteo.length < 1) return;
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        this._drawScreen();
        this._updateParticles();
    }

    _drawScreen() {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        this.framebuffer.bindFrameBuffer();
        this._drawTexture(this.framebuffer.current.texture, this.mglParams.fadeOpacity);
        this._drawParticles();
        this.wgl.unbindFrameBuffer();
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this._drawTexture(this.framebuffer.buffer.texture, 1.0);
        // gl.disable(gl.BLEND);
        this.framebuffer.swap();   // 对调this.texture.frame_last和this.texture.frame
    }

    _drawTexture(texture: WebGLTexture, opacity: number) {     // todo:获取屏幕的像素，然后做透明度处理再保存进帧缓冲区
        const gl = this.gl;
        const program = this.screenProgram;
        program.use();
        this.wgl.bindAttribute(program.attribute.a_pos, this.buffer.quad, 2);
        this.wgl.bindTexture(texture, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1i(program.uniform.u_screen, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1f(program.uniform.u_opacity, opacity);
        this.wgl.gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _drawParticles() {                   // todo:画粒子到屏幕上
        const gl = this.gl;
        const program = this.drawProgram;
        program.use();
        //绑定索引
        this.wgl.bindAttribute(program.attribute.a_index, this.buffer.a_index, 1);
        //颜色
        this.wgl.gl.uniform1i(program.uniform.u_color, TEXTURE_INDEX_COLOR);
        this.wgl.gl.uniform2fv(program.uniform.u_cmm, this.uniform.u_cmm);
        this.wgl.gl.uniform1i(program.uniform.u_data, TEXTURE_INDEX_DATA);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1f(program.uniform.u_particles_radix, this.mglParams.particlesRadix);
        this.wgl.gl.uniform2fv(program.uniform.u_min, this.uniform.u_min);
        this.wgl.gl.uniform2fv(program.uniform.u_max, this.uniform.u_max);
        this.wgl.gl.uniform3fv(program.uniform.u_lon, this.uniform.u_lon);
        this.wgl.gl.uniform3fv(program.uniform.u_lat, this.uniform.u_lat);
        this.wgl.gl.uniformMatrix4fv(program.uniform.u_matrix_invert, false, this._matrixInvert());
        this.wgl.gl.drawArrays(gl.POINTS, 0, this.uniform.u_count);
    }

    _updateParticles() {
        const gl = this.gl;
        this.particlesBuffer.bindFrameBuffer();
        this.wgl.viewport(this.mglParams.particlesRadix, this.mglParams.particlesRadix);    // 画256*256大小
        const program = this.updateProgram;
        program.use();
        this.wgl.bindAttribute(program.attribute.a_pos, this.buffer.quad, 2);
        gl.uniform1i(program.uniform.u_data, TEXTURE_INDEX_DATA);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1f(program.uniform.u_particles_radix, this.mglParams.particlesRadix);
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
        gl.uniform1f(program.uniform.u_speed_factor, this.mglParams.speedFactor);
        gl.uniform1f(program.uniform.u_drop_rate, this.mglParams.dropRate);
        gl.uniform1f(program.uniform.u_drop_rate_bump, this.mglParams.dropRateBump);
        gl.uniform1f(program.uniform.u_rand_seed, Math.random());
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.particlesBuffer.swap();   // 对调this.texture.u_particles_next和this.texture.u_particles
        this.wgl.unbindFrameBuffer();
    }

    _matrix() {
        const scale = this.map.transform.worldSize;
        const matrix = mat4.identity(<mat4>new Float32Array(16));
        mat4.scale(matrix, matrix, [scale, scale, 1]);
        mat4.multiply(matrix, this.map.transform.projMatrix, matrix);
        return matrix as Float32Array;
    }

    _matrixInvert() {
        return mat4.invert(<mat4>new Float32Array(16), <mat4>this._matrix()) as Float32Array;
    }

    setZIndex(z: string) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity: number) {

    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }
}
