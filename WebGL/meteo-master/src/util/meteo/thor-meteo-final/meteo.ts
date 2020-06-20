// fixme:selectPeriod()中http路径改了，配合prohttp
// fixme:加载太慢，且noaa的在app都显示不出来，全改成最大精度的，100和40的
// fixme:给this.STYLE里的流线相关的每个对象加了个参数params，好用来把风和流的流线流动速度等参数区分开
// fixme:所有的色卡颜色都改了，耦合浪1.5m以下是透明色
// todo:在流之间切换时，先清空再重刷，再show()方法中，要重构
// fixme:根据DISPLAY_TYPE属性查找，在需要的每个位置加了风杆bar相应的属性
// fixme：清除context上下文，removeContext()
// todo:临时加了个shade1，用于显示热力图自定义层，以后要整理
// todo:加了个覆不覆盖图层的，搜索moveLayer
import {exp, fileStreamHttp} from "../../http";
import {CustomLayerShade} from "@/util/meteo/thor-meteo-final/shade/grid/customlayer";
import {Mgl, MglParams} from "@/util/meteo/thor-meteo-final/mgl/grid/3d";
import {TileBar} from "@/util/meteo/thor-meteo-final/bar/grid/tile";
import {Isoline} from "@/util/meteo/thor-meteo-final/isoline/grid/3d";
import {NonGridCustomLayerShade} from "@/util/meteo/thor-meteo-final/shade/non-grid/customlayer";
import {NonGridTileIceDrift} from "@/util/meteo/thor-meteo-final/bar/non-grid/tile";
import {MeteoArrayBuffer} from "./image";
import {mat4} from "gl-matrix";
import mapboxgl from "mapbox-gl";
import {WebGL, GLFbo, GLTwinsFbo, GLProgram, BufferObject} from "./gl";
import IWebGL, {MeteoResultInterface, ProductParamMapInterface} from "@/util/meteo/thor-meteo-final/index";
import {IMeteo} from "@/util/meteo/thor-meteo-final/index";

// region fixme:MeteoSource
// 来源类型索引
export enum MeteoSourceIndex {
    GFS = 0,
    MARITIME = 10,
    HYCOM = 20,
    SHH_WW = 50,
    EC_C1D = 60,
    EC_C2P = 61,
    // 卫星-海冰聚合-北半球
    ICE_CONC_NH = 70,
// 卫星-海冰聚合-南半球
    ICE_CONC_SH = 71,
// 卫星-海冰类型-北半球
    ICE_TYPE_NH = 72,
// 卫星-海冰类型-南半球
    ICE_TYPE_SH = 73,
// 卫星-海冰移向-北半球
    ICE_DRIFT_NH = 74,
// 卫星-海冰移向-南半球
    ICE_DRIFT_SH = 75,
// cimmis-雷达类
    CIMMIS_CRADAR = 80,
    // 卫星-风场
    SAT_WIND = 90,

    TEST = 99
}

// region 来源类型精度 MeteoSourcePrecision

// gfs
export enum GfsPrecision {
    L1 = 0.5,
    L2 = 1.0,
    L3 = 1.0,
}

// maritime
export enum MaritimePrecision {
    L1 = 0.25,
    L2 = 0.5,
    L3 = 1.0,
}

// hycom
export enum HycomPrecision {
    L1 = 0.08,
    L2 = 0.4,
    L3 = 0.4,
}

// ww
export enum WwPrecision {
    L1 = 0.5,
    L2 = 0.5,
    L3 = 0.5,
}

// ec_c1d
export enum EcC1dPrecision {
    L1 = 0.125,
    L2 = 0.125,
    L3 = 0.125,
}

// ec_c2p
export enum EcC2pPrecision {
    L1 = 0.25,
    L2 = 0.25,
    L3 = 0.25,
}

// ICE_CONC_NH
export enum IceConcNhPrecision {
    L1 = 1.0,
    L2 = 1.0,
    L3 = 1.0,
}

// ICE_CONC_SH
export enum IceConcShPrecision {
    L1 = 1.0,
    L2 = 1.0,
    L3 = 1.0,
}

// ICE_TYPE_NH
export enum IceTypeNhPrecision {
    L1 = 1.0,
    L2 = 1.0,
    L3 = 1.0,
}

// ICE_TYPE_SH
export enum IceTypeShPrecision {
    L1 = 1.0,
    L2 = 1.0,
    L3 = 1.0,
}

// ICE_DRIFT_NH
export enum IceDriftNhPrecision {
    L1 = 1.0,
    L2 = 1.0,
    L3 = 1.0,
}

// ICE_DRIFT_SH
export enum IceDriftShPrecision {
    L1 = 1.0,
    L2 = 1.0,
    L3 = 1.0,
}

// CIMMIS_CRADAR
export enum CimmisCradarPrecision {
    L1 = 1.0,
    L2 = 1.0,
    L3 = 1.0,
}

// SAT_WIND
export enum SatWindPrecision {
    L1 = 0.25,
    L2 = 0.25,
    L3 = 0.25,
}

// test
export enum TestPrecision {
    L1 = 0.5,
    L2 = 0.5,
    L3 = 0.5,
}

export type MeteoSourcePrecision =
    typeof GfsPrecision
    | typeof MaritimePrecision
    | typeof HycomPrecision
    | typeof WwPrecision
    | typeof EcC1dPrecision
    | typeof EcC2pPrecision
    | typeof IceConcNhPrecision
    | typeof IceConcShPrecision
    | typeof IceTypeNhPrecision
    | typeof IceTypeShPrecision
    | typeof IceDriftNhPrecision
    | typeof IceDriftShPrecision
    | typeof CimmisCradarPrecision
    | typeof SatWindPrecision
    | typeof TestPrecision;
// endregion

// region MeteoSourceConfiguration
// 来源类型配置接口
export interface MeteoSourceConfigurationInterface {
    meteoSourceIndex: MeteoSourceIndex;
    meteoSourcePrecision: MeteoSourcePrecision;
    lonFrom: number;
    lonTo: number;
    latFrom: number;
    latTo: number;
    // 同种气象来源通用的文件
    baseComponent: Promise<Array<Float32Array>>;
    baseLonRange?: Float32Array;
    baseLatRange?: Float32Array;
}

// 来源类型配置
export class MeteoSourceConfiguration {
    // 气象文件路径前缀
    static readonly URL_PREFIX: string = "tile/";
    // 气象产品文件路径前缀
    static readonly URL_TAG_PREFIX: string = "process/";
    // 气象数值对应的rgb通道像素点的有效最大像素值
    static readonly MAX_VALID_PIXEL_DATA: number = 254;
    // 气象数值对应的rgb通道像素点的无效像素值
    static readonly INVALID_PIXEL_DATA: number = 255;
    // 如果rgb通道的气象数值有效的话，alpha通道的像素值
    static readonly VALID_PIXEL_ALPHA: number = 255;
    // 如果rgb通道的气象数值无效的话，alpha通道的像素值
    static readonly INVALID_PIXEL_ALPHA: number = 0;
    // 如果rgb通道的气象数值无效的话，rgb通道的像素值
    static readonly INVALID_PIXEL_RGB: number = 0;

    static getFloatArray(arrayBuffer: ArrayBuffer): Float32Array {
        const re = new Float32Array(arrayBuffer);
        const dv = new DataView(arrayBuffer);       // 通过它可防止big endian和little endian的问题
        for (let m = 0; m < re.length; m++) {
            re[m] = dv.getFloat32(m * 4);
        }
        return re;
    }

    static loadBaseComponent(url: string): Promise<Float32Array> {
        return new Promise((resolve, reject) => {
            // todo:测试先写死不加载
            resolve();
            /*fileStreamHttp.get(url, null).then((data: ArrayBuffer) => {
                // fixme；arrayBuffer是从服务器/java传来的大端字节序二进制数据流，要转换成小字节序二进制数据流
                let originalData = this.getFloatArray(data);
                resolve(originalData);
            }).catch(reason => {
                reject(reason);
            });*/
        });
    }

