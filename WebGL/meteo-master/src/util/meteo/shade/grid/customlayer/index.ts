import {MeteoImage} from "../../../image";
import {mat4} from "gl-matrix";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "../../../gl";
import vert from "./glsl/vert.glsl";
import frag from "./glsl/frag.glsl";
import mapboxgl from "mapbox-gl";
import IWebGL from "@/util/meteo";

const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 7;
const TEXTURE_INDEX_DATA = 6;

export class CustomLayerShade implements IWebGL {
    private map: any;
    private gl!: WebGLRenderingContext;
    private visiable!: boolean;
    private program!: GLProgram;
    private meteo: any;
    private _id: string;
    private type: string;
    private renderingMode: string;
    private dataTexture: any;
    private meteoImage: MeteoImage;
    private wgl!: WebGL;

    set id(value: string) {
        this._id = value;
    }

    get id(): string {
        return this._id;
    }
// fixme:从Mapbox 0.50.0开始支持的自定义层
    constructor(map: mapboxgl.Map, layerName: string) {
        this.map = map;
        this.meteoImage = new MeteoImage();
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

        //初始化静态信息
        const posBuffer = this.wgl.createBuffer(new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.wgl.bindAttribute(this.program.attribute["a_position"], posBuffer, 2);
        this.program.use();
        this.wgl.gl.uniform1f(this.program.uniform["u_opacity"], 0.8);
    }

    setColor(color: Array<any>) {
        this.program.use();
        const color2D = this.wgl.createColorRamp(color);
        this.wgl.createTexture(TEXTURE_INDEX_COLOR, color2D.length / 4, 1, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, color2D);
        this.wgl.gl.uniform1i(this.program.uniform["u_color"], TEXTURE_INDEX_COLOR);
        this.wgl.gl.uniform2fv(this.program.uniform["u_cmm"], new Float32Array([color[0][0], color[color.length - 1][0]]));
    }

    load(url: string) {
        return new Promise(resolve => {
            this.meteoImage.load(url).then((meteo: any) => {
                resolve(meteo);
            });
        });
    }

    loadMeteo(meteo: any, shadeParams: any, precision: any) {
        this.program.use();
        this.meteo = null;
        // 形成数据纹理
        this.dataTexture = this.wgl.createTexture(TEXTURE_INDEX_DATA, meteo.width, meteo.height, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl.LINEAR, meteo.data);
        this.wgl.gl.uniform1i(this.program.uniform["u_data"], TEXTURE_INDEX_DATA);
        this.wgl.gl.uniform3fv(this.program.uniform["u_lon"], meteo.lon);
        this.wgl.gl.uniform3fv(this.program.uniform["u_lat"], meteo.lat);
        this.wgl.gl.uniform2fv(this.program.uniform["u_min"], [meteo.minAndMax[0][0], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][0] : 0]);
        this.wgl.gl.uniform2fv(this.program.uniform["u_max"], [meteo.minAndMax[0][1], shadeParams.computeAsVector[1] ? meteo.minAndMax[1][1] : 0]);
        if (shadeParams.computeAsVector[1])
            this.wgl.gl.uniform1f(this.program.uniform["u_type"], 2.0);
        else
            this.wgl.gl.uniform1f(this.program.uniform["u_type"], 1.0);
        this.meteo = meteo;
        // this._render();
    }

    render(gl: any, matrix: any) {
        // fixme:0号纹理不能用，mapbox自己用好像
        // fixme:viewport也不用设置了
        // fixme:每个地方都得用gl.useProgram(this.program);，要不然找不到program
        if (!this.meteo) return;
        if (!this.visiable) return;
        this.program.use();
        this.wgl.gl.uniformMatrix4fv(this.program.uniform["u_matrix_invert"], false, this._matrixInvert());
        this.wgl.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_INDEX_DATA);
        this.wgl.gl.bindTexture(this.gl.TEXTURE_2D, this.dataTexture);
        this.wgl.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
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