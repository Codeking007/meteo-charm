import {MeteoArrayBuffer, MeteoImage} from "../../../../image";
import {mat4} from "gl-matrix";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "../../../../gl";
import vert from "./glsl/vert.glsl";
import frag from "./glsl/frag.glsl";
import vertAll from "./glsl/vertAll.glsl";
import fragAll from "./glsl/fragAll.glsl";
import mapboxgl from "mapbox-gl";
import IWebGL, {MeteoResultInterface} from "@/util/meteo/thor-meteo";
import {
    MeteoTypeConfigurationInterface,
    MeteoSourceConfigurationInterface,
    MeteoSourceIndex
} from "@/util/meteo/thor-meteo/meteo";

declare let window: any;
const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_DATA = 5;
const TEXTURE_INDEX_WINDBAR = 6;
const TEXTURE_FRAMEBUFFER = 7;

class Texture {
    context: any;
    size: any;
    format: any;
    texture: any;
    filter: any;
    wrap: any;

    constructor(context: any, image: any, format: any, premultiply: any) {
        this.context = context;

        const {width, height} = image;
        this.size = [width, height];
        this.format = format;

        this.texture = context.gl.createTexture();
        this.update(image, premultiply);
    }

    update(image: any, premultiply: any) {
        const {width, height} = image;
        this.size = [width, height];

        const {context} = this;
        const {gl} = context;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        context.pixelStoreUnpack.set(1);
        // 这里进去了
        if (this.format === gl.RGBA && premultiply !== false) {
            context.pixelStoreUnpackPremultiplyAlpha.set(true);
        }

        if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof HTMLVideoElement || image instanceof ImageData) {
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, gl.UNSIGNED_BYTE, image);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, gl.UNSIGNED_BYTE, image.data);
        }
    }

    bind(filter: any, wrap: any, minFilter: any) {
        const {context} = this;
        const {gl} = context;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        if (filter !== this.filter) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter || filter);
            this.filter = filter;
        }

        if (wrap !== this.wrap) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
            this.wrap = wrap;
        }
    }

    destroy() {
        const {gl} = this.context;
        gl.deleteTexture(this.texture);
        this.texture = (null);
    }
}

export class TileBar implements IWebGL {
    private map: any;
    private fontNum!: number[];
    private canvas!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;
    private visiable!: boolean;
    private fbo: any;
    private programAll!: GLProgram;
    private posBuffer!: any;
    private texBuffer!: any;
    private meteo: Array<MeteoResultInterface>;
    private windBarTexture: any;
    private loadBarPng!: boolean;
    private pxRatio!: number;
    private mapSourceId: string;
    private mapLayerId: string;
    private tileSize!: number;
    private is2!: boolean;
    private wgl!: WebGL;
    private program!: GLProgram;
    private meteoArrayBuffer: MeteoArrayBuffer;

    constructor(map: mapboxgl.Map) {
        this.meteo = new Array<MeteoResultInterface>();
        this.map = map;
        this.meteoArrayBuffer = new MeteoArrayBuffer();
        this.mapSourceId = "windBarSource";
        this.mapLayerId = "windBarLayer";
        this._init();
        this._initGL();
        // this._render(this.mapSourceId, this.mapSourceId);    // 加载重写的mapbox源码==>生成瓦片的  // fixme:因为layer不加载就不会刷，所以初始化时先不addlayer，等数据全加载完了再addlayer
    }