    static readonly GFS: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.GFS,
        meteoSourcePrecision: GfsPrecision,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -90,
        latTo: 90,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly MARITIME: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.MARITIME,
        meteoSourcePrecision: MaritimePrecision,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -85.25,
        latTo: 89.25,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly HYCOM: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.HYCOM,
        meteoSourcePrecision: HycomPrecision,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -80.0,
        latTo: 80.0,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly SHH_WW: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.SHH_WW,
        meteoSourcePrecision: WwPrecision,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -77.5,
        latTo: 90.0,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly EC_C1D: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.EC_C1D,
        meteoSourcePrecision: EcC1dPrecision,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -90,
        latTo: 90,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly EC_C2P: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.EC_C2P,
        meteoSourcePrecision: EcC2pPrecision,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -90,
        latTo: 90,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly ICE_CONC_NH: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.ICE_CONC_NH,
        meteoSourcePrecision: IceConcNhPrecision,
        lonFrom: 0,
        lonTo: 759,
        latFrom: 0,
        latTo: 1119,
        baseComponent: Promise.all([
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_conc_nh_lon"),
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_conc_nh_lat"),
        ]).then((value: Array<Float32Array>) => {
            return value;
        }),
        baseLonRange: new Float32Array([-180.0, 179.92558, 0]),
        baseLatRange: new Float32Array([31.029392, 89.93472, 0]),
    };
    static readonly ICE_CONC_SH: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.ICE_CONC_SH,
        meteoSourcePrecision: IceConcShPrecision,
        lonFrom: 0,
        lonTo: 789,
        latFrom: 0,
        latTo: 829,
        baseComponent: Promise.all([
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_conc_sh_lon"),
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_conc_sh_lat"),
        ]).then((value: Array<Float32Array>) => {
            return value;
        }),
        baseLonRange: new Float32Array([-179.92738, 179.92738, 0]),
        baseLatRange: new Float32Array([-89.93472, -39.284462, 0]),
    };
    static readonly ICE_TYPE_NH: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.ICE_TYPE_NH,
        meteoSourcePrecision: IceTypeNhPrecision,
        lonFrom: 0,
        lonTo: 759,
        latFrom: 0,
        latTo: 1119,
        baseComponent: Promise.all([
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_type_nh_lon"),
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_type_nh_lat"),
        ]).then((value: Array<Float32Array>) => {
            return value;
        }),
        baseLonRange: new Float32Array([-180.0, 179.92558, 0]),
        baseLatRange: new Float32Array([31.029392, 89.93472, 0]),
    };
    static readonly ICE_TYPE_SH: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.ICE_TYPE_SH,
        meteoSourcePrecision: IceTypeShPrecision,
        lonFrom: 0,
        lonTo: 789,
        latFrom: 0,
        latTo: 829,
        baseComponent: Promise.all([
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_type_sh_lon"),
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_type_sh_lat"),
        ]).then((value: Array<Float32Array>) => {
            return value;
        }),
        baseLonRange: new Float32Array([-179.92738, 179.92738, 0]),
        baseLatRange: new Float32Array([-89.93472, -39.284462, 0]),
    };
    static readonly ICE_DRIFT_NH: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.ICE_DRIFT_NH,
        meteoSourcePrecision: IceDriftNhPrecision,
        lonFrom: 0,
        lonTo: 118,
        latFrom: 0,
        latTo: 176,
        baseComponent: Promise.all([
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_drift_nh_lon"),
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_drift_nh_lat"),
        ]).then((value: Array<Float32Array>) => {
            return value;
        }),
        baseLonRange: new Float32Array([-180.0, 179.52649, 0]),
        baseLatRange: new Float32Array([31.961086, 90.0, 0]),
    };
    static readonly ICE_DRIFT_SH: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.ICE_DRIFT_SH,
        meteoSourcePrecision: IceDriftShPrecision,
        lonFrom: 0,
        lonTo: 124,
        latFrom: 0,
        latTo: 130,
        baseComponent: Promise.all([
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_drift_sh_lon"),
            MeteoSourceConfiguration.loadBaseComponent(MeteoSourceConfiguration.URL_PREFIX + "ice_drift_sh_lat"),
        ]).then((value: Array<Float32Array>) => {
            return value;
        }),
        baseLonRange: new Float32Array([-179.07596, 180.0, 0]),
        baseLatRange: new Float32Array([-90.0, -40.1782, 0]),
    };
    static readonly CIMMIS_CRADAR: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.CIMMIS_CRADAR,
        meteoSourcePrecision: CimmisCradarPrecision,
        lonFrom: 0,
        lonTo: 0,
        latFrom: 0,
        latTo: 0,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly SAT_WIND: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.SAT_WIND,
        meteoSourcePrecision: SatWindPrecision,
        lonFrom: 0.125,
        lonTo: 359.875,
        latFrom: -89.875,
        latTo: 89.875,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly TEST: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.TEST,
        meteoSourcePrecision: TestPrecision,
        lonFrom: -1.5,
        lonTo: 1.5,
        latFrom: -1.0,
        latTo: 1.0,
        baseComponent: new Promise<Array<Float32Array>>((resolve, reject) => {
            resolve(new Array<Float32Array>());
        }),
    };
    static readonly meteoSources: Array<MeteoSourceConfigurationInterface> = [
        MeteoSourceConfiguration.GFS,
        MeteoSourceConfiguration.MARITIME,
        MeteoSourceConfiguration.HYCOM,
        MeteoSourceConfiguration.SHH_WW,
        MeteoSourceConfiguration.EC_C1D,
        MeteoSourceConfiguration.EC_C2P,
        MeteoSourceConfiguration.ICE_CONC_NH,
        MeteoSourceConfiguration.ICE_CONC_SH,
        MeteoSourceConfiguration.ICE_TYPE_NH,
        MeteoSourceConfiguration.ICE_TYPE_SH,
        MeteoSourceConfiguration.ICE_DRIFT_NH,
        MeteoSourceConfiguration.ICE_DRIFT_SH,
        MeteoSourceConfiguration.CIMMIS_CRADAR,
        MeteoSourceConfiguration.SAT_WIND,
        MeteoSourceConfiguration.TEST,
    ];

}

// endregion

// endregion

// region fixme:其他配置项
//  色卡
export class MeteoTypeColorConfiguration {
    static readonly PRMSL_PA = [[48000, [0, 0, 255, 1]], [92000, [152, 189, 197, 1]], [96000, [142, 179, 187, 1]], [100000, [71, 168, 167, 1]], [101000, [51, 98, 139, 1]], [102000, [157, 151, 60, 1]], [103000, [97, 61, 81, 1]], [105000, [95, 60, 81, 1]]];
    static readonly PRMSL_HPA = [[480, [0, 0, 255, 1]], [920, [152, 189, 197, 1]], [960, [142, 179, 187, 1]], [1000, [71, 168, 167, 1]], [1010, [51, 98, 139, 1]], [1020, [157, 151, 60, 1]], [1030, [97, 61, 81, 1]], [1050, [95, 60, 81, 1]]];
    static readonly WIND = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
        [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];
    static readonly WAS = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly WW = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly SW1 = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly SW2 = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly SS = [[0, [37, 74, 255, 1]], [.02, [0, 100, 254, 1]], [.06, [0, 200, 254, 1]], [.1, [37, 193, 146, 1]], [.15, [0, 230, 0, 1]],
        [.2, [0, 250, 0, 1]], [.3, [254, 225, 0, 1]], [.4, [254, 174, 0, 1]], [.5, [220, 74, 29, 1]], [.6, [180, 0, 50, 1]], [.7, [254, 0, 150, 1]], [.8, [151, 50, 222, 1]], [.85, [86, 54, 222, 1]], [.9, [42, 132, 222, 1]], [1, [64, 199, 222, 1]], [1.5, [255, 255, 255, 1]], [4, [255, 255, 255, 1]]];
    // static readonly SS = [[0, [10,25,73,1]], [.02, [10,25,93,1]], [.06, [10,25,148,1]], [.1, [10,25,179,1]], [.15, [10,29,247,1]],
    //     [.2, [12,72,217,1]], [.3, [18,166,153,1]], [.4, [23,251,95,1]], [.5, [115,246,96,1]], [.6, [206,237,100,1]], [.7, [255,233,90,1]],
    //     [.8, [255,233,66,1]], [.9, [255,233,40,1]], [1, [255,232,15,1]], [1.1, [255,189,15,1]], [1.2, [255,147,15,1]], [1.3, [255,104,15,1]], [1.4, [255,56,15,1]], [1.5, [255,18,15,1]]];
    static readonly ST = [[5, [0, 0, 255, 1]], [10, [0, 255, 255, 1]], [15, [0, 255, 0, 1]], [20, [255, 255, 0, 1]], [25, [255, 19, 19, 1]], [30, [255, 9, 9, 1]], [35, [158, 0, 0, 1]]];

