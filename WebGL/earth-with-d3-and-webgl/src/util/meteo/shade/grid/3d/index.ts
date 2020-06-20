// fixme:给全调成非渐变的了createColorRamp()
// fixme:色卡纹理变为gl.NEAREST，配合非渐变
// fixme:把viewport的高度和宽度变为1/2，要不手机太慢了canvas.width = mc.width/2;canvas.height = mc.height/2;
import imagegl from "../../../gl/image";
import util from "../../../gl/util";
import vert from "./glsl/vert.glsl";
import frag from "./glsl/frag.glsl";
const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 7;
const TEXTURE_INDEX_DATA = 6;

export default class {
    private canvas!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;
    private visiable!: boolean;
    private program!: any;
    private meteo: any;
    private stopTime: any;
    private animateHandle: any;
    private globe: any;
    private view: any;

    constructor(globe, view) {
        this.globe = globe;
        this.view = view;
        this._init();
        this._initGL();
    }

    _init() {
        const canvas = this.canvas = document.getElementById("shade") as any;
        this.gl = canvas.getContext("webgl", {
            antialiasing: false,
            preserveDrawingBuffer: true
        }) as WebGLRenderingContext;
        canvas.style.pointerEvents = 'none';
        canvas.style.width = this.view.width*2; // fixme:这样能更加清晰些
        canvas.style.height = this.view.height*2;
        canvas.width = this.view.width;
        canvas.height = this.view.height;

    }

    _initGL() {
        const gl = this.gl;
        const vertShader = util.createShader(gl, gl.VERTEX_SHADER, vert);
        const fragShader = util.createShader(gl, gl.FRAGMENT_SHADER, frag);
        this.program = util.createProgram(gl, vertShader, fragShader);
        //初始化静态信息
        const posBuffer = util.createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        util.bindAttribute(gl, posBuffer, this.program["a_position"], 2);
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.program["u_opacity"], 0.6);
    }

    setColor(color) {
        const color2D = util.createColorRamp(color, "gradient");  // 非渐变
        const colorTexture = util.createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR);
        this.gl.uniform1i(this.program["u_color"], TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.program["u_cmm"], new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    load(url, vector) {
        return new Promise(resolve => {
            imagegl.load(url).then((meteo) => {
                resolve(meteo);
            });
        });
    }

    loadMeteo(meteo, shadeParams, precision) {
        this.meteo = meteo;
        // 形成数据纹理
        util.createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
        this.gl.uniform1i(this.program["u_data"], TEXTURE_INDEX_DATA);
        this.gl.uniform3fv(this.program["u_lon"], meteo.lon);
        this.gl.uniform3fv(this.program["u_lat"], meteo.lat);
        this.gl.uniform2fv(this.program["u_min"], [meteo.minAndMax[0][0], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][0] : 0]);
        this.gl.uniform2fv(this.program["u_max"], [meteo.minAndMax[0][1], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][1] : 0]);
        if (shadeParams.computeAsVector[1])
            this.gl.uniform1f(this.program["u_type"], 2.0);
        else
            this.gl.uniform1f(this.program["u_type"], 1.0);
        this._render();
    }

    _render() {
        const _this = this;
        this.stopTime = new Date().getTime() + 1;
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
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        gl.uniform3fv(this.program.u_matrix_invert, this.globe.projection.rotate());
        let translate=this.globe.projection.translate();
        let scale=this.globe.projection.scale();
        gl.uniform3fv(this.program.u_translate_scale, [translate[0],translate[1],scale]);
        let currentBounds: any = this.globe.bounds(this.view);
        gl.uniform4fv(this.program.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        gl.uniform2fv(this.program.u_view, [this.view.width,this.view.height]);
        let projectionBounds:(Array<Array<number>>)=this.globe.projectionBounds();
        gl.uniform4fv(this.program.u_projection_bounds, [projectionBounds[0][0], projectionBounds[1][0],projectionBounds[0][1], projectionBounds[1][1]]);

        console.group("热力图参数");
        console.warn("this.globe.projection.rotate()");
        console.log(this.globe.projection.rotate());

        console.warn("this.globe.projection.translate()+this.globe.projection.scale()");
        console.log([translate[0],translate[1],scale]);

        console.warn("this.globe.bounds(this.view)");
        console.log([currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);

        console.warn("this.globe.projectionBounds()");
        console.log([projectionBounds[0][0], projectionBounds[1][0],projectionBounds[0][1], projectionBounds[1][1]]);
        console.groupEnd();

        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    show() {
        this.visiable = true;
        this._render();
    }

    hide() {
        this.visiable = false;
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    setZIndex(z) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity) {
        this.gl.uniform1f(this.program.u_opacity, opacity);
    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }
}

