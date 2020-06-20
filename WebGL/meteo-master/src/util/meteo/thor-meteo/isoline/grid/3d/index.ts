// fixme:字体变大，变白色
// fixme:设置显示5*5的数值
// fixme:setColor()方法里面的内容删掉了，以前也没用到
// fixme:海陆空图层相互覆盖给全删了
// fixme:把显示数值的方法提出来了,在generateVerticesWithPixels()方法中
// fixme:加了个lodash的去抖函数debounce，让字体在用户停止移动地图后100ms才重刷数值
// fixme:把数值显示都变成canvas了

// fixme:drawScale==>把卷积倍数缩放几倍==>4倍
// fixme:showFontWithMapbox控制用mapbox显示字体还是canvas2d显示字体
import {MeteoArrayBuffer, MeteoImage} from "../../../../image";
import {mat4} from "gl-matrix";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "../../../../gl";
import * as turf from "@turf/turf";
// import lodashDebounce from "lodash.debounce";
import lodash from "lodash";

import vert from "./glsl/vert.glsl";
import frag from "./glsl/frag.glsl";
import vert1 from "./glsl/vert1.glsl";
import frag1 from "./glsl/frag1.glsl";
import vertFont from "./glsl/vertFont.glsl";
import fragFont from "./glsl/fragFont.glsl";
import vertAll from "./glsl/vertAll.glsl";
import fragAll from "./glsl/fragAll.glsl";
import mapboxgl from "mapbox-gl";
import IWebGL, {MeteoResultInterface} from "@/util/meteo/thor-meteo";
import {
    MeteoTypeConfigurationInterface,
    MeteoSourceConfigurationInterface,
    MeteoSourceIndex
} from "@/util/meteo/thor-meteo/meteo";

const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_DATA = 2;
const TEXTURE_FRAMEBUFFER = 3;
const TEXTURE_FRAMEISOLINE = 4;
const TEXTURE_FRAMEFONT = 5;

export class Isoline implements IWebGL {
    private map: any;
    private lhID: string;
    private valID: string;
    private fontInfo: any;
    private fontPositions: any;
    private fontTexcoords: any;
    private fontNumVertices: any;
    private canvas!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;
    private fbo!: GLFbo;
    private fboIsoline!: GLFbo;
    private fboFont!: GLFbo;
    private pixels!: Uint8Array;
    private visible!: boolean;
    private program!: GLProgram;
    private program1!: GLProgram;
    private programFont!: GLProgram;
    private programAll!: GLProgram;
    private posBuffer!: any;
    private texBuffer!: any;
    private isolineRealtedParams!: any;
    private contourDelta!: any;
    private contourScale!: any;
    private meteo: Array<MeteoResultInterface>;
    private dataTexture: any;
    private cmm: any;
    private stopTime: any;
    private animateHandle: any;
    private geojson1: any;
    private refreshFonts: any;
    private drawScale: number;
    private textCanvas: any;
    private textCtx: CanvasRenderingContext2D;
    private la!: Map<any, any>;
    private ha!: Map<any, any>;
    private devicePixelRatio: number;
    private showFontWithMapbox: boolean;
    private is2!: boolean;
    private wgl!: WebGL;
    private meteoArrayBuffer: MeteoArrayBuffer;