    static readonly ICE_CONC = [[0, [0, 0, 137, 1]],
        [10, [0, 0, 241, 1]],
        [20, [0, 77, 255, 1]],
        [30, [0, 177, 255, 1]],
        [40, [41, 255, 206, 1]],
        [50, [125, 255, 122, 1]],
        [60, [206, 255, 41, 1]],
        [70, [255, 193, 0, 1]],
        [80, [255, 102, 0, 1]],
        [90, [241, 8, 0, 1]],
        [100, [128, 0, 0, 1]]];

    static readonly ICE_TYPE = [[1, [4, 98, 154, 1]],
        [2, [44, 150, 102, 1]],
        [3, [155, 205, 102, 1]],
        [4, [255, 255, 255, 1]]];

    static readonly GW = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
        [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];
    // 湿度
    static readonly RH = [[0, [255, 34, 34, 1]], [21, [255, 34, 34, 1]], [40.7, [248, 83, 42, 1]], [60.5, [233, 233, 57, 1]], [80.2, [57, 198, 233, 1]], [100, [49, 125, 240, 1]], [100, [11, 41, 159, 1]]];
    // 气温
    static readonly TMP = [[213.3, [11, 41, 159, 1]], [239.1, [49, 125, 240, 1]], [264.9, [57, 198, 233, 1]], [290.8, [233, 233, 57, 1]], [316.6, [248, 83, 42, 1]], [342.4, [255, 34, 34, 1]], [342.4, [255, 34, 34, 1]]];
    // 气温 摄氏度
    static readonly TMP_C = [[-60, [11, 41, 159, 1]], [-34, [49, 125, 240, 1]], [-8, [57, 198, 233, 1]], [18, [233, 233, 57, 1]], [43, [248, 83, 42, 1]], [69, [255, 34, 34, 1]], [69, [255, 34, 34, 1]]];
    // 能见度
    static readonly VIS = [[50, [102, 39, 0, 1]], [500, [163, 68, 0, 0.8]], [2000, [153, 153, 153, 0.6]], [6000, [102, 102, 102, 0.4]], [8000, [77, 77, 77, 0.3]],
        [10000, [26, 26, 26, 0.1]], [14000, [51, 51, 51, 0.2]], [20000, [0, 0, 0, 0]]];
    // 能见度 km
    static readonly VIS_KM = [[0.05, [102, 39, 0, 1]], [0.5, [163, 68, 0, 0.8]], [2, [153, 153, 153, 0.6]], [6, [102, 102, 102, 0.4]], [8, [77, 77, 77, 0.3]], [10, [26, 26, 26, 0.1]], [14, [51, 51, 51, 0.2]], [20, [0, 0, 0, 0]]];
    // 降雨量
    static readonly APCP = [[0, [0, 0, 0, 0]], [5, [102, 255, 153, 1]], [10, [0, 128, 0, 1]], [15, [135, 206, 250, 1]], [20, [0, 0, 205, 1]], [25, [0, 0, 205, 1]], [30, [255, 0, 255, 1]]];
    // 云盖
    static readonly TCDC = [[0, [0, 0, 0, 0]], [10, [0, 0, 0, 0]], [20, [51, 51, 51, 0.2]], [40, [102, 102, 102, 0.4]], [60, [153, 153, 153, 0.6]], [80, [204, 204, 204, 0.8]], [100, [255, 255, 255, 1]]];
    // 云盖 0-1
    static readonly TCDC_01 = [[0, [0, 0, 0, 0]], [0.1, [0, 0, 0, 0]], [0.2, [51, 51, 51, 0.2]], [0.4, [102, 102, 102, 0.4]], [0.6, [153, 153, 153, 0.6]], [0.8, [204, 204, 204, 0.8]], [1, [255, 255, 255, 1]]];
    // 冰盖
    static readonly SEA_ICE = [[0, [0, 0, 0, 0]], [10, [0, 0, 0, 0]], [20, [51, 51, 51, 0.2]], [40, [102, 102, 102, 0.4]], [60, [153, 153, 153, 0.6]], [80, [204, 204, 204, 0.8]], [100, [255, 255, 255, 1]]];
    // 冰盖 0-1
    static readonly SEA_ICE_01 = [[0, [0, 0, 0, 0]], [0.1, [0, 0, 0, 0]], [0.2, [51, 51, 51, 0.2]], [0.4, [102, 102, 102, 0.4]], [0.6, [153, 153, 153, 0.6]], [0.8, [204, 204, 204, 0.8]], [1, [255, 255, 255, 1]]];
}

// 显示类型
export class MeteoTypeDisplayTypeConfiguration {
    // 热力图-等格点-自定义层
    static readonly SHADE_GRID_CUSTOMLAYER: number = 0;
    // 流线-等格点-canvas3d
    static readonly MGL_GRID_3D: number = 1;
    // 等值线-等格点-canvas3d
    static readonly ISOLINE_GRID_3D: number = 2;
    // 风杆-等格点-瓦片
    static readonly BAR_GRID_TILE: number = 3;
    // 热力图-非等格点-自定义层
    static readonly SHADE_NON_GRID_CUSTOMLAYER: number = 4;
    // 移向-非等格点-瓦片
    static readonly DRIFT_NON_GRID_TILE: number = 5;
}

// endregion

// region fixme:MeteoType
// 气象类型索引
export enum MeteoTypeIndex {

    //气压(9e4~11e4)
    PRMSL = 0,
    //风U(-100.0~100.0)
    UGRD = 1,
    //风V(-100.0~100.0)
    VGRD = 2,
    //阵风(0.0~200.0)
    GUST = 3,
    //气温(200.0~400.0)
    TMP = 4,
    //能见度(0.0~24100.0)
    VIS = 5,
    //湿度(0.0~100.0)
    RH = 6,
    //雨量(0.0~102.3)
    APCP = 7,
    //云(0.0~100.0)
    TCDC = 8,
    //冰盖(0.0/1.0)
    ICEC = 9,

    //耦合浪高(0.0~20.47)
    SHCW = 20,
    //耦合浪向(0.0~360.0)
    MDCW = 21,
    //耦合周期(0.0~25.4)
    MPCW = 22,
    //风浪高(0.0~20.47)
    SHWW = 30,
    //风浪方向(0.0~360.0)
    MDWW = 31,
    //风浪周期(0.0~25.4)
    MPWW = 32,
    //涌浪高(0.0~20.47)
    SHSW = 40,
    //涌浪方向(0.0~360.0)
    MDSW = 41,
    //涌浪周期(0.0~25.4)
    MPSW = 42,

    // region 海洋类型
    //水温
    OTMP = 60,
    //流U
    US = 61,
    //流V
    VS = 62,
    // endregion

    // region 卫星-海冰类型
    // 海冰聚合
    ICE_CONC = 70,
    // 海冰聚合未过滤
    ICE_CONC_UNFILTERED = 71,
    // 海冰类型
    ICE_TYPE = 72,
    // 海冰移向-longitude at end of displacement-位移末端的经度
    ICE_DRIFT_LON1 = 73,
    // 海冰移向-latitude at end of displacement-位移末端的纬度
    ICE_DRIFT_LAT1 = 74,
    // endregion

