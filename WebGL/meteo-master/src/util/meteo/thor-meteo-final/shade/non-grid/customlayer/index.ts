import {MeteoImage, MeteoArrayBuffer} from "../../../image";
import {mat4} from "gl-matrix";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "../../../gl";
import vert from "./glsl/vert.glsl";
import frag from "./glsl/frag.glsl";
import mapboxgl from "mapbox-gl";
import IWebGL, {MeteoResultInterface} from "@/util/meteo/thor-meteo-final";
import {
    MeteoTypeConfigurationInterface,
    MeteoSourceConfigurationInterface,
    MeteoSourceIndex, ProductParamsInterface
} from "@/util/meteo/thor-meteo-final/meteo";
import {BoxMap} from "@/components/map/ts/mapOption";

const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 7;
const TEXTURE_INDEX_DATA_NORTH = 6;
const TEXTURE_INDEX_DATA_SOUTH = 5;
const TEXTURE_INDEX_COORD_NORTH = 4;
const TEXTURE_INDEX_COORD_SOUTH = 3;

export class NonGridCustomLayerShade implements IWebGL {
    private map: any;
    private gl!: WebGLRenderingContext;
    private visiable!: boolean;
    private program!: GLProgram;
    private meteo: Array<MeteoResultInterface>;
    private _id: string;
    private type: string;
    private renderingMode: string;
    private dataTexture: Array<WebGLTexture | null> = new Array<WebGLTexture | null>(2);
    private coordTexture: Array<WebGLTexture | null> = new Array<WebGLTexture | null>(2);
    private meteoArrayBuffer: MeteoArrayBuffer;
    private wgl!: WebGL;
    private a_index: Array<Uint32Array> = new Array<Uint32Array>(2);
    private a_index_buffer: Array<WebGLBuffer> = new Array<WebGLBuffer>(2);
    private base_component_lon_lat: Array<MeteoResultInterface> = new Array<MeteoResultInterface>(2);

    set id(value: string) {
        this._id = value;
    }

    get id(): string {
        return this._id;
    }

// fixme:从Mapbox 0.50.0开始支持的自定义层
    constructor(map: mapboxgl.Map, layerName: string) {
        this.meteo = new Array<MeteoResultInterface>();
        this.map = map;
        this.meteoArrayBuffer = new MeteoArrayBuffer();
        this._id = layerName;
        this.type = 'custom';
        this.renderingMode = '3d';
    }

    onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext) {
        // console.log("执行onAdd()")
        this.gl = gl;
        this.wgl = new WebGL(gl);
        this._initGL();
    }

    _initGL() {
        const gl = this.gl;
        this.program = this.wgl.createProgram(this.wgl.compileShader(gl.VERTEX_SHADER, vert), this.wgl.compileShader(gl.FRAGMENT_SHADER, frag));

        this.program.use();
        this.wgl.gl.uniform1f(this.program.uniform["u_opacity"], 0.5);
    }

    setColor(color: Array<any>, colorType = WebGL.colorTypes[0]) {
        this.program.use();
        const color2D = this.wgl.createColorRamp(color, colorType);
        this.wgl.createTexture(TEXTURE_INDEX_COLOR, color2D.length / 4, 1, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, color2D);
        this.wgl.gl.uniform1i(this.program.uniform["u_color"], TEXTURE_INDEX_COLOR);
        this.wgl.gl.uniform2fv(this.program.uniform["u_cmm"], new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    between(min: number, max: number, val: number) {
        return (val - min) / (max - min);
    }

    pack(originalValue: Float32Array, baseLonRange: Float32Array, baseLatRange: Float32Array): Uint8Array {    // 二通道变四通道
        let lonlatpixel = new Uint8Array(4);
        let originalValueRate: Float32Array = new Float32Array([this.between(baseLonRange[0], baseLonRange[1], originalValue[0]), this.between(baseLatRange[0], baseLatRange[1], originalValue[1])]);
        for (let i = 0; i < originalValueRate.length; i++) {
            let val1: number = Math.floor(originalValueRate[i] * 65535.0 / 256.0);
            let val2: number = originalValueRate[i] * 65535.0 - val1 * 256.0;
            lonlatpixel[i] = val1;
            lonlatpixel[i + 2] = val2;
        }
        return lonlatpixel;
    }

    computeIndex(row: number, col: number, lonValue: Float32Array): Uint32Array {
        let re = [];
        for (let y = 0; y < row - 1; y++) {
            for (let x = 0; x < col; x++) {
                re.push(y * col + x);
                re.push((y + 1) * col + x);
                if ((x < col - 1)
                ) {
                    if (
                        (Math.sign(lonValue[y * col + x]) * Math.sign(lonValue[y * col + (x + 1)]) == -1
                            && Math.abs((lonValue[y * col + x]) - (lonValue[y * col + (x + 1)])) > 180.0)
                        || (Math.sign(lonValue[y * col + (x + 1)]) * Math.sign(lonValue[(y + 1) * col + x]) == -1
                        && Math.abs((lonValue[y * col + (x + 1)]) - (lonValue[(y + 1) * col + x])) > 180.0)
                        || (Math.sign(lonValue[(y + 1) * col + x]) * Math.sign(lonValue[y * col + x]) == -1
                        && Math.abs((lonValue[(y + 1) * col + x]) - (lonValue[y * col + x])) > 180.0)
                    ) {
                        re.push((y + 1) * col + x);
                    }
                    if (
                        (Math.sign(lonValue[y * col + (x + 1)]) * Math.sign(lonValue[(y + 1) * col + x]) == -1
                            && Math.abs((lonValue[y * col + (x + 1)]) - (lonValue[(y + 1) * col + x])) > 180.0)
                        || (Math.sign(lonValue[(y + 1) * col + x]) * Math.sign(lonValue[(y + 1) * col + (x + 1)]) == -1
                        && Math.abs((lonValue[(y + 1) * col + x]) - (lonValue[(y + 1) * col + (x + 1)])) > 180.0)
                        || (Math.sign(lonValue[(y + 1) * col + (x + 1)]) * Math.sign(lonValue[y * col + (x + 1)]) == -1
                        && Math.abs((lonValue[(y + 1) * col + (x + 1)]) - (lonValue[y * col + (x + 1)])) > 180.0)
                    ) {
                        re.push(y * col + (x + 1));
                    }
                }
            }
            if (y < row - 2) {
                re.push((y + 2) * col - 1);
                re.push((y + 1) * col);
            }
        }
        return new Uint32Array(re);
    }

    load(url: number, meteoTypeConfiguration: MeteoTypeConfigurationInterface, meteoSourcePrecision: number,productParams: ProductParamsInterface): Promise<Array<MeteoResultInterface>> {
        return new Promise((resolve, reject) => {
            this.meteoArrayBuffer.load(url, meteoTypeConfiguration, meteoSourcePrecision,productParams).then((meteoData: Array<Float32Array>) => {
                // debugger
                let hasFinishedNum: number = 0; // 完成的加载数量
                let meteoResults: Array<MeteoResultInterface> = new Array<MeteoResultInterface>(meteoTypeConfiguration.meteoSourceConfiguration.length * meteoTypeConfiguration.meteoTypeIndex.length);
                if (meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.ICE_CONC_NH ||
                    meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.ICE_TYPE_NH) {
                    for (let sourceIndex = 0; sourceIndex < meteoTypeConfiguration.meteoSourceConfiguration.length; sourceIndex++) {
                        let currentMeteoSourceConfiguration: MeteoSourceConfigurationInterface = meteoTypeConfiguration.meteoSourceConfiguration[sourceIndex];
                        currentMeteoSourceConfiguration.baseComponent.then((lonlatValue: Array<Float32Array>) => {
                            let coordPixel: Uint8Array = new Uint8Array(lonlatValue[0].length * 4);
                            for (let i = 0; i < lonlatValue[0].length; i++) {
                                let lonlatpixel: Uint8Array = this.pack(new Float32Array([lonlatValue[0][i], lonlatValue[1][i]]), currentMeteoSourceConfiguration.baseLonRange as Float32Array, currentMeteoSourceConfiguration.baseLatRange as Float32Array);
                                lonlatpixel.forEach((value, index, array) => {
                                    coordPixel[i * 4 + index] = value;
                                })
                            }
                            let meteoResult_lonlat: MeteoResultInterface = {
                                width: currentMeteoSourceConfiguration.lonTo - currentMeteoSourceConfiguration.lonFrom + 1,
                                height: currentMeteoSourceConfiguration.latTo - currentMeteoSourceConfiguration.latFrom + 1,
                                data: coordPixel,
                                minAndMax: new Float32Array(),
                                lon: currentMeteoSourceConfiguration.baseLonRange as Float32Array,
                                lat: currentMeteoSourceConfiguration.baseLatRange as Float32Array,
                            };
                            this.a_index[sourceIndex] = this.computeIndex(meteoResult_lonlat.height, meteoResult_lonlat.width, lonlatValue[0]);
                            this.a_index_buffer[sourceIndex] = this.wgl.createBuffer(new Float32Array(this.a_index[sourceIndex]));
                            this.base_component_lon_lat[sourceIndex] = meteoResult_lonlat;

                            for (let typeIndex = 0; typeIndex < meteoTypeConfiguration.meteoTypeIndex.length; typeIndex++) {
                                // fixme；arrayBuffer是从服务器/java传来的大端字节序二进制数据流，要转换成小字节序二进制数据流
                                let originalData: Float32Array = this.meteoArrayBuffer.getFloatArray(meteoData[sourceIndex * meteoTypeConfiguration.meteoTypeIndex.length + typeIndex]);
                                meteoResults[sourceIndex * meteoTypeConfiguration.meteoTypeIndex.length + typeIndex] = this.meteoArrayBuffer.resolveData(originalData, currentMeteoSourceConfiguration, meteoSourcePrecision);
                                ++hasFinishedNum;
                                // fixme；判断数据是否全配置完成
                                if (hasFinishedNum == meteoTypeConfiguration.meteoSourceConfiguration.length * meteoTypeConfiguration.meteoTypeIndex.length) {
                                    resolve(meteoResults);
                                }
                            }
                        })
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
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    loadMeteo(meteoResults: Array<MeteoResultInterface>, meteoTypeConfiguration: MeteoTypeConfigurationInterface) {
        if (meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.ICE_CONC_NH ||
            meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex == MeteoSourceIndex.ICE_TYPE_NH) {
            this.program.use();
            this.meteo = new Array<MeteoResultInterface>();
            for (let i = 0; i < meteoResults.length; i++) {
                // 形成数据纹理
                this.dataTexture[i] = this.wgl.createTexture(i == 0 ? TEXTURE_INDEX_DATA_NORTH : TEXTURE_INDEX_DATA_SOUTH, meteoResults[i].width, meteoResults[i].height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, this.meteoArrayBuffer.mergeGridPixelData([meteoResults[i]]));
                // 经纬度纹理
                this.coordTexture[i] = this.wgl.createTexture(i == 0 ? TEXTURE_INDEX_COORD_NORTH : TEXTURE_INDEX_COORD_SOUTH, this.base_component_lon_lat[i].width, this.base_component_lon_lat[i].height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.NEAREST, this.base_component_lon_lat[i].data);
            }
            if (meteoTypeConfiguration.computeAsVector[1])
                this.wgl.gl.uniform1f(this.program.uniform["u_type"], 2.0);
            else
                this.wgl.gl.uniform1f(this.program.uniform["u_type"], 1.0);
            this.meteo = meteoResults;
        }
        // this._render();
    }

    render(gl: any, matrix: any) {
        // fixme:0号纹理不能用，mapbox自己用好像
        // fixme:viewport也不用设置了
        // fixme:每个地方都得用gl.useProgram(this.program);，要不然找不到program
        if (this.meteo.length < 1) return;
        if (!this.visiable) return;
        this.program.use();
        this.wgl.gl.uniformMatrix4fv(this.program.uniform["u_matrix"], false, this._matrix());
        for (let i = 0; i < this.meteo.length; i++) {
            this.wgl.gl.activeTexture(this.gl.TEXTURE0 + (i == 0 ? TEXTURE_INDEX_COORD_NORTH : TEXTURE_INDEX_COORD_SOUTH));
            this.wgl.gl.bindTexture(this.gl.TEXTURE_2D, this.coordTexture[i]);
            this.wgl.gl.uniform1i(this.program.uniform["u_lonlat"], (i == 0 ? TEXTURE_INDEX_COORD_NORTH : TEXTURE_INDEX_COORD_SOUTH));

            this.wgl.gl.activeTexture(this.gl.TEXTURE0 + (i == 0 ? TEXTURE_INDEX_DATA_NORTH : TEXTURE_INDEX_DATA_SOUTH));
            this.wgl.gl.bindTexture(this.gl.TEXTURE_2D, this.dataTexture[i]);
            this.wgl.gl.uniform1i(this.program.uniform["u_data"], (i == 0 ? TEXTURE_INDEX_DATA_NORTH : TEXTURE_INDEX_DATA_SOUTH));

            this.wgl.gl.uniform2fv(this.program.uniform["u_lonlat_radix"], new Float32Array([this.base_component_lon_lat[i].width, this.base_component_lon_lat[i].height]));
            this.wgl.gl.uniform3fv(this.program.uniform["u_lon"], this.base_component_lon_lat[i].lon);
            this.wgl.gl.uniform3fv(this.program.uniform["u_lat"], this.base_component_lon_lat[i].lat);

            this.wgl.gl.uniform2fv(this.program.uniform["u_min"], [this.meteo[i].minAndMax[0], 0]);
            this.wgl.gl.uniform2fv(this.program.uniform["u_max"], [this.meteo[i].minAndMax[1], 0]);


            this.wgl.bindAttribute(this.program.attribute["a_index"], this.a_index_buffer[i], 1);
            this.wgl.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.a_index[i].length);
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
        this.visiable = true;
        this.map.setLayoutProperty(this._id, 'visibility', 'visible');
        // this._render();
    }

    hide() {
        this.visiable = false;
        this.wgl.gl.clearColor(0, 0, 0, 0);
        this.wgl.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.map.setLayoutProperty(this._id, 'visibility', 'none');
    }

    setZIndex(z: string) {
        if (z == "-1") {    // 被地图覆盖
            this.map.moveLayer(this._id, BoxMap.BASELAYER);
        } else {       // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
            this.map.moveLayer(BoxMap.BASELAYER, this._id);
        }
    }

    setOpacity(opacity: number) {
        this.gl.uniform1f(this.program.uniform["u_opacity"], opacity);
    }

    removeContext() {
        const extension = this.gl.getExtension('WEBGL_lose_context');
        if (extension) {
            extension.loseContext();
        }
    }
}