    constructor(map: mapboxgl.Map) {
        this.meteo = new Array<MeteoResultInterface>();
        this.showFontWithMapbox = true;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        // 找到画布
        this.textCanvas = document.getElementById("isolineText");
        // 创建一个二维上下文
        this.textCtx = this.textCanvas.getContext("2d");
        this.drawScale = 1;
        this.lhID = 'isolineLHPoints';
        this.valID = 'isolineValue';
        this.map = map;
        this.meteoArrayBuffer = new MeteoArrayBuffer();
        // this.isolineMap=isolineMap;
        this.fontInfo = {
            letterWidth: 32,
            letterHeight: 32,
            spaceWidth: 32,
            spacing: 0,
            textureWidth: 512,
            textureHeight: 32,
            glyphInfos: {
                '0': {x: 0 * 32, y: 0, width: 32,},
                '1': {x: 1 * 32, y: 0, width: 32,},
                '2': {x: 2 * 32, y: 0, width: 32,},
                '3': {x: 3 * 32, y: 0, width: 32,},
                '4': {x: 4 * 32, y: 0, width: 32,},
                '5': {x: 5 * 32, y: 0, width: 32,},
                '6': {x: 6 * 32, y: 0, width: 32,},
                '7': {x: 7 * 32, y: 0, width: 32,},
                '8': {x: 8 * 32, y: 0, width: 32,},
                '9': {x: 9 * 32, y: 0, width: 32,},
                '.': {x: 10 * 32, y: 0, width: 32,},
                '-': {x: 11 * 32, y: 0, width: 32,}
            },
            fontWidthNumber: 6,              // 一行几个数值
            fontHeightNumber: 6,             // 一列几个数值
            fontWidthNumberRate: 0.7,        // 每个数值横向显示比例
            fontHeightNumberRate: 0.1,       // 每个数值纵向显示比例
            isolineValue: 200                // 等值线间距
        };
        this.fontPositions = [];      // 存放数值顶点坐标
        this.fontTexcoords = [];      // 存放数值纹理坐标
        this.fontNumVertices = 0;     // 存放数值坐标数量
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
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        this.textCanvas.style.cssText = mapCanvas.style.cssText;
        this.textCanvas.style.pointerEvents = 'none';
        this.textCanvas.width = mapCanvas.width;
        this.textCanvas.height = mapCanvas.height;
        div.appendChild(canvas);
        map.on('resize', (e: any) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this.fbo = this.wgl.createFBO(TEXTURE_FRAMEBUFFER, canvas.width / this.drawScale, canvas.height / this.drawScale, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, null);
            this.fboIsoline = this.wgl.createFBO(TEXTURE_FRAMEISOLINE, canvas.width, canvas.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, null);
            this.fboFont = this.wgl.createFBO(TEXTURE_FRAMEFONT, canvas.width, canvas.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, null);
            // fixme:1
            this.pixels = new Uint8Array(this.gl.drawingBufferWidth * this.gl.drawingBufferHeight * 4);
            /*// fixme:2
            this.pixels = new Uint8Array(Math.floor(this.gl.drawingBufferWidth/this.fontInfo.fontWidthNumber) * Math.floor(this.gl.drawingBufferHeight/this.fontInfo.fontHeightNumber) * 4);*/
            this._render();
        });
        map.on('move', (e: any) => {
            if (!this.visible) return;
            this._render();
        });
        map.on('load', () => {
            if (!this.visible) return;
            this._render();
        });
    }

    _initGL() {
        const gl = this.gl;
        this.program = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vert), this.wgl.compileShader(gl.FRAGMENT_SHADER, frag));

        this.program1 = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vert1), this.wgl.compileShader(gl.FRAGMENT_SHADER, frag1));

        this.programFont = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vertFont), this.wgl.compileShader(gl.FRAGMENT_SHADER, fragFont));

        this.programAll = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vertAll), this.wgl.compileShader(gl.FRAGMENT_SHADER, fragAll));

        this.fbo = this.wgl.createFBO(TEXTURE_FRAMEBUFFER, this.wgl.gl.canvas.width / this.drawScale, this.wgl.gl.canvas.height / this.drawScale, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, null);
        this.fboIsoline = this.wgl.createFBO(TEXTURE_FRAMEISOLINE, this.wgl.gl.canvas.width, this.wgl.gl.canvas.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, null);
        this.fboFont = this.wgl.createFBO(TEXTURE_FRAMEFONT, this.wgl.gl.canvas.width, this.wgl.gl.canvas.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, null);


        //初始化静态信息
        this.program.use();
        this.posBuffer = this.wgl.createBuffer(new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.texBuffer = this.wgl.createBuffer(new Float32Array([1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]));
        this.wgl.bindAttribute(this.program.attribute["a_position"], this.posBuffer, 2);
        this.wgl.gl.uniform1f(this.program.uniform.u_opacity, 1.0);

        // fixme:1
        this.pixels = new Uint8Array(this.gl.drawingBufferWidth * this.gl.drawingBufferHeight * 4);
        /*// fixme:2
        this.pixels = new Uint8Array(Math.floor(this.gl.drawingBufferWidth/this.fontInfo.fontWidthNumber) * Math.floor(this.gl.drawingBufferHeight/this.fontInfo.fontHeightNumber) * 4);*/
        // fixme:lodash.debounce的返回值是个函数，所以如果要调用的话还得在后面加个()
        // fixme:给函数设个变量名refreshFonts，以后要在哪里触发就直接this.refreshFonts()；如果在函数里每次都写lodash.debounce，那就每次都触发，因为每次都重新创建了debounce函数,不会把他们累计起来只触发一次
        this.refreshFonts = (lodash as any).debounce(() => {
            console.log(new Date());
            this.generateVerticesWithPixels();
        }, 100);
        // fixme:只引入lodash.debounce这一个方法，lodash其余方法不引入打包
        /*this.refreshFonts = lodashDebounce(() => {
            // console.log(new Date());
            this.generateVerticesWithPixels();
        }, 100);        // 提取像素数值方法1-10ms左右*/
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
        if (meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.GFS
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.HYCOM
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.SHH_WW
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C1D
            || meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.EC_C2P) {
            this.isolineRealtedParams = meteoTypeConfiguration.isolineParams;
            const contourDelta = this.contourDelta = meteoTypeConfiguration.isolineParams.delta(null);
            const contourScale = this.contourScale = meteoResults[0].lon[2];
            const w = meteoResults[0].width;
            const h = meteoResults[0].height;
            const data = this.meteoArrayBuffer.mergeGridPixelData(meteoResults);
            const min = meteoResults[0].minAndMax[0];
            const max = meteoResults[0].minAndMax[1];
            const step = this.contourDelta || this.fontInfo.isolineValue;
            let _data = standard(data, h, w, min, max, step);    // fixme:数值最低的等级是0，其余数值的都是相对最低等级0的等级
            const info: any = [];
            const _data1 = polygon(_data, h, w - 1, info);
            // fixme:la/ha={信息索引:[val,lon,lat]}
            const la = this.la = new Map();
            const ha = this.ha = new Map();
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w - 1; x++) {
                    const pval = _data1[y * (w - 1) + x];
                    const ival = info[pval];
                    const val = data[(y * w + x) * 4];
                    if (ival[1] && (!ival[2])) {
                        if ((!la.has(pval)) || val < la.get(pval)[0])
                            la.set(pval, [val, x * this.contourScale - 180, y * this.contourScale - 90]);    // fixme:这里直接用的图片，所以不用什么算法来换算成经纬度，图片就是按等经纬度间隔来存的
                    }
                    if (ival[2] && (!ival[1])) {
                        if ((!ha.has(pval)) || val > ha.get(pval)[0])
                            ha.set(pval, [val, x * this.contourScale - 180, y * this.contourScale - 90]);
                    }
                }
            }
            if (this.showFontWithMapbox) {
                const ps = [];
                for (let v of la.values())
                    ps.push(turf.point([v[1], v[2]], {
                        v: -1, val: Math.round(min + (max - min) * v[0] / 254),
                        description: "L\r\n" + meteoTypeConfiguration.isolineParams.dataFormat(min + (max - min) * v[0] / 254)
                    }));
                for (let v of ha.values())
                    ps.push(turf.point([v[1], v[2]], {
                        v: 1, val: Math.round(min + (max - min) * v[0] / 254),
                        description: "H\n\r" + meteoTypeConfiguration.isolineParams.dataFormat(min + (max - min) * v[0] / 254)
                    }));
                let clickedLayer = this.map.getLayer(this.lhID);
                if (clickedLayer) {
                    if (this.visible) {
                        this.map.setLayoutProperty(this.lhID, 'visibility', 'visible');
                    }
                    this.map.getSource(this.lhID).setData(turf.featureCollection(ps));
                } else {
                    /*this.map.addLayer({
                        'id': 'isolineHLPoints',
                        'type': 'circle',
                        "source": {
                            "type": "geojson",
                            "data": turf.featureCollection(ps)
                        },
                        'layout': {
                            'visibility': 'visible'
                        },
                        'paint': {
                            "circle-radius":  {
                                'base': 3,
                                'stops': [[2,3],[6, 5]]
                            },
                            /!*"circle-color": "#e8c305",*!/
                            "circle-color":
                            /!*{
                                'type': 'identity',
                                'property': 'color'
                            }*!/
                                [
                                    'match',
                                    ['get', 'v'],
                                    -1, '#E8161C',
                                    1, '#08FF08',
                                    /!* other *!/ '#ccc'
                                ],
                            "circle-opacity":1
                        }
                    });*/
                    this.map.addLayer({
                        'id': this.lhID,
                        'type': 'symbol',
                        "source": {
                            "type": "geojson",
                            "data": turf.featureCollection(ps)
                        },
                        'layout': {
                            "text-font": ["oss"],
                            'visibility': 'none',     // 这个初始时是隐藏的，因为只有调用show()后才应该显示，第一次进来时只是放数据，但不需要显示
                            "text-size": {
                                'base': 14,
                                'stops': [[2, 16], [3, 15], [4, 14]]
                            },
                            "text-field": "{description}",
                        },
                        "paint": {
                            "text-color": [
                                'match',
                                ['get', 'v'],
                                -1, '#0814ff',
                                1, '#E8161C',
                                /* other */ '#ccc'
                            ]
                        }
                    }/*,BoxMap.SKYLAYER*/);
                }
            }

            this.program.use();
            this.meteo = meteoResults;
            // 形成数据纹理
            this.dataTexture = this.wgl.createTexture(TEXTURE_INDEX_DATA, meteoResults[0].width, meteoResults[0].height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, this.meteoArrayBuffer.mergeGridPixelData(meteoResults));
            this.wgl.gl.uniform1i(this.program.uniform.u_data, TEXTURE_INDEX_DATA);
            this.wgl.gl.uniform3fv(this.program.uniform.u_lon, meteoResults[0].lon);
            this.wgl.gl.uniform3fv(this.program.uniform.u_lat, meteoResults[0].lat);
            this.wgl.gl.uniform1fv(this.program.uniform["u_kernel[0]"], new Float32Array([1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0,
                2.0 / 16.0, 2.0 / 16.0, 2.0 / 16.0,
                1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0]));
            this.program1.use();
            this.wgl.gl.uniform2fv(this.program1.uniform.u_min, [meteoResults[0].minAndMax[0], meteoTypeConfiguration.computeAsVector[1] ? meteoResults[1].minAndMax[0] : 0]);
            this.wgl.gl.uniform2fv(this.program1.uniform.u_max, [meteoResults[0].minAndMax[1], meteoTypeConfiguration.computeAsVector[1] ? meteoResults[1].minAndMax[1] : 0]);
            if (meteoTypeConfiguration.computeAsVector[1]) {      // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
                this.cmm = [Math.pow((Math.pow(meteoResults[0].minAndMax[0], 2) + Math.pow(meteoTypeConfiguration.computeAsVector[1] ? meteoResults[1].minAndMax[0] : 0, 2)), 0.5), Math.pow((Math.pow(meteoResults[0].minAndMax[1], 2) + Math.pow(meteoTypeConfiguration.computeAsVector[1] ? meteoResults[1].minAndMax[1] : 0, 2)), 0.5)];
            } else {
                this.cmm = [meteoResults[0].minAndMax[0], meteoResults[0].minAndMax[1]];
            }
            this._render();
        }

        //数据标准化，避免反复操作不一致
        function standard(data: any, h: any, w: any, min: any, max: any, step: any) {
            const re = new Uint8ClampedArray(h * (w - 1));//去掉相等的180
            const low = Math.floor(min / step);
            const ratio = (max - min) / 254;
            let i = 0;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w - 1; x++) {
                    re[i] = (min + data[(y * w + x) * 4] * ratio) / step - low;
                    i++;
                }
            }
            return re;
        }

        function polygon(data: any, h: any, w: any, info: any) {
            // const info = [];//[start,isLow,isHigh]
            let index = 0;
            let infoIndex = 0;
            const re = new Uint16Array(h * w);
            const k0 = new Uint8Array(6);
            const k1 = new Uint16Array(3);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    refreshK0(k0, data, h, w, y, x);
                    refreshK1(k1, re, h, w, y, x);
                    //判断连接，刷新，如果刷新需要重新刷新k1
                    const lk = link(k0, k1, re, info, index);
                    if (lk !== -1) {
                        refreshK1(k1, re, h, w, y, x);
                        infoIndex = lk;
                    }
                    // const low = (k0[0]!==255&&k0[3]<k0[0])||(k0[0]!==255&&k0[3]<k0[1])||(k0[0]!==255&&k0[3]<k0[2]);
                    // const high =(k0[0]!==255&&k0[3]>k0[0])||(k0[0]!==255&&k0[3]>k0[1])||(k0[0]!==255&&k0[3]>k0[2]);
                    const low = k0.findIndex(val => val !== 255 && val > k0[3]) !== -1;
                    const high = k0.findIndex(val => val !== 255 && val < k0[3]) !== -1;
                    const ki = k0.findIndex(val => val === k0[3]);
                    if (ki === 3 || k1[2] === 0xffff || index === 0) {
                        re[index] = infoIndex;
                        if (infoIndex < info.length)
                            info[infoIndex] = [index, low, high];
                        else
                            info.push([index, low, high]);
                        infoIndex = info.length;
                    } else {
                        const val = k1[ki];
                        re[index] = val;
                        info[val][1] = info[val][1] || low;
                        info[val][2] = info[val][2] || high;
                    }
                    index++;
                }
                //判断收尾是否相连
                const re0 = re[y * w];
                const re1 = re[(y + 1) * w - 1];
                if (data[y * w] === data[(y + 1) * w - 1] && re0 !== re1) {
                    //替换起始位置靠后的
                    const from = info[re0][0] < info[re1][0] ? re1 : re0;
                    const to = info[re0][0] < info[re1][0] ? re0 : re1;
                    infoIndex = linkInfo(re, info, from, to, index);
                }
            }
            return re;

            function link(k0: any, k1: any, data: any, info: any, index: any) {
                if (k0[1] === 255 || k1[2] === 0xffff || k0[1] !== k0[2] || k1[1] === k1[2])
                    return -1;
                //替换起始位置靠后的
                const from = info[k1[1]][0] < info[k1[2]][0] ? k1[2] : k1[1];
                const to = info[k1[1]][0] < info[k1[2]][0] ? k1[1] : k1[2];
                return linkInfo(data, info, from, to, index);
            }

            function linkInfo(data: any, info: any, from: any, to: any, index: any) {
                for (let i = info[from][0]; i < index; i++) {
                    if (data[i] === from) data[i] = to;
                }
                info[to][1] = info[to][1] || info[from][1];
                info[to][2] = info[to][2] || info[from][2];
                info[from] = null;
                return from;
            }

            function refreshK0(kernel: any, data: any, h: any, w: any, y: any, x: any) {
                // 0 1
                // 2 3 4
                //   5
                //4,5后加，修正low和high
                const py = y - 1;
                const px = x > 0 ? x - 1 : w - 1;
                kernel[0] = y - 1 < 0 ? 255 : data[py * w + px];
                kernel[1] = y - 1 < 0 ? 255 : data[py * w + x];
                kernel[2] = data[y * w + px];
                kernel[3] = data[y * w + x];
                kernel[4] = data[y * w + ((x + 1) === w ? 0 : (x + 1))];
                kernel[5] = data[((y + 1) === h ? y : (y + 1)) * w + x];
            }

            function refreshK1(kernel: any, data: any, h: any, w: any, y: any, x: any) {
                const py = y - 1;
                const px = x > 0 ? x - 1 : w - 1;
                kernel[0] = y - 1 < 0 ? 0xffff : data[py * w + px];
                kernel[1] = y - 1 < 0 ? 0xffff : data[py * w + x];
                kernel[2] = x === 0 ? 0xffff : data[y * w + px];
            }
        }

    }

    _render() {

        const _this = this;
        this.stopTime = new Date().getTime() + 200;
        if (_this.animateHandle)
            return;
        frame();

        function frame() {
            _this._frame();
            if (new Date().getTime() < _this.stopTime)
                _this.animateHandle = requestAnimationFrame(frame);
            else
                delete _this.animateHandle;
        }
    }

    _frame() {
        if (this.meteo.length < 1) return;
        if (!this.visible) return;
        // 清空二维画布
        this.textCtx.clearRect(0, 0, this.textCtx.canvas.width, this.textCtx.canvas.height);
        this.contourDelta = this.isolineRealtedParams.delta(this.map.getZoom());
        const gl = this.gl;
        // fixme:(1)帧缓冲区热力图
        // fixme:重要:将纹理对象绑定到纹理单元上
        this.wgl.bindTexture(this.fbo.texture, this.fbo.index); // fixme:这里放的是帧缓冲区的纹理图像
        this.wgl.bindFrameBuffer(this.fbo.fbo);

        // fixme:gl.viewport(x, y, width, height)==>用来设置视口，即指定从标准设备到窗口坐标的x、y仿射变换
        // x：GLint，用来设定视口的左下角水平坐标。默认值：0。
        // y：GLint，用来设定视口的左下角垂直坐标。默认值：0。
        // width：非负数Glsizei，用来设定视口的宽度。默认值：canvas的宽度。
        // height：非负数Glsizei，用来设定视口的高度。默认值：canvas的高度。
        this.wgl.viewport(this.gl.canvas.width / this.drawScale, this.gl.canvas.height / this.drawScale);
        this.wgl.gl.clearColor(0, 0, 0, 0);
        this.wgl.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.program.use();
        this.wgl.bindTexture(this.dataTexture, TEXTURE_INDEX_DATA);
        this.wgl.gl.uniformMatrix4fv(this.program.uniform.u_matrix_invert, false, this._matrixInvert());
        this.wgl.gl.uniform2fv(this.program.uniform.u_textureSize, [this.gl.canvas.width / this.drawScale, this.gl.canvas.height / this.drawScale]);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // fixme:(2)帧缓冲区等值线
        this.wgl.bindTexture(this.fboIsoline.texture, this.fboIsoline.index); // fixme:这里放的是帧缓冲区的纹理图像
        this.wgl.bindFrameBuffer(this.fboIsoline.fbo);

        this.wgl.viewport(this.gl.canvas.width, this.gl.canvas.height);
        this.wgl.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.program1.use();
        this.wgl.bindAttribute(this.program1.attribute.a_pos, this.posBuffer, 2);
        this.wgl.bindAttribute(this.program1.attribute.a_texCoord, this.texBuffer, 2);
        this.wgl.gl.uniform1i(this.program1.uniform.u_frameImage, TEXTURE_FRAMEBUFFER);
        this.wgl.gl.uniform1f(this.program1.uniform.u_isoline, this.contourDelta || this.fontInfo.isolineValue);
        //初始化静态信息
        this.wgl.gl.uniform2fv(this.program1.uniform.u_textureSize, [this.gl.canvas.width / this.drawScale, this.gl.canvas.height / this.drawScale]);
        this.wgl.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        // console.time("mark");
        // region fixme:刷新数值
        // this.generateVerticesWithPixels();
        /*(lodash as any).debounce(() => {
            console.log(new Date());
            // this.generateVerticesWithPixels();
        }, 5000)();*/
        // fixme:把提取像素点方法提出来了
        this.gl.readPixels(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
        let clickedLayer = this.map.getLayer(this.valID);
        if (clickedLayer) { // 要先隐藏
            this.map.setLayoutProperty(this.valID, 'visibility', 'none');
        }
        this.refreshFonts(); // 刷新数值
        // endregion
        // fixme:(3)颜色缓冲区文字显示
        // todo:为什么不做第四步，而直接在第三步就显示出来的话，readPixels总读不出来数？？？？？？？？
        /*this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_FRAMEFONT); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboFont.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboFont);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programFont);
        this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_INDEX_NUMBERS); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.numTexture); // fixme:这里放的是帧缓冲区的纹理图像
        this.gl.uniform1i(this.programFont.u_numbers, TEXTURE_INDEX_NUMBERS);
        //初始化静态信息
        const posBufferFont = createBuffer(gl, new Float32Array(this.fontPositions));
        bindAttribute(gl, posBufferFont, this.programFont.a_position, 2);
        const texBufferFont = createBuffer(gl, new Float32Array(this.fontTexcoords));
        bindAttribute(gl, texBufferFont, this.programFont.a_texCoord, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, this.fontNumVertices);*/

        // fixme:(4)颜色缓冲区文字显示+等值线显示
        this.wgl.unbindFrameBuffer();
        this.wgl.viewport(this.gl.canvas.width, this.gl.canvas.height);
        this.wgl.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.programAll.use();
        this.wgl.bindAttribute(this.programAll.attribute["a_position"], this.posBuffer, 2);
        this.wgl.bindTexture(this.fboIsoline.texture, this.fboIsoline.index); // fixme:这里放的是帧缓冲区的纹理图像
        this.wgl.gl.uniform1i(this.programAll.uniform.u_frameIsoline, this.fboIsoline.index);
        this.wgl.bindTexture(this.fboFont.texture, this.fboFont.index); // fixme:这里放的是帧缓冲区的纹理图像
        this.wgl.gl.uniform1i(this.programAll.uniform.u_frameFont, this.fboFont.index);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    // 通过从帧缓冲区取出的像素来找要画的点
    generateVerticesWithPixels() {
        let perFontWidth = Math.floor(this.gl.drawingBufferWidth / this.fontInfo.fontWidthNumber);
        let perFontHeight = Math.floor(this.gl.drawingBufferHeight / this.fontInfo.fontHeightNumber);
        let fontArray = [];
        // fixme:1:一次性readPixels
        // fixme:1-1:所有位置筛选
        /*this.gl.readPixels(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
        for(let heightNumber=0;heightNumber<this.fontInfo.fontHeightNumber;heightNumber++){
            for(let widthNumber=0;widthNumber<this.fontInfo.fontWidthNumber;widthNumber++){
                for(let y=0;y<perFontHeight;y++){
                    if(heightNumber*this.fontInfo.fontWidthNumber+widthNumber+1===fontArray.length){
                        break;
                    }
                    for(let x=0;x<perFontWidth;x++){
                        let indexX=perFontWidth*widthNumber+x;
                        let indexY=perFontHeight*heightNumber+y;
                        let pixelsIndex=(indexY*this.gl.drawingBufferWidth+indexX)*4;
                        if(this.pixels[pixelsIndex]!==0||this.pixels[pixelsIndex+1]!==0||this.pixels[pixelsIndex+2]!==0||this.pixels[pixelsIndex+3]!==0){
                            let rate=(this.pixels[pixelsIndex]*1.0+this.pixels[pixelsIndex+1]/256.0+this.pixels[pixelsIndex+2]/(256.0*256.0)+this.pixels[pixelsIndex+3]/(256.0*256.0*256.0))/255.0;
                            fontArray.push([pixelsIndex/4,Math.round((rate*(this.cmm[1]-this.cmm[0])+this.cmm[0])/this.contourDelta||this.fontInfo.isolineValue)*this.contourDelta||this.fontInfo.isolineValue]);
                            break;
                        }else if(x===perFontWidth-1&&y===perFontHeight-1){
                            fontArray.push(-1);
                            break;
                        }
                    }
                }
            }
        }*/
        // fixme:1-2:留上下左右边缘，防止数值重叠
        // this.gl.readPixels(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
        let startWidth = 0 + Math.floor(perFontWidth / 5);
        let endWidth = perFontWidth - Math.floor(perFontWidth / 5);
        let startHeight = 0 + Math.floor(perFontHeight / 5);
        let endHeight = perFontHeight - Math.floor(perFontHeight / 5);
        for (let heightNumber = 0; heightNumber < this.fontInfo.fontHeightNumber; heightNumber++) {
            for (let widthNumber = 0; widthNumber < this.fontInfo.fontWidthNumber; widthNumber++) {
                for (let y = startHeight; y < endHeight; y++) {
                    /*if(heightNumber===0||heightNumber===this.fontInfo.fontHeightNumber-1||widthNumber===0||widthNumber===this.fontInfo.fontWidthNumber-1){
                        fontArray.push(-1);
                        break;
                    }*/
                    if (heightNumber * this.fontInfo.fontWidthNumber + widthNumber + 1 === fontArray.length) {
                        break;
                    }
                    for (let x = startWidth; x < endWidth; x++) {
                        let indexX = perFontWidth * widthNumber + x;
                        let indexY = perFontHeight * heightNumber + y;
                        let pixelsIndex = (indexY * this.gl.drawingBufferWidth + indexX) * 4;
                        if (this.pixels[pixelsIndex] !== 0 || this.pixels[pixelsIndex + 1] !== 0 || this.pixels[pixelsIndex + 2] !== 0 || this.pixels[pixelsIndex + 3] !== 0) {
                            let rate = (this.pixels[pixelsIndex] * 1.0 + this.pixels[pixelsIndex + 1] / 256.0 + this.pixels[pixelsIndex + 2] / (256.0 * 256.0) + this.pixels[pixelsIndex + 3] / (256.0 * 256.0 * 256.0)) / 255.0;
                            if (this.showFontWithMapbox) {
                                fontArray.push([pixelsIndex / 4, Math.round((rate * (this.cmm[1] - this.cmm[0]) + this.cmm[0]) / this.contourDelta || this.fontInfo.isolineValue) * this.contourDelta || this.fontInfo.isolineValue]);
                            } else {
                                fontArray.push([pixelsIndex / 4, Math.round((rate * (this.cmm[1] - this.cmm[0]) + this.cmm[0]) / this.contourDelta || this.fontInfo.isolineValue) * this.contourDelta || this.fontInfo.isolineValue, indexX, indexY]);
                            }
                            break;
                        } else if (x === endWidth - 1 && y === endHeight - 1) {
                            fontArray.push(-1);
                            break;
                        }
                    }
                }
            }
        }


        /*  // fixme:2:分批readPixels
        for(let i=0;i<this.fontInfo.fontWidthNumber*this.fontInfo.fontHeightNumber;i++){
            let heightNumber=Math.floor(i/this.fontInfo.fontWidthNumber);
            let widthNumber=i%this.fontInfo.fontWidthNumber;
            this.gl.readPixels(perFontWidth*widthNumber, perFontHeight*heightNumber,perFontWidth, perFontHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
            /!*!// fixme:2-2三角函数筛选
            for(let x=0;x<perFontWidth;x++){
                if(i+1===fontArray.length){
                    break;
                }
                let sinx=Math.sin(x/perFontWidth*4*Math.PI);
                let paramY=new Uint8Array([Math.floor((sinx+1)*perFontHeight/2)]);
                for(let y=0;y<paramY.byteLength;y++){
                    let indexX=x;
                    let indexY=paramY[y];
                    let pixelsIndex=(indexY*perFontWidth+indexX)*4;
                    if(this.pixels[pixelsIndex]!==0||this.pixels[pixelsIndex+1]!==0||this.pixels[pixelsIndex+2]!==0||this.pixels[pixelsIndex+3]!==0){
                        let rate=(this.pixels[pixelsIndex]*1.0+this.pixels[pixelsIndex+1]/256.0+this.pixels[pixelsIndex+2]/(256.0*256.0)+this.pixels[pixelsIndex+3]/(256.0*256.0*256.0))/255.0;
                        fontArray.push([(perFontHeight*heightNumber+y)*this.gl.drawingBufferWidth+(perFontWidth*widthNumber+x),
                            Math.round((rate*(this.cmm[1]-this.cmm[0])+this.cmm[0])/this.contourDelta||this.fontInfo.isolineValue)*this.contourDelta||this.fontInfo.isolineValue]);
                        break;
                    }else if(x===perFontWidth-1&&y===perFontHeight-1){
                        fontArray.push(-1);
                        break;
                    }
                }
            }*!/

            // fixme:2-1:遍历所有筛选
            for(let y=0;y<perFontHeight;y+=Math.floor(perFontHeight/40)){
                if(i+1===fontArray.length){
                    break;
                }
                for(let x=0;x<perFontWidth;x+=Math.floor(perFontWidth/40)){
                    let indexX=x;
                    let indexY=y;
                    let pixelsIndex=(indexY*perFontWidth+indexX)*4;
                    if(this.pixels[pixelsIndex]!==0||this.pixels[pixelsIndex+1]!==0||this.pixels[pixelsIndex+2]!==0||this.pixels[pixelsIndex+3]!==0){
                        let rate=(this.pixels[pixelsIndex]*1.0+this.pixels[pixelsIndex+1]/256.0+this.pixels[pixelsIndex+2]/(256.0*256.0)+this.pixels[pixelsIndex+3]/(256.0*256.0*256.0))/255.0;
                        fontArray.push([(perFontHeight*heightNumber+y)*this.gl.drawingBufferWidth+(perFontWidth*widthNumber+x),
                            Math.round((rate*(this.cmm[1]-this.cmm[0])+this.cmm[0])/this.contourDelta||this.fontInfo.isolineValue)*this.contourDelta||this.fontInfo.isolineValue]);
                        break;
                    }else if(x===perFontWidth-1&&y===perFontHeight-1){
                        fontArray.push(-1);
                        break;
                    }
                }
            }
        }*/

        // console.timeEnd("mark");
        this.fontPositions = [];
        this.fontTexcoords = [];
        this.fontNumVertices = 0;
        this.showVerticesWithMapbox(this.fontInfo, fontArray);
    }

    showVerticesWithMapbox(fontInfo: any, fontArrays: any) {
        this.textCtx.fillStyle = "#10f5ff";
        this.textCtx.textAlign = "center";
        this.textCtx.textBaseline = "middle";
        this.textCtx.font = "13px Arial";
        this.geojson1 = {
            "type": "FeatureCollection",
            "features": []
        };
        let martix = this._matrixInvert();
        for (let i = 0; i < fontArrays.length; i++) {
            let fontArray = fontArrays[i];
            if (this.showFontWithMapbox && fontArray.length === 2) {
                let fontIndex = fontArray[0];
                let fontIndexX = 2.0 * (fontIndex % this.gl.canvas.width / this.gl.canvas.width) - 1.0;
                let fontIndexY = 2.0 * (Math.floor(fontIndex / this.gl.canvas.width) / this.gl.canvas.height) - 1.0;
                let x = fontIndexX;
                let y = fontIndexY;
                const p0 = mat4.identity(<mat4>new Float32Array(4)); // 定义为单元阵
                const p1 = mat4.identity(<mat4>new Float32Array(4)); // 定义为单元阵
                mat4.multiply(p0, <mat4>martix, <mat4>new Float32Array([x, y, 0, 1]));
                mat4.multiply(p1, <mat4>martix, <mat4>new Float32Array([x, y, 1, 1]));
                for (let ii = 0; ii < 4; ii++) {
                    p0[ii] /= p0[3];
                    p1[ii] /= p1[3];
                }
                let t = (p0[2] === p1[2] ? 0.0 : (0.0 - p0[2]) / (p1[2] - p0[2]));
                const tp = new Float32Array([p0[0] * (1 - t) + p1[0] * t, p0[1] * (1 - t) + p1[1] * t]);
                if (tp[1] < 1.0 && tp[1] > 0.0) {
                    let lon = -180.0 * (1 - tp[0]) + 180.0 * tp[0];
                    let lat = (Math.atan((Math.exp(Math.PI * (1.0 - 2.0 * tp[1])) - Math.exp(-Math.PI * (1.0 - 2.0 * tp[1]))) / 2.0)) * 180.0 / Math.PI;
                    this.geojson1.features.push({
                        "type": "Feature",
                        "properties": {
                            "description": this.isolineRealtedParams.dataFormat(fontArray[1]),    // 单位是百帕
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lon, lat]
                        }
                    });
                }
            }
            if (!this.showFontWithMapbox && fontArray.length === 4) {
                this.textCtx.fillText(this.isolineRealtedParams.dataFormat(fontArray[1]), fontArray[2], this.textCanvas.height - fontArray[3]);
            }
        }
        if (!this.showFontWithMapbox) {
            this.textCtx.font = "16px Arial";
            this.textCtx.fillStyle = "#0814ff";
            for (let v of this.la.values()) {
                let value = (Math.round(this.meteo[0].minAndMax[0] + (this.meteo[0].minAndMax[1] - this.meteo[0].minAndMax[0]) * v[0] / 254) / 100).toFixed(0);
                this.computePixelCoordinatesAndDrawText(v, value, "L");
            }
            this.textCtx.fillStyle = "#E8161C";
            for (let v of this.ha.values()) {
                let value = (Math.round(this.meteo[0].minAndMax[0] + (this.meteo[0].minAndMax[1] - this.meteo[0].minAndMax[0]) * v[0] / 254) / 100).toFixed(0);
                this.computePixelCoordinatesAndDrawText(v, value, "H");
            }
        }

        let clickedLayer = this.map.getLayer(this.valID);
        if (clickedLayer) {
            this.map.setLayoutProperty(this.valID, 'visibility', 'visible');
            this.map.getSource(this.valID).setData(this.geojson1);
        } else {
            this.map.addLayer({
                'id': this.valID,
                'type': 'symbol',
                "source": {
                    "type": "geojson",
                    "data": this.geojson1
                },
                'layout': {
                    "text-font": ["oss"],
                    'visibility': 'visible',    // 这个是调用show()后渲染完就显示，因为只会进来一次
                    "text-size": {
                        'base': 2,
                        'stops': [[2, 14], [3, 13], [4, 12]]
                    },
                    "text-field": "{description}"
                },
                "paint": {
                    "text-color": "#10f5ff"
                }
            });
        }
    }

    computePixelCoordinatesAndDrawText(pointArray: Array<number>, value: string, highOrLowPointSign: string) {
        // 计算经度-180~180的像素坐标
        let pos = this.map.project([pointArray[1], pointArray[2]]);   // 通过project()把经纬度转换为屏幕像素点，像素点是相对于canvas中style的width和height确定的，而不是canvas的width和height，所以还需要用到window.devicePixelRatio
        this.signHighOrLowPointText(pos, value, highOrLowPointSign);
        // 计算经度180~540的像素坐标
        pos = this.map.project([pointArray[1] + 360, pointArray[2]]);
        this.signHighOrLowPointText(pos, value, highOrLowPointSign);
        // 计算经度-540~-180的像素坐标
        pos = this.map.project([pointArray[1] - 360, pointArray[2]]);
        this.signHighOrLowPointText(pos, value, highOrLowPointSign);
    }

    signHighOrLowPointText(pos: any, value: string, highOrLowPointSign: string) {
        if (pos.x >= 0 && pos.x <= this.gl.canvas.width / this.devicePixelRatio && pos.y >= 0 && pos.y <= this.gl.canvas.height / this.devicePixelRatio) {
            this.textCtx.fillText(highOrLowPointSign, pos.x * this.devicePixelRatio, pos.y * this.devicePixelRatio);
            this.textCtx.fillText(value, pos.x * this.devicePixelRatio, pos.y * this.devicePixelRatio + 16);
        }
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

    show() {
        this.visible = true;
        /* if (this.canvas.style.zIndex === "-1") {
             this.map.moveLayer(this.valID, "^" + this.BoxMap.BASELAYER);
         }*/
        if (this.map.getLayer(this.lhID)) {
            this.map.setLayoutProperty(this.lhID, 'visibility', 'visible');
        }
        this._render();
    }

    hide() {
        this.visible = false;
        if (this.map.getLayer(this.lhID)) {
            this.map.setLayoutProperty(this.lhID, 'visibility', 'none');
        }
        if (this.map.getLayer(this.valID)) {
            this.map.setLayoutProperty(this.valID, 'visibility', 'none');
        }
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // 清空二维画布
        this.textCtx.clearRect(0, 0, this.textCtx.canvas.width, this.textCtx.canvas.height);
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