    // region 雷达
    // 基本反射率因子--仰角
    ELEVATION_R_0_5 = 80,
    // 基本反射率因子--方位角
    AZIMUTH_R_0_5 = 81,
    // 基本反射率因子--雷达扫描的半径
    DISTANCE_R_0_5 = 82,
    // 基本反射率因子
    REFLECTIVITY_0_5 = 83,
    // 平均径向速度
    RADIALVELOCITY_0_5 = 84,
    // 平均径向速度--仰角
    ELEVATION_V_0_5 = 85,
    // 平均径向速度--方位角
    AZIMUTH_V_0_5 = 86,
    // 平均径向速度--雷达扫描的半径
    DISTANCE_V_0_5 = 87,
    // 速度谱宽
    SPECTRUM_WIDTH_0_5 = 88,
    // 垂直液态水含量
    VIL_0_5 = 89,
    // 基本反射率因子--仰角
    ELEVATION_R_1_5 = 90,
    // 基本反射率因子--方位角
    AZIMUTH_R_1_5 = 91,
    // 基本反射率因子--雷达扫描的半径
    DISTANCE_R_1_5 = 92,
    // 基本反射率因子
    REFLECTIVITY_1_5 = 93,
    // 平均径向速度
    RADIALVELOCITY_1_5 = 94,
    // 平均径向速度--仰角
    ELEVATION_V_1_5 = 95,
    // 平均径向速度--方位角
    AZIMUTH_V_1_5 = 96,
    // 平均径向速度--雷达扫描的半径
    DISTANCE_V_1_5 = 97,
    // 速度谱宽
    SPECTRUM_WIDTH_1_5 = 98,
    // 垂直液态水含量
    VIL_1_5 = 99,
    // endregion
}

// 气象类型配置接口
export interface MeteoTypeConfigurationInterface {
    // 气象类型对应的来源
    meteoSourceConfiguration: Array<MeteoSourceConfigurationInterface>;
    // 气象类型索引
    meteoTypeIndex: Array<MeteoTypeIndex>;
    // 三个通道的值是否都需要在用GLSL计算时考虑，比如风uv，两个通道都要考虑；风浪是高度方向周期，只需要考虑高度
    computeAsVector: Array<boolean>;
    // 要显示当前气象类型还需要加载相对应的其他文件
    baseComponentUrl: Array<string>;
    // 是否在地图下面==>主要针对canvas3d的图层，如流线、等值线
    underMap: boolean;
    // 画流线需要的参数
    mglParams: MglParams;
    // 画等值线需要的参数
    isolineParams: {
        // 等值线间距
        delta: Function,
        // 值的格式处理
        dataFormat: Function,
    },
    // 色卡颜色
    color: Array<any>,
    // 显示类型
    displayType: Array<number>,
    // 色卡渐变类型
    gradientColorType: string,
}

// 气象类型配置
export class MeteoTypeConfiguration {
    // 气象类型:气压
    static readonly GFS_PRMSL: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.PRMSL],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                if (zoom > 3 || zoom == null) {
                    return 2;
                } else {
                    return 4;
                }
            },
            dataFormat: function (data: any) {
                return Math.round(data / 1);
            },
        },
        color: MeteoTypeColorConfiguration.PRMSL_HPA,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER, MeteoTypeDisplayTypeConfiguration.ISOLINE_GRID_3D],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:风U+风V
    static readonly GFS_UVGRD: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.UGRD, MeteoTypeIndex.VGRD],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WIND,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER, MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D, MeteoTypeDisplayTypeConfiguration.BAR_GRID_TILE],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:阵风
    static readonly GFS_GUST: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.GUST],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WIND,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:气温
    static readonly GFS_TMP: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.TMP],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.TMP_C,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:能见度
    static readonly GFS_VIS: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.VIS],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.VIS_KM,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:湿度
    static readonly GFS_RH: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.RH],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.RH,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:冰盖
    static readonly GFS_ICEC: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.ICEC],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.SEA_ICE,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:降雨量
    static readonly GFS_APCP: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.APCP],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.APCP,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:云盖
    static readonly GFS_TCDC: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.GFS],
        meteoTypeIndex: [MeteoTypeIndex.TCDC],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.TCDC,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 流U+流V
    static readonly HYCOM_UVS: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.HYCOM],
        meteoTypeIndex: [MeteoTypeIndex.US, MeteoTypeIndex.VS],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.995,
            speedFactor: 100.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.SS,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER, MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 水温
    static readonly HYCOM_OTMP: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.HYCOM],
        meteoTypeIndex: [MeteoTypeIndex.OTMP],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.995,
            speedFactor: 100.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.ST,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:风U+风V
    static readonly SHH_WW_UVGRD: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.SHH_WW],
        meteoTypeIndex: [MeteoTypeIndex.UGRD, MeteoTypeIndex.VGRD],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WIND,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER, MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D, MeteoTypeDisplayTypeConfiguration.BAR_GRID_TILE],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:耦合浪高
    static readonly SHH_WW_WAS: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.SHH_WW],
        meteoTypeIndex: [MeteoTypeIndex.SHCW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WAS,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:风浪高
    static readonly SHH_WW_WW: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.SHH_WW],
        meteoTypeIndex: [MeteoTypeIndex.SHWW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WW,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:涌浪高
    static readonly SHH_WW_SW1: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.SHH_WW],
        meteoTypeIndex: [MeteoTypeIndex.SHSW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.SW1,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:MARITIME 耦合浪高
    static readonly MARITIME_WAS: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.MARITIME],
        meteoTypeIndex: [MeteoTypeIndex.SHCW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WAS,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:MARITIME 风浪高
    static readonly MARITIME_WW: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.MARITIME],
        meteoTypeIndex: [MeteoTypeIndex.SHWW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WW,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:涌浪高
    static readonly MARITIME_SW1: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.MARITIME],
        meteoTypeIndex: [MeteoTypeIndex.SHSW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.SW1,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:风U+风V
    static readonly EC_C1D_UVGRD: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C1D],
        meteoTypeIndex: [MeteoTypeIndex.UGRD, MeteoTypeIndex.VGRD],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WIND,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER, MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D, MeteoTypeDisplayTypeConfiguration.BAR_GRID_TILE],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:气压
    static readonly EC_C1D_PRMSL: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C1D],
        meteoTypeIndex: [MeteoTypeIndex.PRMSL],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                if (zoom > 3 || zoom == null) {
                    return 2;
                } else {
                    return 6;
                }
            },
            dataFormat: function (data: any) {
                return Math.round(data / 1);
            },
        },
        color: MeteoTypeColorConfiguration.PRMSL_HPA,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER, MeteoTypeDisplayTypeConfiguration.ISOLINE_GRID_3D],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:气温
    static readonly EC_C1D_TMP: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C1D],
        meteoTypeIndex: [MeteoTypeIndex.TMP],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                if (zoom > 3 || zoom == null) {
                    return 2;
                } else {
                    return 6;
                }
            },
            dataFormat: function (data: any) {
                return Math.round(data / 1);
            },
        },
        color: MeteoTypeColorConfiguration.TMP_C,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:能见度
    static readonly EC_C1D_VIS: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C1D],
        meteoTypeIndex: [MeteoTypeIndex.VIS],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                if (zoom > 3 || zoom == null) {
                    return 2;
                } else {
                    return 6;
                }
            },
            dataFormat: function (data: any) {
                return Math.round(data / 1);
            },
        },
        color: MeteoTypeColorConfiguration.VIS_KM,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:降雨量
    static readonly EC_C1D_APCP: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C1D],
        meteoTypeIndex: [MeteoTypeIndex.APCP],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                if (zoom > 3 || zoom == null) {
                    return 2;
                } else {
                    return 6;
                }
            },
            dataFormat: function (data: any) {
                return Math.round(data / 1);
            },
        },
        color: MeteoTypeColorConfiguration.APCP,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:云盖
    static readonly EC_C1D_TCDC: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C1D],
        meteoTypeIndex: [MeteoTypeIndex.TCDC],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                if (zoom > 3 || zoom == null) {
                    return 2;
                } else {
                    return 6;
                }
            },
            dataFormat: function (data: any) {
                return Math.round(data / 1);
            },
        },
        color: MeteoTypeColorConfiguration.TCDC,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:耦合浪高+耦合浪向+耦合周期
    static readonly EC_C2P_WAS: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C2P],
        meteoTypeIndex: [MeteoTypeIndex.SHCW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WAS,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:风浪高+风浪向+风浪周期
    static readonly EC_C2P_WW: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.EC_C2P],
        meteoTypeIndex: [MeteoTypeIndex.SHWW],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: true,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WW,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:海冰聚合
    static readonly ICE_CONC: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.ICE_CONC_NH, MeteoSourceConfiguration.ICE_CONC_SH],
        meteoTypeIndex: [MeteoTypeIndex.ICE_CONC],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.ICE_CONC,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_NON_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:海冰类型
    static readonly ICE_TYPE: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.ICE_TYPE_NH, MeteoSourceConfiguration.ICE_TYPE_SH],
        meteoTypeIndex: [MeteoTypeIndex.ICE_TYPE],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.ICE_TYPE,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_NON_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[1],
    };
    // 气象类型:海冰移向
    static readonly ICE_DRIFT: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.ICE_DRIFT_NH, MeteoSourceConfiguration.ICE_DRIFT_SH],
        meteoTypeIndex: [MeteoTypeIndex.ICE_DRIFT_LON1, MeteoTypeIndex.ICE_DRIFT_LAT1],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: new Array<any>(),
        displayType: [MeteoTypeDisplayTypeConfiguration.DRIFT_NON_GRID_TILE],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:反射率--0.5仰角
    static readonly CIMMIS_CRADAR_REFLECTIVITY_0_5: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.CIMMIS_CRADAR],
        meteoTypeIndex: [MeteoTypeIndex.REFLECTIVITY_0_5],
        baseComponentUrl: ["_lon", "_lat"],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: new Array<any>(),
        displayType: new Array<number>(),
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:反射率--1.5仰角
    static readonly CIMMIS_CRADAR_REFLECTIVITY_1_5: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.CIMMIS_CRADAR],
        meteoTypeIndex: [MeteoTypeIndex.REFLECTIVITY_1_5],
        baseComponentUrl: ["_lon", "_lat"],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0,
            speedFactor: 0,
            dropRate: 0,
            dropRateBump: 0,
            particlesRadix: 0,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: new Array<any>(),
        displayType: new Array<number>(),
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:卫星-风场-阵风
    static readonly SAT_GUST: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.SAT_WIND],
        meteoTypeIndex: [MeteoTypeIndex.GUST],
        baseComponentUrl: [],
        computeAsVector: [true, false, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WIND,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER],
        gradientColorType: WebGL.colorTypes[0],
    };
    // 气象类型:卫星-风场-风uv
    static readonly SAT_UVGRD: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.SAT_WIND],
        meteoTypeIndex: [MeteoTypeIndex.UGRD, MeteoTypeIndex.VGRD],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: false,
        mglParams: {
            fadeOpacity: 0.996,
            speedFactor: 6.0,
            dropRate: 0.003,
            dropRateBump: 0.01,
            particlesRadix: 64,
        },
        isolineParams: {
            delta: function (zoom: any) {
                return zoom;
            },
            dataFormat: function (data: any) {
                return data;
            },
        },
        color: MeteoTypeColorConfiguration.WIND,
        displayType: [MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER, MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D, MeteoTypeDisplayTypeConfiguration.BAR_GRID_TILE],
        gradientColorType: WebGL.colorTypes[0],
    };
}

