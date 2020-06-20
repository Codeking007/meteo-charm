import util from "../../../gl/util";
import imagegl from "../../../gl/image";
import * as d3 from "d3";

const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_INDEX_COORD = 2;
const TEXTURE_FRAMEBUFFER = 3;
const coordPngUrl = "./img/meteo/w9/coord.png";
import vertW9 from "./glsl/vertW9.glsl";
import fragW9 from "./glsl/fragW9.glsl";
import vertW9Data from "./glsl/vertW9Data.glsl";
import fragW9Data from "./glsl/fragW9Data.glsl";

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
    private u_lon_imageLonLat: Float32Array;
    private u_lat_imageLonLat: Float32Array;
    private a_index: Uint32Array;
    private drawLength: number;
    private pixels: Uint8Array;
    private fboData: any;
    private programData: any;
    private a_indexBuffer: any;
    private shadeParams: any;
    constructor(globe, view) {
        this.globe = globe;
        this.view = view;
        this.u_lon_imageLonLat = new Float32Array([52.789917, 157.18991, 0]);
        this.u_lat_imageLonLat = new Float32Array([7.29969, 59.849686, 0]);
        this._init();
        this._initGL();
    }

    _init() {
        const canvas = this.canvas = document.getElementById("shadeW9") as any;
        this.gl = canvas.getContext("webgl", {
            antialiasing: false,
            preserveDrawingBuffer: true
        }) as WebGLRenderingContext;
        canvas.style.pointerEvents = 'none';
        canvas.style.width = this.view.width; // fixme:这样能更加清晰些
        canvas.style.height = this.view.height;
        canvas.width = this.view.width;
        canvas.height = this.view.height;

    }

    _initGL() {
        const gl = this.gl;
        const vertW9DataShader = util.createShader(gl, gl.VERTEX_SHADER, vertW9Data);
        const fragW9DataShader = util.createShader(gl, gl.FRAGMENT_SHADER, fragW9Data);
        this.programData = util.createProgram(gl, vertW9DataShader, fragW9DataShader);

        const vertShader = util.createShader(gl, gl.VERTEX_SHADER, vertW9);
        const fragShader = util.createShader(gl, gl.FRAGMENT_SHADER, fragW9);
        this.program = util.createProgram(gl, vertShader, fragShader);

        const fboData = this.fboData = this.initFramebufferObject(this.gl);

        this.a_index = this.computeIndex(599, 759);
        this.drawLength = this.a_index.length;
        let a_indexBuffer =this.a_indexBuffer= util.createBuffer(this.gl, new Float32Array(this.a_index));


        this.gl.useProgram(this.programData);
        util.bindAttribute(this.gl, a_indexBuffer, this.programData.a_index, 1);
        this.gl.uniform1f(this.programData["u_opacity"], 0.5);

        this.gl.useProgram(this.program);
        util.bindAttribute(this.gl, a_indexBuffer, this.program.a_index, 1);
        this.gl.uniform1f(this.program["u_opacity"], 0.5);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.pixels = new Uint8Array(this.gl.drawingBufferWidth * this.gl.drawingBufferHeight * 4);
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

    setColor(color) {
        const color2D = util.createColorRamp(color, "gradient");
        const colorTexture = util.createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR);

        this.gl.useProgram(this.programData);
        this.gl.uniform1i(this.programData["u_color"], TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.programData["u_cmm"], new Float32Array([color[0][0], color[color.length - 1][0]]));

        this.gl.useProgram(this.program);
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
        this.shadeParams=shadeParams;
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
                util.createTexture(this.gl, this.gl.LINEAR, image0, image0.width, image0.height, TEXTURE_INDEX_COORD);

                // 形成数据纹理
                util.createTexture(this.gl, this.gl.LINEAR, meteo.data, image0.width, image0.height, TEXTURE_INDEX_DATA);

                this.gl.useProgram(this.programData);
                this.gl.uniform1i(this.programData.u_lonlat, TEXTURE_INDEX_COORD);
                // 这个应该就是759、599
                this.gl.uniform2fv(this.programData.u_lonlat_radix, new Float32Array([image0.width, image0.height]));

                this.gl.uniform1i(this.programData.u_data, TEXTURE_INDEX_DATA);
                this.gl.uniform3fv(this.programData.u_lon, this.u_lon_imageLonLat);
                this.gl.uniform3fv(this.programData.u_lat, this.u_lat_imageLonLat);
                this.gl.uniform2fv(this.programData.u_min, [meteo.minAndMax[0][0], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][0] : 0]);
                this.gl.uniform2fv(this.programData.u_max, [meteo.minAndMax[0][1], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][1] : 0]);

                this.gl.useProgram(this.program);
                this.gl.uniform1i(this.program.u_lonlat, TEXTURE_INDEX_COORD);
                // 这个应该就是759、599
                this.gl.uniform2fv(this.program.u_lonlat_radix, new Float32Array([image0.width, image0.height]));

                this.gl.uniform1i(this.program.u_data, TEXTURE_INDEX_DATA);
                this.gl.uniform3fv(this.program.u_lon, this.u_lon_imageLonLat);
                this.gl.uniform3fv(this.program.u_lat, this.u_lat_imageLonLat);
                this.gl.uniform2fv(this.program.u_min, [meteo.minAndMax[0][0], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][0] : 0]);
                this.gl.uniform2fv(this.program.u_max, [meteo.minAndMax[0][1], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][1] : 0]);
                this.meteo = meteo;
                this._render();
                resolve();
            };
            // Tell the browser to load an Image
            image0.src = coordPngUrl;
        });
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

        // fixme:(1)帧缓冲区热力图
        // fixme:重要:将纹理对象绑定到纹理单元上
        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRAMEBUFFER); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboData.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboData);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.programData);
        gl.uniform3fv(this.programData.u_matrix_invert, this.globe.projection.rotate());
        // console.group("aa")
        // console.log(this.globe.projection.rotate())
        let translate = this.globe.projection.translate();
        let scale = this.globe.projection.scale();
        gl.uniform3fv(this.programData.u_translate_scale, [translate[0], translate[1], scale]);
        // console.log(translate)
        // console.log(scale)
        let currentBounds: any = this.globe.bounds(this.view);
        // console.log(currentBounds)
        gl.uniform4fv(this.programData.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        let projectionBounds:(Array<Array<number>>)=this.globe.projectionBounds();
        // console.log(projectionBounds)
        // console.groupEnd()
        gl.uniform4fv(this.programData.u_projection_bounds, [projectionBounds[0][0], projectionBounds[1][0],projectionBounds[0][1], projectionBounds[1][1]]);
        gl.uniform2fv(this.programData.u_view, [this.view.width, this.view.height]);
        util.bindAttribute(this.gl, this.a_indexBuffer, this.programData.a_index, 1);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.drawLength);
        this.gl.readPixels(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);

        // fixme:(2)热力图显示
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.gl.clearColor(0, 0, 0, 0);
        // fixme:通过深度缓冲区开启隐藏面消除功能让球体背面的点不显示出来
        // gl.enable(gl.DEPTH_TEST);
        // fixme:通过blend融混来让球体背面的点不显示出来
        // gl.enable (gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // this.gl.enable(gl.POLYGON_OFFSET_FILL);
        // this.gl.polygonOffset(1.0, 1.0);          // Set the polygon offset
        gl.useProgram(this.program);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        gl.uniform3fv(this.program.u_matrix_invert, this.globe.projection.rotate());
        // console.group("aa")
        // console.log(this.globe.projection.rotate())
        // let translate = this.globe.projection.translate();
        // let scale = this.globe.projection.scale();
        gl.uniform3fv(this.program.u_translate_scale, [translate[0], translate[1], scale]);
        // console.log(translate)
        // console.log(scale)
        // let currentBounds: any = this.globe.bounds(this.view);
        // console.log(currentBounds)
        gl.uniform4fv(this.program.u_current_bounds, [currentBounds.x, currentBounds.xMax, currentBounds.y, currentBounds.yMax]);
        // let projectionBounds:(Array<Array<number>>)=this.globe.projectionBounds();
        // console.log(projectionBounds)
        // console.groupEnd()
        gl.uniform4fv(this.program.u_projection_bounds, [projectionBounds[0][0], projectionBounds[1][0],projectionBounds[0][1], projectionBounds[1][1]]);
        gl.uniform2fv(this.program.u_view, [this.view.width, this.view.height]);
        util.bindAttribute(this.gl, this.a_indexBuffer, this.program.a_index, 1);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.drawLength);


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
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.program.u_opacity, opacity);
    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }

    initFramebufferObject(gl, width?: number, height?: number) {
        let framebuffer, texture;

        // Create a frame buffer object (FBO)
        // fixme:(1)gl.createFramebuffer()：创建帧缓冲区对象
        framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            console.log('Failed to create frame buffer object');
            gl.deleteFramebuffer(framebuffer);
        }

        // Create a texture object and set its size and parameters
        // fixme:(2)创建纹理对象并设置其尺寸和参数
        texture = gl.createTexture(); // Create a texture object
        if (!texture) {
            console.log('Failed to create texture object');
            gl.deleteTexture(texture);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
        // fixme:将纹理的尺寸设为OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT，比<canvas>略小一些，以加快绘制的速度
        // fixme:gl.texImage2D()函数可以为纹理对象分配一块存储纹理图像的区域，供WebGL在其中进行绘制
        // fixme:调用该函数，将最后一个参数设为null，就可以创建一块空白的区域。第5章中这个参数是传入的纹理图像Image对象。
        // fixme:将创建出来的纹理对象存储在framebuffer.texture属性上，以便稍后访问
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width ? width : this.gl.canvas.width, height ? height : this.gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);


        // Attach the texture and the renderbuffer object to the FBO
        // fixme:(5)使用帧缓冲区对象的方式与使用渲染缓冲区类似：先将缓冲区绑定到目标上，然后通过操作目标来操作缓冲区对象，而不能直接操作缓冲区对象
        // fixme:gl.bindFramebuffer(target,framebuffer)：将framebuffer指定的帧缓冲区对象绑定到target目标上。如果framebuffer为null，那么已经绑定到target目标上的帧缓冲区对象将被解除绑定
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数framebuffer：指定被绑定的帧缓冲区对象
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);   // fixme：必须先绑定帧缓冲区(这步在步骤里是最后一步，但这里还是得用)
        // fixme:本例使用一个纹理对象来替代颜色缓冲区，所以就将这个纹理对象指定为帧缓冲区的颜色关联对象
        // fixme:gl.framebufferTexture2D(target,attachment,textarget,texture,level)：将texture指定的纹理对象关联到绑定在target目标上的帧缓冲区
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数attachment：指定关联的类型
        // fixme:参数attachment=gl.COLOR_ATTACHMENT0时，表示texture是颜色关联对象
        // fixme:参数attachment=gl.DEPTH_ATTACHMENT时，表示texture是深度关联对象
        // fixme:参数textarget：同第二步的gl.texImage2D()的第1个参数(gl.TEXTURE_2D或gl.TEXTURE_CUBE)
        // fixme:参数texture：指定关联的纹理对象
        // fixme:参数level：指定为0(在使用MIPMAP时纹理时指定纹理的层级)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        framebuffer.texture = texture; // fixme:保存纹理对象 // Store the texture object

        // Check if FBO is configured correctly
        // fixme:(7)检查帧缓冲区是否正确配置
        // fixme:gl.checkFramebufferStatus(target)：检查绑定在target上的帧缓冲区对象的配置状态
        // fixme:参数target：必须是gl.FRAMEBUFFER
        let e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (gl.FRAMEBUFFER_COMPLETE !== e) {
            console.log('Frame buffer object is incomplete: ' + e.toString());
            return;
        }

        // Unbind the buffer object
        // fixme:这里也是全清空了
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return framebuffer;
    }


    getPixelsData(indexX, indexY){
        // fixme:浏览器canvas以左上角为原点；而帧缓冲区的纹理以左下角问原点，所以用(this.gl.drawingBufferHeight-indexY)获得对应帧缓冲区纹理的坐标
        let pixelsIndex = ((this.gl.drawingBufferHeight-indexY) * this.gl.drawingBufferWidth + indexX) * 4;

        if(this.shadeParams.computeAsVector[0]&&!this.shadeParams.computeAsVector[1]){    // 单通道
            if (this.pixels[pixelsIndex] !== 0 && this.pixels[pixelsIndex + 2] !== 0) {
                // console.log("w9在范围内");
                let rate = (this.pixels[pixelsIndex]*256.0+this.pixels[pixelsIndex + 2])/257.0/ 255.0;
                let value= rate * (this.meteo.minAndMax[0][1] - this.meteo.minAndMax[0][0]) + this.meteo.minAndMax[0][0];
                return [value];
            } else{
                // console.log("w9不在范围内")
            }
        }else if(this.shadeParams.computeAsVector[0]&&this.shadeParams.computeAsVector[1]){ // 双通道
            if (this.pixels[pixelsIndex] !== 0 && this.pixels[pixelsIndex + 1] !== 0 && this.pixels[pixelsIndex + 2] !== 0 && this.pixels[pixelsIndex + 3] !== 0) {
                // console.log("w9在范围内");
                let rate1 = (this.pixels[pixelsIndex]*256.0+this.pixels[pixelsIndex + 2])/257.0/ 255.0;
                let rate2 = (this.pixels[pixelsIndex + 1]*256.0+this.pixels[pixelsIndex + 3])/257.0/ 255.0;
                let value1= rate1 * (this.meteo.minAndMax[0][1] - this.meteo.minAndMax[0][0]) + this.meteo.minAndMax[0][0];
                let value2= rate2 * (this.meteo.minAndMax[1][1] - this.meteo.minAndMax[1][0]) + this.meteo.minAndMax[1][0];
                return [value1,value2];
                // return Math.hypot(value1,value2);
            } else{
                // console.log("w9不在范围内")
            }
        }
        return null;
    }
}


