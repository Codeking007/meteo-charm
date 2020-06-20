import {MeteoImage} from "../../../image";
import {mat4} from "gl-matrix";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "../../../gl";
import vert from "./glsl/vert.glsl";
import frag from "./glsl/frag.glsl";
import vertAll from "./glsl/vertAll.glsl";
import fragAll from "./glsl/fragAll.glsl";
import mapboxgl from "mapbox-gl";
import IWebGL from "@/util/meteo";

declare let window: any;
const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_DATA = 5;
const TEXTURE_INDEX_WINDBAR = 6;
const TEXTURE_FRAMEBUFFER = 7;

// fixme:要重新检查风杆图标图片是否匹配
export class Bar implements IWebGL {
    private map: any;
    private fontNum!: number[];
    private canvas!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;
    private visiable!: boolean;
    private fbo!: GLFbo;
    private programAll!: GLProgram;
    private posBuffer!: any;
    private texBuffer!: any;
    private meteo: any;
    private windBarTexture: any;
    private stopTime!: number;
    private animateHandle: any;
    private loadBarPng!: boolean;
    private pxRatio!: number;
    private is2!: boolean;
    private wgl!: WebGL;
    private program!: GLProgram;
    private meteoImage!: MeteoImage;

    constructor(map: mapboxgl.Map) {
        this.map = map;
        this.meteoImage = new MeteoImage();
        this._init();
        this._initGL();
    }