// endregion

export interface ProductParamsInterface {   // 产品相关参数
    scheduleTime: number,    // 批次时间
    currentTag: string,          // 产品数据tag值
    period?: number,          // 预报时间
}

export interface MeteoData {
    displayType: number,            // 显示类型
    show: boolean,                           // 是否显示
    webGLObject: IWebGL,     // 操作的WebGL对象
    // 下面的对象都会随着点击事件更改
    meteoType: MeteoTypeConfigurationInterface,     // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
    currentPrecision: number,            // 当前精度
    showMimeData: boolean,       // 显示的是否是产品数据
    imageData: Array<MeteoResultInterface>,       // 加载二进制流文件得到的数据
    currentPeriod: number,                   // 当前图片周期
    productParams: ProductParamsInterface,   // 产品相关参数

}

export interface MeteoDataInterface {
    // 热力图-等格点-自定义层
    shade_grid_customlayer: MeteoData;
    // 流线-等格点-canvas3d
    mgl_grid_3d: MeteoData;
    // 等值线-等格点-canvas3d
    isoline_grid_3d: MeteoData;
    // 风杆-等格点-瓦片
    bar_grid_tile: MeteoData;
    // 热力图-非等格点-自定义层
    shade_non_grid_customlayer: MeteoData;
    // 移向-非等格点-瓦片
    drift_non_grid_tile: MeteoData;

    // Add index signature
    [key: string]: any;
}

export default class Meteo implements IMeteo {
    static readonly OPACITY_DEFAULT = 0.8;
    static readonly TAG_INVALID: string = "tag_invalid";
    static readonly SCHEDULETIME_INVALID: number = 0;
    public static readonly SHADE_GRID_CUSTOMLAYER_ID: string = "shade_grid_customlayer";
    public static readonly SHADE_NON_GRID_CUSTOMLAYER_ID: string = "shade_non_grid_customlayer";

    private _map: mapboxgl.Map;
    private _meteoData: MeteoDataInterface;

    constructor(map: mapboxgl.Map, isolineTextId: string) {
        this._map = map;
        this._meteoData = {                       // meteo气象显示类型：热力图、等值线、流线、瓦片
            shade_grid_customlayer: {
                displayType: MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER,
                show: false,                           // 是否显示
                meteoType: {} as MeteoTypeConfigurationInterface,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new CustomLayerShade(this._map, Meteo.SHADE_GRID_CUSTOMLAYER_ID),     // 操作的WebGL对象
                // webGLObject: null,     // 操作的WebGL对象
                imageData: new Array<MeteoResultInterface>(),                       // 加载图片得到的数据
                currentPeriod: 0,                   // 当前图片周期
                currentPrecision: 0,
                showMimeData: false,
                productParams: {
                    scheduleTime: Meteo.SCHEDULETIME_INVALID,
                    currentTag: Meteo.TAG_INVALID,
                },
            },
            mgl_grid_3d: {
                displayType: MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D,
                show: false,                           // 是否显示
                meteoType: {} as MeteoTypeConfigurationInterface,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new Mgl(this._map),       // 操作的WebGL对象
                // webGLObject: null,       // 操作的WebGL对象
                imageData: new Array<MeteoResultInterface>(),                       // 加载图片得到的数据
                currentPeriod: 0,                   // 当前图片周期
                currentPrecision: 0,
                showMimeData: false,
                productParams: {
                    scheduleTime: Meteo.SCHEDULETIME_INVALID,
                    currentTag: Meteo.TAG_INVALID,
                },
            },
            isoline_grid_3d: {
                displayType: MeteoTypeDisplayTypeConfiguration.ISOLINE_GRID_3D,
                show: false,                           // 是否显示
                meteoType: {} as MeteoTypeConfigurationInterface,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new Isoline(this._map, isolineTextId),   // 操作的WebGL对象
                // webGLObject: null,   // 操作的WebGL对象
                imageData: new Array<MeteoResultInterface>(),                       // 加载图片得到的数据
                currentPeriod: 0,                   // 当前图片周期
                currentPrecision: 0,
                showMimeData: false,
                productParams: {
                    scheduleTime: Meteo.SCHEDULETIME_INVALID,
                    currentTag: Meteo.TAG_INVALID,
                },
            },
            bar_grid_tile: {
                displayType: MeteoTypeDisplayTypeConfiguration.BAR_GRID_TILE,
                show: false,                           // 是否显示
                meteoType: {} as MeteoTypeConfigurationInterface,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                // webGLObject: new TileBar(this._map),                     // 操作的WebGL对象
                webGLObject: {} as IWebGL,                     // 操作的WebGL对象
                imageData: new Array<MeteoResultInterface>(),                       // 加载图片得到的数据
                currentPeriod: 0,                   // 当前图片周期
                currentPrecision: 0,
                showMimeData: false,
                productParams: {
                    scheduleTime: Meteo.SCHEDULETIME_INVALID,
                    currentTag: Meteo.TAG_INVALID,
                },
            },
            shade_non_grid_customlayer: {
                displayType: MeteoTypeDisplayTypeConfiguration.SHADE_NON_GRID_CUSTOMLAYER,
                show: false,                           // 是否显示
                meteoType: {} as MeteoTypeConfigurationInterface,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new NonGridCustomLayerShade(this._map, Meteo.SHADE_NON_GRID_CUSTOMLAYER_ID),     // 操作的WebGL对象
                // webGLObject: null,     // 操作的WebGL对象
                imageData: new Array<MeteoResultInterface>(),                       // 加载图片得到的数据
                currentPeriod: 0,                   // 当前图片周期
                currentPrecision: 0,
                showMimeData: false,
                productParams: {
                    scheduleTime: Meteo.SCHEDULETIME_INVALID,
                    currentTag: Meteo.TAG_INVALID,
                },
            },
            drift_non_grid_tile: {
                displayType: MeteoTypeDisplayTypeConfiguration.DRIFT_NON_GRID_TILE,
                show: false,                           // 是否显示
                meteoType: {} as MeteoTypeConfigurationInterface,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                // webGLObject: new NonGridTileIceDrift(this._map),     // 操作的WebGL对象
                webGLObject: {} as IWebGL,     // 操作的WebGL对象
                imageData: new Array<MeteoResultInterface>(),                       // 加载图片得到的数据
                currentPeriod: 0,                   // 当前图片周期
                currentPrecision: 0,
                showMimeData: false,
                productParams: {
                    scheduleTime: Meteo.SCHEDULETIME_INVALID,
                    currentTag: Meteo.TAG_INVALID,
                },
            },
        };
        // map.on('load', () => {
        map.addLayer(this._meteoData.shade_grid_customlayer.webGLObject as any);
        this._meteoData.bar_grid_tile.webGLObject = new TileBar(this._map);   // 把风杆做成瓦片，初始化要等mapbox的style初始化完成才能初始化风杆瓦片
        map.addLayer(this._meteoData.shade_non_grid_customlayer.webGLObject as any);
        this._meteoData.drift_non_grid_tile.webGLObject = new NonGridTileIceDrift(this._map);   // 把风杆做成瓦片，初始化要等mapbox的style初始化完成才能初始化风杆瓦片
        // });
    }

