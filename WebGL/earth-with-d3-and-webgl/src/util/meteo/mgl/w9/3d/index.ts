import util from "../../../gl/util";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "../../../gl/gl";
import imagegl from "../../../gl/image";
import * as d3 from "d3";
import vertW9 from "./glsl/vertW9.glsl";
import fragW9 from "./glsl/fragW9.glsl";
import drawVert from "./glsl/drawVert.glsl";
import drawFrag from "./glsl/drawFrag.glsl";
import quadVert from "./glsl/quadVert.glsl";
import screenFrag from "./glsl/screenFrag.glsl";
import updateFrag from "./glsl/updateFrag.glsl";


const FADEOPACITY = 0.94; // how fast the particle trails fade on each frame
const SPEEDFACTOR = 1 / 3000; // how fast the particles move
const DROPRATE = 0.003; // how often the particles move to a random place
const DROPRATEBUMP = 0.01; // drop rate increase relative to individual particle speed
const PARTICLESRADIX = 80; //num = particlesRadix*particlesRadix

const TEXTURE_INDEX_COLOR = 0;      // 色卡纹理
const TEXTURE_INDEX_DATA = 1;       // 数据纹理
const TEXTURE_INDEX_FRAME = 2;      // 屏幕纹理
const TEXTURE_INDEX_PARTICLES = 3;  // 粒子纹理
const TEXTURE_INDEX_COORD = 4;      // 经纬度纹理
const TEXTURE_FRAMEBUFFER = 5;
const coordPngUrl = "./img/meteo/w9/coord.png";

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

export default class {
    private pxRatio: number;
    private meteo: any;
    private canvas!: any;
    private is2!: boolean;
    private wgl!: WebGL;
    private fadeOpacity!: number;
    private speedFactor!: number;
    private dropRate!: number;
    private dropRateBump!: number;
    private particlesRadix!: number;
    private gl!: WebGLRenderingContext;
    private updateProgram!: GLProgram;
    private screenProgram!: GLProgram;
    private drawProgram!: GLProgram;
    private buffer!: BufferObject;
    private uniform!: any;
    private framebuffer!: GLTwinsFbo;
    private particlesBuffer!: GLTwinsFbo;
    private animateHandle: number;
    private globe: any;
    private view: any;
    private u_lon_imageLonLat: Float32Array;
    private u_lat_imageLonLat: Float32Array;
    private programW9: GLProgram;
    private fbo: GLFbo;
    private a_index: Uint32Array;
    private drawLength: number;
    private a_indexBuffer: any;

    constructor(globe, view) {
        this.globe = globe;
        this.view = view;
        this.u_lon_imageLonLat = new Float32Array([52.789917, 157.18991, 0]);
        this.u_lat_imageLonLat = new Float32Array([7.29969, 59.849686, 0]);
        // this.pxRatio = window.devicePixelRatio === 1 ? 2 : 1;
        // this.pxRatio = Math.max(Math.floor(window.devicePixelRatio)||1, 2);
        // todo:这里暂时必须是1，要不viewport要改
        this.pxRatio = 1;//window.devicePixelRatio;
        this.uniform = new Uniform(); // 常量配置
        this._init();
        this._initGL();
    }

    _init() {
        const canvas: any = this.canvas = document.getElementById("mglW9");
        const params = {depth: false, stencil: false, antialias: false};
        let gl = this.gl = canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl = this.gl = canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        const wgl = this.wgl = new WebGL(gl);
        canvas.style.pointerEvents = 'none';
        canvas.style.width = this.view.width;
        canvas.style.height = this.view.height;
        canvas.width = this.view.width * this.pxRatio;
        canvas.height = this.view.height * this.pxRatio;
    }