    _init() {
        this.pxRatio = 1;
        if (window.devicePixelRatio) {
            // this.pxRatio = (window.devicePixelRatio > 2) ? (window.devicePixelRatio - 1) : (window.devicePixelRatio);
            this.pxRatio = window.devicePixelRatio;
        }
        this.fontNum = [60, 30];       // 第一步画8*8大的，就存8*8个值
        this.loadBarPng = false;
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
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        this.resizeFontNum(canvas.width, canvas.height);
        div.appendChild(canvas);
        map.on('resize', (e: any) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this.resizeFontNum(canvas.width, canvas.height);
            // fixme：重置屏幕大小时要重新创建帧缓冲区，因为它的大小变了
            this.fbo = this.wgl.createFBO(TEXTURE_FRAMEBUFFER, this.fontNum[0], this.fontNum[1], this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, null);
            this._render();
        });
        map.on('move', (e: any) => {
            if (!this.visiable) return;
            this._render();
        });
        map.on('load', () => {
            if (!this.visiable) return;
            this._render();
        });
    }

    resizeFontNum(canvasWidth: number, canvasHeight: number) {
        // let windBar_icon_width_height = [32, 32];  // 风杆图片每个图标的宽度、高度
        let windBar_icon_width_height = [48, 48];  // 风杆图片每个图标的宽度、高度
        this.fontNum = [Math.floor(canvasWidth / windBar_icon_width_height[0] / this.pxRatio), Math.floor(canvasHeight / windBar_icon_width_height[1] / this.pxRatio)];
    }

    _initGL() {
        const gl = this.gl;
        this.program = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vert), this.wgl.compileShader(gl.FRAGMENT_SHADER, frag));
        this.programAll = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vertAll), this.wgl.compileShader(gl.FRAGMENT_SHADER, fragAll));

        this.fbo = this.wgl.createFBO(TEXTURE_FRAMEBUFFER, this.fontNum[0], this.fontNum[1], this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, null);

        //初始化静态信息
        this.posBuffer = this.wgl.createBuffer(new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.texBuffer = this.wgl.createBuffer(new Float32Array([1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]));

        this.program.use();
        this.wgl.gl.uniform1f(this.program.uniform.u_opacity, 0.8);
    }

    setColor(color: Array<any>) {

    }

    load(url: string) {
        return new Promise(resolve => {
            this.meteoImage.load(url).then((meteo: any) => {
                resolve(meteo);
            });
        });
    }

    loadMeteo(meteo: any, barParams: any, precision: any) {
        return new Promise(resolve => {
            this.meteo = meteo;
            // 形成数据纹理
            this.wgl.createTexture(TEXTURE_INDEX_DATA, this.meteo.width, this.meteo.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, this.meteo.data);
            this.program.use();
            this.wgl.gl.uniform1i(this.program.uniform.u_data, TEXTURE_INDEX_DATA);
            this.wgl.gl.uniform3fv(this.program.uniform.u_lon, meteo.lon);
            this.wgl.gl.uniform3fv(this.program.uniform.u_lat, meteo.lat);
            this.programAll.use();
            this.wgl.gl.uniform2fv(this.programAll.uniform.u_min, [meteo.minAndMax[0][0], meteo.minAndMax[1][0]]);
            this.wgl.gl.uniform2fv(this.programAll.uniform.u_max, [meteo.minAndMax[0][1], meteo.minAndMax[1][1]]);
            this.loadWindBar(meteo);
        });
    }

    loadWindBar(meteo: any) {
        return new Promise((resolve, reject) => {
            let image0 = new Image();
            if (!image0) {
                console.log('Failed to create the image object');
                return false;
            }
            // Register the event handler to be called when image loading is completed
            image0.onload = () => {
                // 读取图片
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
                canvas.width = image0.width;
                canvas.height = image0.height;
                ctx.drawImage(image0, 0, 0);
                let barData = new Uint8Array(ctx.getImageData(0, 0, image0.width, image0.height).data);
                this.programAll.use();
                // todo:改成gl.LINEAR，风杆是彩色的了，很奇怪==>在WebGL3d中是好用的，不过在tileBar中还是彩色的
                // fixme：这里传入的是barData，而不是image0，因为image0不是Uint8Array类型，走createTexture()方法时会进入else情况，生成的图片透明色都是错的，不知道为什么，所以采用Uint8Array数据让它进入createTexture()的if情况
                // const windBarTexture = this.windBarTexture = createTexture(this.gl, this.gl.NEAREST, image0, image0.width, image0.height, TEXTURE_INDEX_WINDBAR, this.gl.RGBA);
                const windBarTexture = this.windBarTexture = this.wgl.createTexture(TEXTURE_INDEX_WINDBAR, image0.width, image0.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, barData);
                this.gl.uniform1i(this.programAll.uniform.u_windBar, TEXTURE_INDEX_WINDBAR);
                this.gl.uniform2fv(this.programAll.uniform.u_windBar_radix, new Float32Array([image0.width, image0.height]));
                this.loadBarPng = true;
                this._render();
                resolve();
            };
            // Tell the browser to load an Image
            // image0.src = './img/meteo/bar/windBar_32.png';
            image0.src = './img/meteo/bar/windBar_48.png';
        });
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
        if (!this.loadBarPng) return;
        // fixme:gl.viewport(x, y, width, height)==>用来设置视口，即指定从标准设备到窗口坐标的x、y仿射变换
        // x：GLint，用来设定视口的左下角水平坐标。默认值：0。
        // y：GLint，用来设定视口的左下角垂直坐标。默认值：0。
        // width：非负数Glsizei，用来设定视口的宽度。默认值：canvas的宽度。
        // height：非负数Glsizei，用来设定视口的高度。默认值：canvas的高度。
        // fixme:(1)铺热力图，像素存的是uv比例值
        const gl = this.gl;
        this.wgl.bindTexture(this.fbo.texture, this.fbo.index); // fixme:这里放的是帧缓冲区的纹理图像
        this.wgl.bindFrameBuffer(this.fbo.fbo);
        this.wgl.viewport(this.fontNum[0], this.fontNum[1]);
        this.wgl.gl.clearColor(255, 255, 255, 0);   // fixme:这里设的rgb都是255，因为uv是双通道，存成四通道了，无法判断值是否有效，而redis存的值最高是254，所以只要是255的就是无效值
        this.wgl.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.program.use();
        this.wgl.gl.uniformMatrix4fv(this.program.uniform.u_matrix_invert, false, this._matrixInvert());
        // fixme:每次调用gl.drawArrays()方法画之前，每次都得重新绑定所有attribute，因为WebGL中所有attribute用的是同一块内存，分别存到索引0123...中，所以每次画不同的东西时，都得重新gl.bindBuffer()
        this.wgl.bindAttribute(this.program.attribute["a_position"], this.posBuffer, 2);
        this.wgl.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // fixme:(2)画风杆
        this.wgl.bindFrameBuffer(null);
        this.wgl.viewport(this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.programAll.use();
        this.wgl.gl.uniform1i(this.programAll.uniform.u_frameImage, this.fbo.index);
        this.wgl.gl.uniform2fv(this.programAll.uniform.u_num, this.fontNum);
        this.wgl.bindAttribute(this.programAll.attribute.a_pos, this.posBuffer, 2);
        this.wgl.bindAttribute(this.programAll.attribute.a_texCoord, this.texBuffer, 2);
        this.wgl.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    show() {
        this.visiable = true;
        this._render();
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

    hide() {
        this.visiable = false;
        this.gl.clearColor(0, 0, 0, 0); //把清理缓冲区的值设置为黑色
        this.gl.clear(this.gl.COLOR_BUFFER_BIT); //调用clear方法，传入参数gl.COLOR_BUFFER_BIT告诉WebGL使用之前定义的颜色来填充相应区域。
    }

    setZIndex(z: string) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity: number) {
        this.wgl.gl.uniform1f(this.program.uniform.u_opacity, opacity);
    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }

}