    format(fmt: string, date: Date) { // author: meizz
        let o: any = {
            "M+": date.getMonth() + 1, // 月份
            "d+": date.getDate(), // 日
            "H+": date.getHours(), // 小时
            "m+": date.getMinutes(), // 分
            "s+": date.getSeconds(), // 秒
            "q+": Math.floor((date.getMonth() + 3) / 3), // 季度
            "S": date.getMilliseconds() // 毫秒
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (let k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }

    // 匹配最近的气象周期
    // todo:让外部自己调这个方法匹配
    matchPeriod(period: number, _periods: Array<number>) {
        if (!period || !_periods) {
            return period;
        }
        let re;
        if (period >= _periods[_periods.length - 1]) {
            re = _periods[_periods.length - 1];
        } else if (period <= _periods[0]) {
            re = _periods[0];
        } else {
            re = _periods[0];
            for (let i = 0; i < _periods.length; i++) {
                let p = _periods[i];
                if (period >= p) {
                    re = p;
                } else {
                    break;
                }
            }
        }
        return re;
    }

    // 根据展示类型返回相应的_meteoData对象
    getMeteoDataObject(displayType: number): MeteoData {
        if (MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER === displayType) {           // 现在操作的是热力图meteo对象
            return this._meteoData.shade_grid_customlayer;
        } else if (MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D === displayType) {       // 现在操作的是流线图meteo对象
            return this._meteoData.mgl_grid_3d;
        } else if (MeteoTypeDisplayTypeConfiguration.ISOLINE_GRID_3D === displayType) {   // 现在操作的是等值线meteo对象
            return this._meteoData.isoline_grid_3d;
        } else if (MeteoTypeDisplayTypeConfiguration.BAR_GRID_TILE === displayType) {    // 现在操作的是风杆-等格点-瓦片meteo对象
            return this._meteoData.bar_grid_tile;
        } else if (MeteoTypeDisplayTypeConfiguration.SHADE_NON_GRID_CUSTOMLAYER === displayType) {    // 现在操作的是热力图-非等格点-自定义层meteo对象
            return this._meteoData.shade_non_grid_customlayer;
        } else if (MeteoTypeDisplayTypeConfiguration.DRIFT_NON_GRID_TILE === displayType) {    // 现在操作的是移向-非等格点-瓦片meteo对象
            return this._meteoData.drift_non_grid_tile;
        }
        throw new Error("getMeteoDataObject()==>unsupported");
    }

    // region fixme:显示气象
    // 外部调用显示气象
    show(displayType: number, meteoTypeConfiguration: MeteoTypeConfigurationInterface, precision: number, period: number, showMimeData: boolean, productParams: ProductParamsInterface, ignore: boolean = true) {   // 显示类型，气象类型，时间(long型)
        return new Promise((resolve, reject) => {
            // debugger
            let _currentMeteoData: MeteoData = this.getMeteoDataObject(displayType);
            // todo:这里得优化，在流之间切换时，先清空再重刷
            if (displayType === MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D && _currentMeteoData.meteoType.meteoTypeIndex != null && _currentMeteoData.meteoType.meteoTypeIndex[0] !== meteoTypeConfiguration.meteoTypeIndex[0]) {
                _currentMeteoData.webGLObject.hide();
            }
            this.initParams(displayType, meteoTypeConfiguration, precision, period, showMimeData, productParams, ignore).then(() => {
                // debugger
                // meteo.hide(displayType);   // 不隐藏了，要不会一闪一闪的
                this.showMeteo(displayType, meteoTypeConfiguration, false);
                resolve(true);
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    // 初始化相关参数(this._meteoData中的参数、WebGL的loadMeteo())
    initParams(displayType: number, meteoTypeConfiguration: MeteoTypeConfigurationInterface, precision: number, period: number, showMimeData: boolean, productParams: ProductParamsInterface, ignore: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!period) {
                reject("initParams方法period参数没传");
            }
            // fixme:根据meteoType、displayType判断是否有这个气象类型来展示、是_meteoData中的哪个、并根据传进来的周期与查到的所有周期进行匹配，找到距离当前周期最近的上一个周期(包括当前周期)
            // 根据meteoType和displayType判断现在是否支持此种气象类型的显示类型
            let supportDisplayTypeOfMeteoType = false;
            for (let i = 0; i < meteoTypeConfiguration.displayType.length; i++) {
                if (meteoTypeConfiguration.displayType[i] === displayType) {
                    supportDisplayTypeOfMeteoType = true;
                    break;
                }
            }
            if (supportDisplayTypeOfMeteoType) {
                // 根据displayType判断现在操作的是_meteoData里的哪个对象
                let _currentMeteoData: MeteoData = this.getMeteoDataObject(displayType);
                if (_currentMeteoData == null) {
                    reject("没找到_currentMeteoData");
                }
                // fixme:根据周期加载图片(需要判断是否需要重新加载图片，还是从其他地方取数据)
                if (_currentMeteoData.meteoType.meteoTypeIndex == null
                    || _currentMeteoData.meteoType.meteoTypeIndex[0] !== meteoTypeConfiguration.meteoTypeIndex[0]
                    || _currentMeteoData.meteoType.meteoSourceConfiguration[0].meteoSourceIndex != meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex
                    || _currentMeteoData.currentPrecision != precision
                    || _currentMeteoData.showMimeData != showMimeData) {                   // 气象类型改变了
                    _currentMeteoData.meteoType = meteoTypeConfiguration;
                    _currentMeteoData.currentPrecision = precision;
                    _currentMeteoData.currentPeriod = period;
                    _currentMeteoData.showMimeData = showMimeData;
                    _currentMeteoData.productParams = productParams;
                    // 气象类型改变了就需要重新设置色卡、透明度、是否覆盖地图等
                    // fixme:这里统一设置色卡、透明度会导致自定义层切换时出问题，所以在loadMeteo()前再改色卡
                    // this._currentMeteoData.webGLObject.setColor(meteoTypeConfiguration.color, meteoTypeConfiguration.gradientColorType);
                    // this._currentMeteoData.webGLObject.setOpacity(Meteo.OPACITY_DEFAULT);
                    if (_currentMeteoData.meteoType.underMap) {    // 被地图覆盖
                        _currentMeteoData.webGLObject.setZIndex("-1");
                    } else {                                            // 不被地图覆盖
                        _currentMeteoData.webGLObject.setZIndex("0");
                    }
                    // 需要重新加载数据，但如果在其他显示类型中，存在气象类型相同且周期相同的情况下，图片数据可以直接拿过来用，少加载一次图片
                    if (this.loadImageFromOtherDisplayType(meteoTypeConfiguration, displayType)) {
                        resolve();
                    } else {      // 如果其他显示类型没有相同气象类型或者时间不同的话，就重新加载数据
                        this.loadEachImage(displayType).then(value => {
                            resolve();
                        }).catch(reason => {
                            reject(reason)
                        });
                    }
                } else if (_currentMeteoData.meteoType.meteoTypeIndex[0] == meteoTypeConfiguration.meteoTypeIndex[0]
                    && _currentMeteoData.meteoType.meteoSourceConfiguration[0].meteoSourceIndex == meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex
                    && _currentMeteoData.currentPrecision == precision
                    && _currentMeteoData.showMimeData == showMimeData) {             // 气象类型没变
                    // 判断是否需要刷新图像数据
                    if (this.needToRefreshOrNot(period, displayType, productParams)) {
                        _currentMeteoData.currentPeriod = period;
                        _currentMeteoData.productParams = productParams;
                        // 需要重新加载数据，但如果在其他显示类型中，存在气象类型相同且周期相同的情况下，图片数据可以直接拿过来用，少加载一次图片
                        if (this.loadImageFromOtherDisplayType(meteoTypeConfiguration, displayType)) {
                            resolve();
                        } else {      // 如果其他显示类型没有相同气象类型或者时间不同的话，就重新加载数据
                            this.loadEachImage(displayType).then(value => {
                                resolve();
                            }).catch(reason => {
                                reject(reason)
                            });
                        }
                    } else {
                        resolve();
                    }

                }
            } else {
                reject("不支持此种气象类型的显示类型");
            }
        })
    }

    // 是否需要刷新图片数据
    needToRefreshOrNot(period: number, displayType: number, productParams: ProductParamsInterface,): boolean {
        let _currentMeteoData: MeteoData = this.getMeteoDataObject(displayType);
        if (_currentMeteoData.currentPeriod === 0) {
            return true;
        }
        let _p1 = period;
        let _p2 = _currentMeteoData.currentPeriod;
        // fixme:默认tag无效值统一，所以可以这么写
        return !(_p1 === _p2
            && _currentMeteoData.productParams.currentTag === productParams.currentTag
            && _currentMeteoData.productParams.scheduleTime === productParams.scheduleTime);
    }

    // 需要重新加载数据，但如果在其他显示类型中，存在气象类型相同且周期相同的情况下，图片数据可以直接拿过来用，少加载一次图片
    loadImageFromOtherDisplayType(meteoTypeConfiguration: MeteoTypeConfigurationInterface, displayType: number) {
        let _currentMeteoData: MeteoData = this.getMeteoDataObject(displayType);
        for (let i = 0; i < meteoTypeConfiguration.displayType.length; i++) {
            if (meteoTypeConfiguration.displayType[i] !== displayType) {   // 展示类型不同
                if (this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).meteoType.meteoTypeIndex != null
                    && this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).meteoType.meteoTypeIndex[0] === _currentMeteoData.meteoType.meteoTypeIndex[0]
                    && this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).meteoType.meteoSourceConfiguration[0].meteoSourceIndex == _currentMeteoData.meteoType.meteoSourceConfiguration[0].meteoSourceIndex
                    && this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).currentPrecision === _currentMeteoData.currentPrecision
                    && this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).showMimeData === _currentMeteoData.showMimeData
                ) {   // 气象类型相同
                    // fixme:默认tag无效值统一，所以可以这么写
                    if (_currentMeteoData.currentPeriod === this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).currentPeriod
                        && this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).productParams.currentTag === _currentMeteoData.productParams.currentTag
                        && this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).productParams.scheduleTime === _currentMeteoData.productParams.scheduleTime) {   // 周期相同
                        _currentMeteoData.webGLObject.setColor(_currentMeteoData.meteoType.color, _currentMeteoData.meteoType.gradientColorType);
                        _currentMeteoData.webGLObject.setOpacity(Meteo.OPACITY_DEFAULT);
                        _currentMeteoData.imageData = this.getMeteoDataObject(meteoTypeConfiguration.displayType[i]).imageData;
                        _currentMeteoData.webGLObject.loadMeteo(_currentMeteoData.imageData, _currentMeteoData.meteoType);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 如果其他显示类型没有相同气象类型或者时间不同的话，就重新加载数据
    loadEachImage(displayType: number) {
        return new Promise((resolve, reject) => {
            let currentMeteoData: MeteoData = this.getMeteoDataObject(displayType);
            currentMeteoData.webGLObject.load(currentMeteoData.currentPeriod, currentMeteoData.meteoType, currentMeteoData.currentPrecision, currentMeteoData.productParams).then((meteo: Array<MeteoResultInterface>) => {
                currentMeteoData.webGLObject.setColor(currentMeteoData.meteoType.color, currentMeteoData.meteoType.gradientColorType);
                currentMeteoData.webGLObject.setOpacity(Meteo.OPACITY_DEFAULT);
                currentMeteoData.imageData = meteo;
                currentMeteoData.webGLObject.loadMeteo(currentMeteoData.imageData, currentMeteoData.meteoType);
                resolve();
            }).catch(reason => {
                reject("loadEachImage()==>" + reason);
            });
        });
    }

    // 显示气象
    showMeteo(displayType: number, meteoTypeConfiguration: MeteoTypeConfigurationInterface, refreshColor?: boolean) {
        let _currentMeteoData: MeteoData = this.getMeteoDataObject(displayType);
        _currentMeteoData.show = true;
        //调色板 刷新气象色卡
        if (refreshColor) {
            this.hide(displayType);
            _currentMeteoData.meteoType ? _currentMeteoData.webGLObject.setColor(meteoTypeConfiguration.color, meteoTypeConfiguration.gradientColorType) : false;
        }
        _currentMeteoData.webGLObject.show(
            _currentMeteoData.meteoType.meteoTypeIndex[0] !== meteoTypeConfiguration.meteoTypeIndex[0]
            || _currentMeteoData.meteoType.meteoSourceConfiguration[0].meteoSourceIndex != meteoTypeConfiguration.meteoSourceConfiguration[0].meteoSourceIndex);
    }

    // endregion

    // region fixme:隐藏气象
    // 外部调用隐藏气象
    hide(displayType: number) {
        let _currentMeteoData: MeteoData = this.getMeteoDataObject(displayType);
        _currentMeteoData.show = false;
        _currentMeteoData.webGLObject.hide();
    }

    // endregion

    // region fixme:播放
    // 外部调用：播放时加载所有气象类型的图片
    period(productParams: ProductParamMapInterface, ignore: boolean = true): Promise<any> {   // ignore:是否忽略根据传入周期匹配有效周期
        return new Promise((resolve, reject) => {
            let meteoShowArray: any = [];
            for (let i in this._meteoData) {
                let meteoData_i: MeteoData = this._meteoData[i];
                if (meteoData_i.show) {
                    let displayType = [];
                    displayType.push(meteoData_i.displayType);
                    for (let j in this._meteoData) {
                        let meteoData_j: MeteoData = this._meteoData[j];
                        if (meteoData_j.show
                            && meteoData_j.displayType > meteoData_i.displayType
                            && meteoData_j.meteoType.meteoTypeIndex[0] === meteoData_i.meteoType.meteoTypeIndex[0]
                            && meteoData_j.meteoType.meteoSourceConfiguration[0].meteoSourceIndex === meteoData_i.meteoType.meteoSourceConfiguration[0].meteoSourceIndex
                            && meteoData_j.currentPrecision === meteoData_i.currentPrecision
                            && meteoData_j.showMimeData === meteoData_i.showMimeData
                            && productParams[j].currentTag === productParams[i].currentTag
                            && productParams[j].scheduleTime === productParams[i].scheduleTime
                        ) {
                            displayType.push(meteoData_j.displayType);
                        }
                    }
                    let hasSameMeteoType = false;
                    for (let k = 0; k < meteoShowArray.length; k++) {
                        let meteoData_k: MeteoData = this.getMeteoDataObject(meteoShowArray[k][1][0]);
                        if (meteoData_k.meteoType.meteoTypeIndex[0] === meteoData_i.meteoType.meteoTypeIndex[0]
                            && meteoData_k.meteoType.meteoSourceConfiguration[0].meteoSourceIndex === meteoData_i.meteoType.meteoSourceConfiguration[0].meteoSourceIndex
                            && meteoData_k.currentPrecision === meteoData_i.currentPrecision
                            && meteoData_k.showMimeData === meteoData_i.showMimeData
                            && productParams[this.getMeteoDataKeyByDisplayType(meteoShowArray[k][1][0])].currentTag === productParams[i].currentTag
                            && productParams[this.getMeteoDataKeyByDisplayType(meteoShowArray[k][1][0])].scheduleTime === productParams[i].scheduleTime
                        ) {
                            hasSameMeteoType = true;
                            break;
                        }
                    }
                    if (!hasSameMeteoType) {
                        meteoShowArray.push([meteoData_i.meteoType, displayType, productParams[i].period, productParams[i]]);
                    }
                }
            }

            Promise.all([this.loadEachSliderImage(meteoShowArray, 0, ignore),
                this.loadEachSliderImage(meteoShowArray, 1, ignore),
                this.loadEachSliderImage(meteoShowArray, 2, ignore),
                this.loadEachSliderImage(meteoShowArray, 3, ignore),
                this.loadEachSliderImage(meteoShowArray, 4, ignore),
                this.loadEachSliderImage(meteoShowArray, 5, ignore),
            ]).then(() => {
                for (let i = 0; i < meteoShowArray.length; i++) {
                    for (let j = 0; j < meteoShowArray[i][1].length; j++) {
                        let _currentMeteoData: MeteoData = this.getMeteoDataObject(meteoShowArray[i][1][j]);
                        if (_currentMeteoData.show) {    // 只有显示的时候，播放才会显示，要不然不显示
                            if (_currentMeteoData.meteoType.meteoTypeIndex != null
                                && meteoShowArray[i][0].meteoTypeIndex[0] === _currentMeteoData.meteoType.meteoTypeIndex[0]
                                && meteoShowArray[i][0].meteoSourceConfiguration[0].meteoSourceIndex == _currentMeteoData.meteoType.meteoSourceConfiguration[0].meteoSourceIndex
                                && meteoShowArray[i][2] === _currentMeteoData.currentPeriod
                                && meteoShowArray[i][3].currentTag === _currentMeteoData.productParams.currentTag
                                && meteoShowArray[i][3].scheduleTime === _currentMeteoData.productParams.scheduleTime
                            ) { // fixme:防止播放期间，在加载数据时突然换了气象类型等条件导致错误渲染的问题
                                this.show(_currentMeteoData.displayType,
                                    _currentMeteoData.meteoType,
                                    _currentMeteoData.currentPrecision,
                                    meteoShowArray[i][2],
                                    _currentMeteoData.showMimeData,
                                    meteoShowArray[i][3],
                                    ignore);
                            }
                        }
                    }
                }
                resolve();
            })
        })
    }

    getMeteoDataKeyByDisplayType(displayType: number): string {
        if (displayType == MeteoTypeDisplayTypeConfiguration.SHADE_GRID_CUSTOMLAYER) {
            return "shade_grid_customlayer";
        } else if (displayType == MeteoTypeDisplayTypeConfiguration.MGL_GRID_3D) {
            return "mgl_grid_3d";
        } else if (displayType == MeteoTypeDisplayTypeConfiguration.ISOLINE_GRID_3D) {
            return "isoline_grid_3d";
        } else if (displayType == MeteoTypeDisplayTypeConfiguration.BAR_GRID_TILE) {
            return "bar_grid_tile";
        } else if (displayType == MeteoTypeDisplayTypeConfiguration.SHADE_NON_GRID_CUSTOMLAYER) {
            return "shade_non_grid_customlayer";
        } else if (displayType == MeteoTypeDisplayTypeConfiguration.DRIFT_NON_GRID_TILE) {
            return "drift_non_grid_tile";
        }
        throw new Error("getMeteoDataKeyByDisplayType()==>unsupported");
    }


    // 播放时加载某种气象类型的图片
    loadEachSliderImage(meteoShowArray: Array<any>, index: number, ignore: boolean) {  // meteoShowArray=[[meteoType,[showType],period]],meteoShowArray[index]=[meteoType,[showType],period]
        return new Promise((resolve, reject) => {
            if (meteoShowArray.length > index) {
                let param = meteoShowArray[index];
                for (let i = 0; i < param[1].length; i++) {
                    this.getMeteoDataObject(param[1][i]).currentPeriod = param[2];
                    this.getMeteoDataObject(param[1][i]).productParams = param[3];
                }
                this.getMeteoDataObject(param[1][0]).webGLObject.load(param[2], param[0], this.getMeteoDataObject(param[1][0]).currentPrecision, param[3]).then((meteo: Array<MeteoResultInterface>) => {   // 同种气象类型的气象只加载一次图片，然后给各显示类型设置数据
                    for (let i = 0; i < param[1].length; i++) {
                        let _currentMeteoData: MeteoData = this.getMeteoDataObject(param[1][i]);
                        if (_currentMeteoData.meteoType.meteoTypeIndex != null
                            && param[0].meteoTypeIndex[0] === _currentMeteoData.meteoType.meteoTypeIndex[0]
                            && param[0].meteoSourceConfiguration[0].meteoSourceIndex == _currentMeteoData.meteoType.meteoSourceConfiguration[0].meteoSourceIndex
                            && param[2] === _currentMeteoData.currentPeriod
                            && param[3].currentTag === _currentMeteoData.productParams.currentTag
                            && param[3].scheduleTime === _currentMeteoData.productParams.scheduleTime
                        ) { // fixme:防止播放期间，在加载数据时突然换了气象类型等条件导致错误渲染的问题
                            _currentMeteoData.imageData = meteo;
                            _currentMeteoData.webGLObject.loadMeteo(_currentMeteoData.imageData, param[0]);
                        }
                    }
                    resolve();
                }).catch(reason => reject(reason));
            } else {
                resolve();
            }
        })
    }

    // 保存显示类型的周期数组
    /*setPeriods(displayType: number, _periods: number) {
        /!*this.getMeteoDataObject(displayType).periods = _periods;*!/
        throw new Error("setPeriods()==>unsupported");
    }*/

    /*getPrecisionByPrecisionIndex(precisionArray: Array<number>) {   // 通过精度索引来找对应的精度，小于0就取0，大于2就取2
        /!*if (this.precisionIndex < 0) {
            return precisionArray[0];
        } else if (this.precisionIndex > precisionArray.length - 1) {
            return precisionArray[precisionArray.length - 1];
        } else {
            return precisionArray[this.precisionIndex];
        }*!/
        throw new Error("getPrecisionByPrecisionIndex()==>unsupported");
    }*/
    // endregion


    // 清除WebGL上下文
    removeContext() {
        this._meteoData.shade_grid_customlayer.webGLObject.removeContext();
        this._meteoData.isoline_grid_3d.webGLObject.removeContext();
        this._meteoData.mgl_grid_3d.webGLObject.removeContext();
        this._meteoData.bar_grid_tile.webGLObject.removeContext();
        this._meteoData.shade_non_grid_customlayer.webGLObject.removeContext();
        this._meteoData.drift_non_grid_tile.webGLObject.removeContext();
    }
}