    _initGL() {
        const gl = this.gl;
        this.fadeOpacity = FADEOPACITY; // how fast the particle trails fade on each frame
        this.speedFactor = SPEEDFACTOR; // how fast the particles move
        this.dropRate = DROPRATE; // how often the particles move to a random place
        this.dropRateBump = DROPRATEBUMP; // drop rate increase relative to individual particle speed
        this.particlesRadix = PARTICLESRADIX;   // 粒子基数
        //初始化program
        this.programW9 = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vertW9), this.wgl.compileShader(gl.FRAGMENT_SHADER, fragW9));
        this.drawProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, drawVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, drawFrag));
        this.screenProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, quadVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, screenFrag));
        this.updateProgram = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, quadVert), this.wgl.compileShader(gl.FRAGMENT_SHADER, updateFrag));

        this.a_index = this.computeIndex(599, 759);
        this.drawLength = this.a_index.length;
        this.a_indexBuffer = util.createBuffer(this.gl, new Float32Array(this.a_index));
        this.buffer = {};
        //初始化静态信息
        this.buffer.quad = this.wgl.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        this.fbo = this.wgl.createFBO(TEXTURE_FRAMEBUFFER, this.wgl.gl.canvas.width, this.wgl.gl.canvas.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, null);

        //生成初始化例子纹理
        this._initParticles(this.particlesRadix);
        this.resize();
    }

    computeIndex(row, col) {
        const re = new Uint32Array(2 * (row - 1) * col + (row - 2) * 2);
        let i = 0;
        for (let y = 0; y < row - 1; y++) {
            for (let x = 0; x < col; x++) {
                re[i++] = y * col + x;
                re[i++] = (y + 1) * col + x;
            }
            if (y < row - 2) {
                re[i++] = (y + 2) * col - 1;
                re[i++] = (y + 1) * col;
            }
        }
        return re;
    }

    _initParticles(num) {
        const l = Math.pow(num, 2);
        // this.uniform=new Uniform();
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

    setColor(color) {
        const color2D = this.wgl.createColorRamp(color);
        this.wgl.createTexture(TEXTURE_INDEX_COLOR, color2D.length / 4, 1, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, color2D);
        this.uniform.u_cmm = new Float32Array([color[0][0], color[color.length - 1][0]]);
        return this;
    }

    load(url) {
        return new Promise(resolve => {
            imagegl.load(url).then((meteo) => {
                resolve(meteo);
            });
        });
    }

    loadMeteo(meteo, mglParams, precision) {
        this.fadeOpacity = mglParams.params.fadeOpacity; // how fast the particle trails fade on each frame
        this.speedFactor = mglParams.params.speedFactor; // how fast the particles move
        this.dropRate = mglParams.params.dropRate; // how often the particles move to a random place
        this.dropRateBump = mglParams.params.dropRateBump; // drop rate increase relative to individual particle speed
        this.particlesRadix = mglParams.params.particlesRadix;   // 粒子基数
        return new Promise((resolve, reject) => {
            this.meteo = null;
            let image0 = new Image();
            image0.crossOrigin = "anonymous";
            if (!image0) {
                console.log('Failed to create the image object');
                return false;
            }
            // Register the event handler to be called when image loading is completed
            image0.onload = () => {
                this.programW9.use();
                this.wgl.createTexture(TEXTURE_INDEX_COORD, image0.width, image0.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, image0);
                this.wgl.gl.uniform1i(this.programW9.uniform.u_lonlat, TEXTURE_INDEX_COORD);
                // 这个应该就是759、599
                this.wgl.gl.uniform2fv(this.programW9.uniform.u_lonlat_radix, new Float32Array([image0.width, image0.height]));

                // 形成数据纹理
                this.wgl.createTexture(TEXTURE_INDEX_DATA, image0.width, image0.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, meteo.data);
                this.uniform.u_min = [meteo.minAndMax[0][0], meteo.minAndMax[1][0]];
                this.uniform.u_max = [meteo.minAndMax[0][1], meteo.minAndMax[1][1]];
                this.uniform.u_lon = this.u_lon_imageLonLat;
                this.uniform.u_lat = this.u_lat_imageLonLat;
                this.wgl.gl.uniform1i(this.programW9.uniform.u_data, TEXTURE_INDEX_DATA);
                this.wgl.gl.uniform3fv(this.programW9.uniform.u_lon, this.u_lon_imageLonLat);
                this.wgl.gl.uniform3fv(this.programW9.uniform.u_lat, this.u_lat_imageLonLat);
                this._drawUVRate();
                this.meteo = meteo;
                resolve();
            };
            // Tell the browser to load an Image
            image0.src = coordPngUrl;
        });
    }

    play(clear) {
        if (clear) {
            this.resize();
        }

        //生成初始化例子纹理
        this._initParticles(this.particlesRadix);
        const _this = this;
        if (_this.animateHandle) {
            return;
        }
        this._drawUVRate();
        frame();

        function frame() {
            _this._render();
            _this.animateHandle = requestAnimationFrame(frame);
        }
    }

    stop() {
        if (this.animateHandle) {
            cancelAnimationFrame(this.animateHandle);
            delete this.animateHandle;
        }
        // todo:app
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.resize();
    }

    _render() {
        if (!this.meteo) return;
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        this._drawScreen();
        this._updateParticles();
    }

    _drawUVRate() {
        const gl = this.gl;
        // fixme:(1)帧缓冲区==>先按经纬度图片把uv数据存成四通道
        // fixme:重要:将纹理对象绑定到纹理单元上
        this.wgl.bindTexture(this.fbo.texture, this.fbo.index); // fixme:这里放的是帧缓冲区的纹理图像
        this.wgl.bindFrameBuffer(this.fbo.fbo);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(255, 255, 255, 0);
        // gl.enable(gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const program = this.programW9;
        program.use();
        // fixme:每次调用gl.drawArrays()方法画之前，每次都得重新绑定所有attribute，因为WebGL中所有attribute用的是同一块内存，分别存到索引0123...中，所以每次画不同的东西时，都得重新gl.bindBuffer()
        util.bindAttribute(this.gl, this.a_indexBuffer, program.attribute.a_index, 1);
        this.wgl.gl.uniform3fv(program.uniform.u_matrix_invert, this.globe.projection.rotate());
        let translate = this.globe.projection.translate();
        let scale = this.globe.projection.scale();
        this.wgl.gl.uniform3fv(program.uniform.u_translate_scale, [translate[0], translate[1], scale]);
        let currentBounds: any = this.globe.bounds(this.view);
        this.wgl.gl.uniform4fv(program.uniform.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        let projectionBounds: (Array<Array<number>>) = this.globe.projectionBounds();
        this.wgl.gl.uniform4fv(program.uniform.u_projection_bounds, [projectionBounds[0][0], projectionBounds[1][0], projectionBounds[0][1], projectionBounds[1][1]]);

        this.wgl.gl.uniform2fv(program.uniform.u_view, [this.view.width, this.view.height]);
        gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.drawLength);
    }

    _drawScreen() {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        this.framebuffer.bindFrameBuffer();
        this._drawTexture(this.framebuffer.current.texture, this.fadeOpacity);
        this._drawParticles();
        this.wgl.unbindFrameBuffer();
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this._drawTexture(this.framebuffer.buffer.texture, 0.8);
        // gl.disable(gl.BLEND);
        this.framebuffer.swap();   // 对调this.texture.frame_last和this.texture.frame
    }

    _drawTexture(texture: WebGLTexture, opacity: number) {
        const gl = this.gl;
        const program = this.screenProgram;
        program.use();
        this.wgl.bindAttribute(program.attribute.a_pos, this.buffer.quad, 2);
        this.wgl.bindTexture(texture, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1i(program.uniform.u_screen, TEXTURE_INDEX_FRAME);
        this.wgl.gl.uniform1f(program.uniform.u_opacity, opacity);
        this.wgl.gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _drawParticles() {
        const gl = this.gl;
        const program = this.drawProgram;
        program.use();
        //绑定索引
        this.wgl.bindAttribute(program.attribute.a_index, this.buffer.a_index, 1);
        //颜色
        this.wgl.gl.uniform1i(program.uniform.u_color, TEXTURE_INDEX_COLOR);
        this.wgl.gl.uniform2fv(program.uniform.u_cmm, this.uniform.u_cmm);
        this.wgl.gl.uniform1i(program.uniform.u_frameImage, TEXTURE_FRAMEBUFFER);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        this.wgl.gl.uniform1f(program.uniform.u_particles_radix, this.particlesRadix);
        this.wgl.gl.uniform2fv(program.uniform.u_min, this.uniform.u_min);
        this.wgl.gl.uniform2fv(program.uniform.u_max, this.uniform.u_max);
        this.wgl.gl.uniform3fv(program.uniform.u_lon, this.uniform.u_lon);
        this.wgl.gl.uniform3fv(program.uniform.u_lat, this.uniform.u_lat);
        this.wgl.gl.uniform3fv(program.uniform.u_matrix_invert, this.globe.projection.rotate());
        let translate = this.globe.projection.translate();
        let scale = this.globe.projection.scale();
        this.wgl.gl.uniform3fv(program.uniform.u_translate_scale, [translate[0], translate[1], scale]);
        let currentBounds: any = this.globe.bounds(this.view);
        this.wgl.gl.uniform4fv(program.uniform.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        let projectionBounds: (Array<Array<number>>) = this.globe.projectionBounds();
        this.wgl.gl.uniform4fv(program.uniform.u_projection_bounds, [projectionBounds[0][0], projectionBounds[1][0], projectionBounds[0][1], projectionBounds[1][1]]);
        this.wgl.gl.uniform2fv(program.uniform.u_view, [this.view.width, this.view.height]);
        this.wgl.gl.drawArrays(gl.POINTS, 0, this.uniform.u_count);
    }

    _updateParticles() {
        const gl = this.gl;
        this.particlesBuffer.bindFrameBuffer();
        this.wgl.viewport(this.particlesRadix, this.particlesRadix);    // 画256*256大小
        const program = this.updateProgram;
        program.use();
        this.gl.uniform1i(program.uniform.u_lonlat, TEXTURE_INDEX_COORD);
        this.wgl.bindAttribute(program.attribute.a_pos, this.buffer.quad, 2);
        gl.uniform1i(program.uniform.u_frameImage, TEXTURE_FRAMEBUFFER);
        this.wgl.bindTexture(this.particlesBuffer.current.texture, TEXTURE_INDEX_PARTICLES);
        gl.uniform1i(program.uniform.u_particles, TEXTURE_INDEX_PARTICLES);
        gl.uniform1f(program.uniform.u_particles_radix, this.particlesRadix);
        gl.uniform2fv(program.uniform.u_min, this.uniform.u_min);
        gl.uniform2fv(program.uniform.u_max, this.uniform.u_max);
        gl.uniform3fv(program.uniform.u_lon, this.uniform.u_lon);
        gl.uniform3fv(program.uniform.u_lat, this.uniform.u_lat);
        //地图相关
        gl.uniform3fv(program.uniform.u_matrix_invert, this.globe.projection.rotate());
        let translate = this.globe.projection.translate();
        let scale = this.globe.projection.scale();
        gl.uniform3fv(program.uniform.u_translate_scale, [translate[0], translate[1], scale]);
        let currentBounds: any = this.globe.bounds(this.view);
        gl.uniform4fv(program.uniform.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        let projectionBounds: (Array<Array<number>>) = this.globe.projectionBounds();
        this.wgl.gl.uniform4fv(program.uniform.u_projection_bounds, [projectionBounds[0][0], projectionBounds[1][0], projectionBounds[0][1], projectionBounds[1][1]]);
        gl.uniform2fv(program.uniform.u_view, [this.view.width, this.view.height]);
        gl.uniform1f(program.uniform.u_speed_factor, this.speedFactor);
        gl.uniform1f(program.uniform.u_drop_rate, this.dropRate);
        gl.uniform1f(program.uniform.u_drop_rate_bump, this.dropRateBump);
        gl.uniform1f(program.uniform.u_rand_seed, Math.random());
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.particlesBuffer.swap();   // 对调this.texture.u_particles_next和this.texture.u_particles
        this.wgl.unbindFrameBuffer();
    }

    setZIndex(z) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity) {

    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }

}