    done(err: any, img: any, tile: any, callback: any) {
        delete tile.request;
        if (tile.aborted) {
            tile.state = 'unloaded';
            callback(null);
        } else if (err) {
            tile.state = 'errored';
            callback(err);
        } else if (img) {
            if (this.map._refreshExpiredTiles) tile.setExpiryData(img);
            delete (img).cacheControl;
            delete (img).expires;
            const context = this.map.painter.context;
            const gl = context.gl;
            tile.texture = this.map.painter.getTileTexture(img.width);
            if (tile.texture) {
                tile.texture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE, gl.LINEAR_MIPMAP_NEAREST);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, img.width, img.height, gl.RGBA, gl.UNSIGNED_BYTE, img.data);
            } else {
                tile.texture = new Texture(context, img, gl.RGBA, null);
                tile.texture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE, gl.LINEAR_MIPMAP_NEAREST);
                if (context.extTextureFilterAnisotropic) {
                    gl.texParameterf(gl.TEXTURE_2D, context.extTextureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT, context.extTextureFilterAnisotropicMax);
                }
            }
            gl.generateMipmap(gl.TEXTURE_2D);
            tile.state = 'loaded';
            callback(null);
        }
    }

    _init() {
        this.pxRatio = 1;
        if (window.devicePixelRatio) {
            // this.pxRatio = (window.devicePixelRatio > 2) ? (window.devicePixelRatio - 1) : (window.devicePixelRatio);
            this.pxRatio = window.devicePixelRatio;
        }
        this.fontNum = [60, 30];       // 第一步画8*8大的，就存8*8个值
        this.loadBarPng = false;

        this.tileSize = TILESIZE_DEFAULT;
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.tileSize;
        this.canvas.height = this.tileSize;
        const params = {depth: false, stencil: false, antialias: false};
        let gl = this.gl = this.canvas.getContext('webgl2', params) as WebGLRenderingContext;
        this.is2 = !!gl;
        if (!this.is2) {
            gl = this.gl = this.canvas.getContext('webgl', params) as WebGLRenderingContext;
        }
        const wgl = this.wgl = new WebGL(gl);
        this.resizeFontNum(this.canvas.width, this.canvas.height);
    }

    resizeFontNum(canvasWidth: number, canvasHeight: number) {
        let windBar_icon_width_height = [32, 32];  // 风杆图片每个图标的宽度、高度
        // let windBar_icon_width_height = [48, 48];  // 风杆图片每个图标的宽度、高度
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

    load(url: string, meteoTypeConfiguration: MeteoTypeConfigurationInterface, meteoSourcePrecision: number,): Promise<Array<MeteoResultInterface>> {
        return new Promise((resolve, reject) => {
            this.meteoArrayBuffer.load(url, meteoTypeConfiguration, meteoSourcePrecision).then((meteoData: Array<Float32Array>) => {
                debugger
                let meteoResults: Array<MeteoResultInterface> = [];
                if (meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.GFS
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.HYCOM
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.SHH_WW
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C1D
                    || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C2P) {
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
            });
        });
    }

    loadMeteo(meteoResults: Array<MeteoResultInterface>, meteoTypeConfiguration: MeteoTypeConfigurationInterface) {
        return new Promise(resolve => {
            if (meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.GFS
                || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.HYCOM
                || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.SHH_WW
                || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C1D
                || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C2P) {

                this.meteo = meteoResults;
                // 形成数据纹理
                this.wgl.createTexture(TEXTURE_INDEX_DATA, meteoResults[0].width, meteoResults[0].height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, this.meteoArrayBuffer.mergeGridPixelData(meteoResults));
                this.program.use();
                this.wgl.gl.uniform1i(this.program.uniform.u_data, TEXTURE_INDEX_DATA);
                this.wgl.gl.uniform3fv(this.program.uniform.u_lon, meteoResults[0].lon);
                this.wgl.gl.uniform3fv(this.program.uniform.u_lat, meteoResults[0].lat);
                this.programAll.use();
                this.wgl.gl.uniform2fv(this.programAll.uniform.u_min, [meteoResults[0].minAndMax[0], meteoResults[1].minAndMax[0]]);
                this.wgl.gl.uniform2fv(this.programAll.uniform.u_max, [meteoResults[0].minAndMax[1], meteoResults[1].minAndMax[1]]);
                this.loadWindBar(meteoResults).then(() => {
                    resolve();
                });
            }
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
                const windBarTexture = this.windBarTexture = this.wgl.createTexture(TEXTURE_INDEX_WINDBAR, image0.width, image0.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, barData);
                this.gl.uniform1i(this.programAll.uniform.u_windBar, TEXTURE_INDEX_WINDBAR);
                this.gl.uniform2fv(this.programAll.uniform.u_windBar_radix, new Float32Array([image0.width, image0.height]));
                this.loadBarPng = true; // todo:可以在meteo.js加.then()，这样就不用这个属性了
                if (this.map.getLayer(this.mapLayerId)) {
                    this.map.setLayoutProperty(this.mapLayerId, 'visibility', 'visible');
                }
                this._render(this.mapLayerId, this.mapSourceId);
                resolve();
            };
            // Tell the browser to load an Image
            image0.src = './img/meteo/bar/windBar_32.png';
            // image0.src = './img/meteo/bar/windBar_48.png';
        });
    }

    _render(mapLayerId: string | null, mapSourceId: string | null) {
        if (this.map.getSource(mapSourceId)) {
            this.map.getSource(mapSourceId).setData({"type": "FeatureCollection", "features": []});
        } else {
            this.map.addSource(mapSourceId, {type: 'geojson', "data": {"type": "FeatureCollection", "features": []}});
            const geo = this.map.getSource(mapSourceId);
            geo.tileSize = 256;
            geo.loadTile = (tile: any, callback: any) => {
                const img = this.buildShadedTile(tile);
                if (img) {
                    this.done.bind(geo)(null, img, tile, callback);
                }
            };
        }
        if (mapLayerId && (!this.map.getLayer(mapLayerId))) {
            this.map.addLayer({     // fixme:layer要写在geo.loadTile后面，这样才不会立马加载
                'id': mapLayerId,
                "source": mapSourceId,
                'type': 'raster',
                // 'paint' : {
                //   'raster-opacity' : 0.2
                // }
            });
        }
    }

    buildShadedTile(tile: any) {
        let coord = tile.tileID.canonical;
        return this.getVectorTile(coord.x, coord.y, coord.z);
    }

    getVectorTile(x: number, y: number, z: number) {
        if (this.meteo.length < 1) return;
        if (!this.visiable) return;
        if (!this.loadBarPng) return;

        // fixme:(1)铺热力图，像素存的是uv比例值
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
        this.wgl.gl.uniform3f(this.program.uniform.u_coord, x, y, z);
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
        const pixels = new Uint8Array(this.tileSize * this.tileSize * 4);
        this.gl.readPixels(0, 0, this.tileSize, this.tileSize, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        return {width: this.tileSize, height: this.tileSize, data: pixels};
    }

    show() {
        this.visiable = true;
        if (this.map.getLayer(this.mapLayerId)) {
            this.map.setLayoutProperty(this.mapLayerId, 'visibility', 'visible');
        }
        this._render(null, this.mapSourceId);
    }

    hide() {
        this.visiable = false;
        this.gl.clearColor(255, 255, 255, 0); //把清理缓冲区的值设置为黑色
        this.gl.clear(this.gl.COLOR_BUFFER_BIT); //调用clear方法，传入参数gl.COLOR_BUFFER_BIT告诉WebGL使用之前定义的颜色来填充相应区域。
        if (this.map.getLayer(this.mapLayerId)) {
            this.map.setLayoutProperty(this.mapLayerId, 'visibility', 'none');
        }
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
