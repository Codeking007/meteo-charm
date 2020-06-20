// fixme:selectPeriod()中http路径改了，配合prohttp
// fixme:加载太慢，且noaa的在app都显示不出来，全改成最大精度的，100和40的
// fixme:给this.STYLE里的流线相关的每个对象加了个参数params，好用来把风和流的流线流动速度等参数区分开
// fixme:所有的色卡颜色都改了，耦合浪1.5m以下是透明色
// todo:在流之间切换时，先清空再重刷，再show()方法中，要重构
// fixme:根据DISPLAY_TYPE属性查找，在需要的每个位置加了风杆bar相应的属性
// fixme：清除context上下文，removeContext()
// todo:临时加了个shade1，用于显示热力图自定义层，以后要整理
// todo:加了个覆不覆盖图层的，搜索moveLayer
import {exp as http, fileStreamHttp} from "../../http";
import {Shade} from "../shade/grid/3d/index";
import {CustomLayerShade} from "./shade/grid/customlayer/index";
import {Mgl} from "../mgl/grid/3d/index";
import {Isoline} from "../isoline/grid/3d/index";
import {Bar} from "../bar/grid/3d/index";
import {TileBar} from "../bar/grid/tile/index";
import {MeteoArrayBuffer, MeteoImage} from "../image";
import {mat4} from "gl-matrix";
import mapboxgl from "mapbox-gl";
import {MglParams} from "@/util/meteo/thor-meteo/mgl/grid/3d";

const DEFAULT_PRECISIONINDEX = 0;
// region fixme:MeteoSource
// 来源类型索引
export enum MeteoSourceIndex {
    GFS = 0,
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
    TEST = 99
}

// region 来源类型精度 MeteoSourcePrecision

// gfs
export enum GfsPrecision {
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
    L1 = 0.25,
    L2 = 0.4,
    L3 = 0.4,
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

// test
export enum TestPrecision {
    L1 = 0.5,
    L2 = 0.5,
    L3 = 0.5,
}

export type MeteoSourcePrecision = typeof GfsPrecision | typeof HycomPrecision | typeof WwPrecision
    | typeof EcC1dPrecision | typeof EcC2pPrecision
    | typeof IceConcNhPrecision | typeof IceConcShPrecision
    | typeof IceTypeNhPrecision | typeof IceTypeShPrecision
    | typeof IceDriftNhPrecision | typeof IceDriftShPrecision
    | typeof CimmisCradarPrecision
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
    static readonly URL_PREFIX: string = "test_tile/";
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
        latFrom: -78,
        latTo: 77.75,
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
}

// endregion

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
    // 是否在地图下面
    underMap: boolean;
    // 画流线需要的参数
    mglParams: MglParams;
    // 画等值线需要的参数
    isolineParams: {
        // 等值线间距
        delta: Function,
        // 值的格式处理
        dataFormat: Function,
    }
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
                    return 200;
                } else {
                    return 400;
                }
            },
            dataFormat: function (data: any) {
                return Math.round(data / 100);
            },
        },
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
    };
    // 流U+流V
    static readonly HYCOM_UVS: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.HYCOM],
        meteoTypeIndex: [MeteoTypeIndex.US, MeteoTypeIndex.VS],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: true,
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
    };
    //气象类型:风U+风V
    static readonly SHH_WW_UVGRD: MeteoTypeConfigurationInterface = {
        meteoSourceConfiguration: [MeteoSourceConfiguration.SHH_WW],
        meteoTypeIndex: [MeteoTypeIndex.UGRD, MeteoTypeIndex.VGRD],
        baseComponentUrl: [],
        computeAsVector: [true, true, false],
        underMap: true,
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
    };
    // 气象类型:耦合浪高+耦合浪向
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
    };
}

// endregion

// region fixme:其他配置项
//  色卡
export class MeteoTypeColorConfiguration {
    static readonly At = [[48000, [0, 0, 255, 1]], [92000, [152, 189, 197, 1]], [96000, [142, 179, 187, 1]], [100000, [71, 168, 167, 1]], [101000, [51, 98, 139, 1]], [102000, [157, 151, 60, 1]], [103000, [97, 61, 81, 1]], [105000, [95, 60, 81, 1]]];
    static readonly At_hpa = [[480, [0, 0, 255, 1]], [920, [152, 189, 197, 1]], [960, [142, 179, 187, 1]], [1000, [71, 168, 167, 1]], [1010, [51, 98, 139, 1]], [1020, [157, 151, 60, 1]], [1030, [97, 61, 81, 1]], [1050, [95, 60, 81, 1]]];
    static readonly W = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
        [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];
    static readonly Cwh = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly Ww = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly Sw1 = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly Sw2 = [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
        [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]];
    static readonly Ss = [[0, [37, 74, 255, 1]], [.02, [0, 100, 254, 1]], [.06, [0, 200, 254, 1]], [.1, [37, 193, 146, 1]], [.15, [0, 230, 0, 1]],
        [.2, [0, 250, 0, 1]], [.3, [254, 225, 0, 1]], [.4, [254, 174, 0, 1]], [.5, [220, 74, 29, 1]], [.6, [180, 0, 50, 1]], [.7, [254, 0, 150, 1]], [.8, [151, 50, 222, 1]], [.85, [86, 54, 222, 1]], [.9, [42, 132, 222, 1]], [1, [64, 199, 222, 1]], [1.5, [255, 255, 255, 1]], [4, [255, 255, 255, 1]]];
    static readonly St = [[5, [0, 0, 255, 1]], [10, [0, 255, 255, 1]], [15, [0, 255, 0, 1]], [20, [255, 255, 0, 1]], [25, [255, 19, 19, 1]], [30, [255, 9, 9, 1]], [35, [158, 0, 0, 1]]];
    static readonly Rh = [[0, [255, 34, 34, 1]], [21, [255, 34, 34, 1]], [40.7, [248, 83, 42, 1]], [60.5, [233, 233, 57, 1]], [80.2, [57, 198, 233, 1]], [100, [49, 125, 240, 1]], [100, [11, 41, 159, 1]]];
    static readonly Tmp = [[213.3, [11, 41, 159, 1]], [239.1, [49, 125, 240, 1]], [264.9, [57, 198, 233, 1]], [290.8, [233, 233, 57, 1]], [316.6, [248, 83, 42, 1]], [342.4, [255, 34, 34, 1]], [342.4, [255, 34, 34, 1]]];
    static readonly Vis = [[50, [102, 39, 0, 1]], [500, [163, 68, 0, 0.8]], [2000, [153, 153, 153, 0.6]], [6000, [102, 102, 102, 0.4]], [8000, [77, 77, 77, 0.3]],
        [10000, [26, 26, 26, 0.1]], [14000, [51, 51, 51, 0.2]], [20000, [0, 0, 0, 0]]];
    static readonly Apcp = [[0, [0, 0, 0, 0]], [5, [102, 255, 153, 1]], [10, [0, 128, 0, 1]], [15, [135, 206, 250, 1]], [20, [0, 0, 205, 1]], [25, [0, 0, 205, 1]], [30, [255, 0, 255, 1]]];
    static readonly Tcdc = [[0, [0, 0, 0, 0]], [10, [0, 0, 0, 0]], [20, [51, 51, 51, 0.2]], [40, [102, 102, 102, 0.4]], [60, [153, 153, 153, 0.6]], [80, [204, 204, 204, 0.8]], [100, [255, 255, 255, 1]]];

    static readonly Ice_conc = [[0, [0, 0, 137, 1]],
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

    static readonly Ice_type = [[1, [4, 98, 154, 1]],
        [2, [44, 150, 102, 1]],
        [3, [155, 205, 102, 1]],
        [4, [255, 255, 255, 1]]];

    static readonly GW = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
        [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];

}

// endregion

// Add index signature
interface IndexSignature {
    [key: string]: any;
}

export class MeteoOptions {

    static readonly PERIOD_URL = "record/period.do";                          // 路径:查询气象周期
    static readonly URLHEAD = "http://weather.unmeteo.com/tiles/meteo";       // 路径:查询自己的气象图片
    static readonly URLHEAD_SHANGHAI = "http://47.96.15.244/tiles/meteo";     // 路径:查询上海的气象图片
    static readonly OPACITY_DEFAULT = 0.8;                                    // 颜色透明度
    static readonly METEO_FROM: IndexSignature = {                                            // 气象图片来源
        GFS: "gfs",
        MARITIME: "maritime",
        NOAA: "noaa",
        WW: "ww",
        W9: "w9"
    };
    static readonly METEO_DATA_PRECISION: IndexSignature = {                                  // 气象图片数据精度
        "25": 25,
        "50": 50,
        "100": 100,
        "8": 8,
        "40": 40
    };
    static readonly METEO_COLOR: IndexSignature = {                                                // 气象图片显示色卡
        At: [[48000, [0, 0, 255, 1]], [92000, [152, 189, 197, 1]], [96000, [142, 179, 187, 1]], [100000, [71, 168, 167, 1]], [101000, [51, 98, 139, 1]], [102000, [157, 151, 60, 1]], [103000, [97, 61, 81, 1]], [105000, [95, 60, 81, 1]]],
        W: [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
            [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]],
        Cwh: [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
            [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]],
        Ww: [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
            [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]],
        Sw1: [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
            [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]],
        Sw2: [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
            [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]],
        Ss: [[0, [37, 74, 255, 1]], [.02, [0, 100, 254, 1]], [.06, [0, 200, 254, 1]], [.1, [37, 193, 146, 1]], [.15, [0, 230, 0, 1]],
            [.2, [0, 250, 0, 1]], [.3, [254, 225, 0, 1]], [.4, [254, 174, 0, 1]], [.5, [220, 74, 29, 1]], [.6, [180, 0, 50, 1]], [.7, [254, 0, 150, 1]], [.8, [151, 50, 222, 1]], [.85, [86, 54, 222, 1]], [.9, [42, 132, 222, 1]], [1, [64, 199, 222, 1]], [1.5, [255, 255, 255, 1]], [4, [255, 255, 255, 1]]],
        St: [[5, [0, 0, 255, 1]], [10, [0, 255, 255, 1]], [15, [0, 255, 0, 1]], [20, [255, 255, 0, 1]], [25, [255, 19, 19, 1]], [30, [255, 9, 9, 1]], [35, [158, 0, 0, 1]]],
        Rh: [[0, [255, 34, 34, 1]], [21, [255, 34, 34, 1]], [40.7, [248, 83, 42, 1]], [60.5, [233, 233, 57, 1]], [80.2, [57, 198, 233, 1]], [100, [49, 125, 240, 1]], [100, [11, 41, 159, 1]]],
        Tmp: [[213.3, [11, 41, 159, 1]], [239.1, [49, 125, 240, 1]], [264.9, [57, 198, 233, 1]], [290.8, [233, 233, 57, 1]], [316.6, [248, 83, 42, 1]], [342.4, [255, 34, 34, 1]], [342.4, [255, 34, 34, 1]]],
        Vis: [[50, [102, 39, 0, 1]], [500, [163, 68, 0, 0.8]], [2000, [153, 153, 153, 0.6]], [6000, [102, 102, 102, 0.4]], [8000, [77, 77, 77, 0.3]],
            [10000, [26, 26, 26, 0.1]], [14000, [51, 51, 51, 0.2]], [20000, [0, 0, 0, 0]]],
        Apcp: [[0, [0, 0, 0, 0]], [5, [102, 255, 153, 1]], [10, [0, 128, 0, 1]], [15, [135, 206, 250, 1]], [20, [0, 0, 205, 1]], [25, [0, 0, 205, 1]], [30, [255, 0, 255, 1]]],
        Tcdc: [[0, [0, 0, 0, 0]], [10, [0, 0, 0, 0]], [20, [51, 51, 51, 0.2]], [40, [102, 102, 102, 0.4]], [60, [153, 153, 153, 0.6]], [80, [204, 204, 204, 0.8]], [100, [255, 255, 255, 1]]],
        GW: [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
            [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]],
        //SMA
        W_SMA: [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
            [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [34, [0, 0, 0, 0]], [35, [0, 0, 0, 0]]],
        Cwh_SMA: [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
            [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]],
        Ww_SMA: [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
            [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]],
        Sw1_SMA: [[0, [198, 244, 255, 1]], [.5, [0, 194, 243, 1]], [1, [0, 89, 166, 1]], [1.5, [13, 100, 255, 1]], [2, [15, 21, 167, 1]],
            [2.5, [247, 74, 255, 1]], [3, [188, 0, 184, 1]], [4, [151, 0, 0, 1]], [5, [255, 4, 83, 1]], [7, [255, 98, 69, 1]], [10, [255, 255, 255, 1]], [12, [188, 141, 190, 1]]],
        Ss_SMA: [[0, [37, 74, 255, 1]], [.02, [0, 100, 254, 1]], [.06, [0, 200, 254, 1]], [.1, [37, 193, 146, 1]], [.15, [0, 230, 0, 1]],
            [.2, [0, 250, 0, 1]], [.3, [254, 225, 0, 1]], [.4, [254, 174, 0, 1]], [.5, [220, 74, 29, 1]], [.6, [180, 0, 50, 1]], [.7, [254, 0, 150, 1]], [.8, [151, 50, 222, 1]], [.85, [86, 54, 222, 1]], [.9, [42, 132, 222, 1]], [1, [64, 199, 222, 1]], [1.5, [255, 255, 255, 1]], [4, [255, 255, 255, 1]]],
        St_SMA: [[5, [0, 0, 255, 1]], [10, [0, 255, 255, 1]], [15, [0, 255, 0, 1]], [20, [255, 255, 0, 1]], [25, [255, 19, 19, 1]], [30, [255, 9, 9, 1]], [35, [158, 0, 0, 1]]],
    };
    static readonly DISPLAY_TYPE: IndexSignature = {     // 显示样式
        shade: 0,
        isoline: 1,
        mgl: 2,
        vector: 3,
        bar: 4
    };
    static readonly METEO_TYPE: IndexSignature = {                                            // 气象图片类型={from:气象图片来源,fileType:气象图片类型,type:气象图片包含的其中一个气象类型,precision:气象图片数据精度}

        // gfs
        At0: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "prmsl",
            fileType: "at0",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        W: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "ugrd",
            fileType: "wuv",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        GW: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "gust",
            fileType: "gw",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Rh: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "rh",
            fileType: "rh",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Tmp: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "tmp",
            fileType: "tmp",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Vis: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "vis",
            fileType: "vis",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Cwh: {
            from: MeteoOptions.METEO_FROM.MARITIME,
            type: "swh",
            fileType: "was",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Ww: {
            from: MeteoOptions.METEO_FROM.MARITIME,
            type: "shww",
            fileType: "ww",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Sw1: {
            from: MeteoOptions.METEO_FROM.MARITIME,
            type: "shts",
            fileType: "sw1",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Ss: {
            from: MeteoOptions.METEO_FROM.NOAA,
            type: "us",
            fileType: "ss",
            precision: [MeteoOptions.METEO_DATA_PRECISION["8"], MeteoOptions.METEO_DATA_PRECISION["40"]]
        },
        St: {
            from: MeteoOptions.METEO_FROM.NOAA,
            type: "tmps",
            fileType: "st",
            precision: [MeteoOptions.METEO_DATA_PRECISION["8"], MeteoOptions.METEO_DATA_PRECISION["40"]]
        },
        Apcp: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "apcp",
            fileType: "apcp",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        Tcdc: {
            from: MeteoOptions.METEO_FROM.GFS,
            type: "tcdc",
            fileType: "tcdc",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"], MeteoOptions.METEO_DATA_PRECISION["50"], MeteoOptions.METEO_DATA_PRECISION["100"]]
        },
        // sma
        W_SMA: {
            from: MeteoOptions.METEO_FROM.WW,
            type: "ugrd",
            fileType: "wuv",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"]]
        },
        Cwh_SMA: {
            from: MeteoOptions.METEO_FROM.WW,
            type: "swh",
            fileType: "was",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"]]
        },
        Ww_SMA: {
            from: MeteoOptions.METEO_FROM.WW,
            type: "shww",
            fileType: "ww",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"]]
        },
        Sw1_SMA: {
            from: MeteoOptions.METEO_FROM.WW,
            type: "shts",
            fileType: "sw1",
            precision: [MeteoOptions.METEO_DATA_PRECISION["25"]]
        },
        Ss_SMA: {
            from: MeteoOptions.METEO_FROM.NOAA,
            type: "us",
            fileType: "ss",
            precision: [MeteoOptions.METEO_DATA_PRECISION["8"]]
        },
        St_SMA: {
            from: MeteoOptions.METEO_FROM.NOAA,
            type: "tmps",
            fileType: "st",
            precision: [MeteoOptions.METEO_DATA_PRECISION["8"]]
        }
    };
    static readonly STYLE: IndexSignature = {     // 设置显示样式
        At0: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade, MeteoOptions.DISPLAY_TYPE.isoline],
            color: MeteoOptions.METEO_COLOR.At,                                         // 用哪个色卡
            isoline: {
                delta: function (zoom: any) {
                    if (zoom > 3 || zoom == null) {
                        return 200;
                    } else {
                        return 400;
                    }
                },             // 等值线间距
                dataFormat: function (data: any) {
                    return Math.round(data / 100);
                },    // 值的格式处理
            },
            computeAsVector: [true, false, false],                         // 三个通道的值是否都需要在用GLSL计算时考虑，比如风uv，两个通道都要考虑；风浪是高度方向周期，只需要考虑高度
            underMap: false,                                             // 是否在地图下面，被地图覆盖
        },
        W: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade, MeteoOptions.DISPLAY_TYPE.mgl, MeteoOptions.DISPLAY_TYPE.bar],
            color: MeteoOptions.METEO_COLOR.W,
            computeAsVector: [true, true, false],
            underMap: false,
            params: {
                fadeOpacity: 0.996,
                speedFactor: 6.0,
                dropRate: 0.003,
                dropRateBump: 0.01,
                particlesRadix: 64,
            }
        },
        Cwh: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Cwh,
            isoline: {
                delta: 1,
            },
            computeAsVector: [true, false, false],
            underMap: true
        },
        Ww: {
            displayType: [MeteoOptions.DISPLAY_TYPE.mgl, MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Ww,
            computeAsVector: [true, false, false],
            underMap: true
        },
        Sw1: {
            displayType: [MeteoOptions.DISPLAY_TYPE.mgl, MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Sw1,
            computeAsVector: [true, false, false],
            underMap: true
        },
        Sw2: {
            displayType: [MeteoOptions.DISPLAY_TYPE.mgl, MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Sw2,
            computeAsVector: [true, false, false],
            underMap: true
        },
        Ss: {
            displayType: [MeteoOptions.DISPLAY_TYPE.mgl, MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Ss,
            computeAsVector: [true, true, false],
            underMap: true,
            params: {
                fadeOpacity: 0.995,
                speedFactor: 100.0,
                dropRate: 0.003,
                dropRateBump: 0.01,
                particlesRadix: 64,
            }
        },
        St: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.St,
            isoline: {
                delta: 5,
            },
            computeAsVector: [true, false, false],
            underMap: true
        },
        Rh: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Rh,
            computeAsVector: [true, false, false],
            underMap: false
        },
        Tmp: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Tmp,
            computeAsVector: [true, false, false],
            underMap: false
        },
        Vis: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Vis,
            computeAsVector: [true, false, false],
            underMap: false
        },
        Tcdc: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Tcdc,
            computeAsVector: [true, false, false],
            underMap: false
        },
        Apcp: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Apcp,
            computeAsVector: [true, false, false],
            underMap: false
        },
        GW: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.GW,
            computeAsVector: [true, false, false],
            underMap: false
        },
        //SMA
        W_SMA: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade, MeteoOptions.DISPLAY_TYPE.mgl],
            color: MeteoOptions.METEO_COLOR.W_SMA,
            computeAsVector: [true, true, false],
            underMap: false
        },
        Cwh_SMA: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Cwh_SMA,
            isoline: {
                delta: 1,
            },
            computeAsVector: [true, false, false],
            underMap: true
        },
        Ww_SMA: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Ww_SMA,
            computeAsVector: [true, false, false],
            underMap: true
        },
        Sw1_SMA: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.Sw1_SMA,
            computeAsVector: [true, false, false],
            underMap: true
        },
        Ss_SMA: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade, MeteoOptions.DISPLAY_TYPE.mgl],
            color: MeteoOptions.METEO_COLOR.Ss_SMA,
            computeAsVector: [true, true, false],
            underMap: true
        },
        St_SMA: {
            displayType: [MeteoOptions.DISPLAY_TYPE.shade],
            color: MeteoOptions.METEO_COLOR.St_SMA,
            isoline: {
                delta: 5,
            },
            computeAsVector: [true, false, false],
            underMap: true
        },
    };
    static readonly BOXMAP: IndexSignature = {
        UNIMETLAYER: "unimet",     //1最里层。谷歌地图、谷歌位图等
        BASELAYER: "base",        //2示意图。天气等图层在其上或其下
        SKYLAYER: "sky",		   //3最外层。点线面在其上。
    };
}

export default class Meteo {
    private _map: any;

    private _precisionIndex: number;
    private _currentMeteoData: any;
    private _meteoData: IndexSignature;
    private meteoImage: MeteoImage;

    constructor(map: mapboxgl.Map) {
        this._map = map;
        this.meteoImage = new MeteoImage();
        this._meteoData = {                       // meteo气象显示类型：热力图、等值线、流线、瓦片
            shade: {
                displayType: MeteoOptions.DISPLAY_TYPE.shade,
                show: false,                           // 是否显示
                meteoType: null,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new Shade(this._map),     // 操作的WebGL对象
                // webGLObject: new CustomLayerShade(this._map, "customLayer1"),     // 操作的WebGL对象
                // webGLObject: null,     // 操作的WebGL对象
                imageData: null,                       // 加载图片得到的数据
                currentPeriod: null,                   // 当前图片周期
                periods: null                          // 该种气象类型包含的所有周期，没换气象类型就不改变这个
            },
            isoline: {
                displayType: MeteoOptions.DISPLAY_TYPE.isoline,
                show: false,                           // 是否显示
                meteoType: null,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new Isoline(this._map),   // 操作的WebGL对象
                // webGLObject: null,   // 操作的WebGL对象
                imageData: null,                       // 加载图片得到的数据
                currentPeriod: null,                   // 当前图片周期
                periods: null                          // 该种气象类型包含的所有周期，没换气象类型就不改变这个
            },
            mgl: {
                displayType: MeteoOptions.DISPLAY_TYPE.mgl,
                show: false,                           // 是否显示
                meteoType: null,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new Mgl(this._map),       // 操作的WebGL对象
                // webGLObject: null,       // 操作的WebGL对象
                imageData: null,                       // 加载图片得到的数据
                currentPeriod: null,                   // 当前图片周期
                periods: null                          // 该种气象类型包含的所有周期，没换气象类型就不改变这个
            },
            bar: {
                displayType: MeteoOptions.DISPLAY_TYPE.bar,
                show: false,                           // 是否显示
                meteoType: null,                       // 气象类型==>可据此调用_meteoOptions.METEO_TYPE[meteoType]、_meteoOptions.STYLE[meteoType]
                webGLObject: new Bar(this._map),                     // 操作的WebGL对象
                // webGLObject: null,                     // 操作的WebGL对象
                imageData: null,                       // 加载图片得到的数据
                currentPeriod: null,                   // 当前图片周期
                periods: null                          // 该种气象类型包含的所有周期，没换气象类型就不改变这个
            },
        };
        map.on('load', () => {
            // map.addLayer(this._meteoData.shade.webGLObject as any);
            // this._meteoData.bar.webGLObject=new TileBar(this._map);   // 把风杆做成瓦片，初始化要等mapbox的style初始化完成才能初始化风杆瓦片
        });
        this._precisionIndex = DEFAULT_PRECISIONINDEX;
    }

    // 查气象类型对应的周期
    selectPeriod(meteoType: string): any {    // 传入气象类型，查它有的周期
        if (MeteoOptions.METEO_TYPE[meteoType].type) {
            const params = {meteoType: MeteoOptions.METEO_TYPE[meteoType].type};
            if (!(meteoType.indexOf("_SMA") > 0)) {           // 查询自己的气象周期
                return http.postOnly("/service-self/" + MeteoOptions.PERIOD_URL, params);
            } else {                                        // 查询上海的气象周期
                return http.postOnly("/service-shh/" + MeteoOptions.PERIOD_URL, params);
            }
        }
    }

    // 匹配最近的气象周期
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
    getMeteoDataObject(displayType: number): any {
        if (MeteoOptions.DISPLAY_TYPE.shade === displayType) {           // 现在操作的是热力图meteo对象
            return this._meteoData.shade;
        } else if (MeteoOptions.DISPLAY_TYPE.isoline === displayType) {   // 现在操作的是等值线meteo对象
            return this._meteoData.isoline;
        } else if (MeteoOptions.DISPLAY_TYPE.mgl === displayType) {       // 现在操作的是流线图meteo对象
            return this._meteoData.mgl;
        } else if (MeteoOptions.DISPLAY_TYPE.bar === displayType) {    // 现在操作的是瓦片meteo对象
            return this._meteoData.bar;
        }
        return null;
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

    // 获取图片路径
    getImageUrl(displayType: number) {
        this._currentMeteoData = this.getMeteoDataObject(displayType);
        const m = MeteoOptions.METEO_TYPE[this._currentMeteoData.meteoType];
        let url;
        if (this._currentMeteoData.meteoType.indexOf("_SMA") > 0) {
            url = MeteoOptions.URLHEAD_SHANGHAI + "/" + m.from + "/" + m.fileType + "/" + this.getPrecisionByPrecisionIndex(m.precision) + "/{p}.png";
        } else {
            url = MeteoOptions.URLHEAD + "/" + m.from + "/" + m.fileType + "/" + this.getPrecisionByPrecisionIndex(m.precision) + "/{p}.png";
        }
        let d = new Date(this._currentMeteoData.currentPeriod);
        let str = this.format('yyMMddHH', new Date(d.getTime() + d.getTimezoneOffset() * 60000));
        return url.replace("{p}", str) + '?time=' + this.format('yyMMddHH', new Date());
    }

    // 是否需要刷新图片数据
    needToRefreshOrNot(period: number, displayType: number) {
        this._currentMeteoData = this.getMeteoDataObject(displayType);
        if (this._currentMeteoData.currentPeriod === undefined) {
            return true;
        }
        let _p1 = period;
        let _p2 = this._currentMeteoData.currentPeriod;
        return !(_p1 === _p2);
    }

    // 初始化相关参数(this._meteoData中的参数、WebGL的loadMeteo())
    initParams(meteoType: string, displayType: number, period: number, ignore: boolean): any {
        if (!period) {
            console.log("initParams方法period参数没传");
            return;
        }
        // fixme:根据meteoType、displayType判断是否有这个气象类型来展示、是_meteoData中的哪个、并根据传进来的周期与查到的所有周期进行匹配，找到距离当前周期最近的上一个周期(包括当前周期)
        // 根据meteoType和displayType判断现在是否支持此种气象类型的显示类型
        let supportDisplayTypeOfMeteoType = false;
        for (let i = 0; i < MeteoOptions.STYLE[meteoType].displayType.length; i++) {
            if (MeteoOptions.STYLE[meteoType].displayType[i] === displayType) {
                supportDisplayTypeOfMeteoType = true;
                break;
            }
        }
        if (supportDisplayTypeOfMeteoType) {
            // 根据displayType判断现在操作的是_meteoData里的哪个对象
            this._currentMeteoData = this.getMeteoDataObject(displayType);
            if (this._currentMeteoData == null) {
                return;
            }
            period = ignore ? period : (this.matchPeriod(period, this._currentMeteoData.periods));   // 匹配一下周期
            // fixme:根据周期加载图片(需要判断是否需要重新加载图片，还是从其他地方取数据)
            if (this._currentMeteoData.meteoType == null || this._currentMeteoData.meteoType !== meteoType) {                   // 气象类型改变了
                this._currentMeteoData.meteoType = meteoType;
                this._currentMeteoData.currentPeriod = period;
                // 气象类型改变了就需要重新设置色卡、透明度、是否覆盖地图等
                this._currentMeteoData.webGLObject.setColor(MeteoOptions.STYLE[this._currentMeteoData.meteoType].color);
                this._currentMeteoData.webGLObject.setOpacity(MeteoOptions.OPACITY_DEFAULT);
                if (MeteoOptions.STYLE[this._currentMeteoData.meteoType].underMap) {    // 被地图覆盖
                    this._currentMeteoData.webGLObject.setZIndex(-1);
                    if (displayType === MeteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                        this._map.moveLayer(this._currentMeteoData.webGLObject.id, MeteoOptions.BOXMAP.UNIMETLAYER);
                    }
                } else {                                                                      // 不被地图覆盖
                    this._currentMeteoData.webGLObject.setZIndex(0);
                    if (displayType === MeteoOptions.DISPLAY_TYPE.isoline) {    // 是等值线的话，得把mapbox图层删了重新画，要不图层上下关系不好确定
                        if (this._map.getLayer(this._currentMeteoData.webGLObject.lhID)) {
                            this._map.removeLayer(this._currentMeteoData.webGLObject.lhID);
                        }
                        if (this._map.getLayer(this._currentMeteoData.webGLObject.valID)) {
                            this._map.removeLayer(this._currentMeteoData.webGLObject.valID);
                        }
                    }
                    if (displayType === MeteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                        this._map.moveLayer(MeteoOptions.BOXMAP.UNIMETLAYER, this._currentMeteoData.webGLObject.id);
                    }
                }
                // 需要重新加载数据，但如果在其他显示类型中，存在气象类型相同且周期相同的情况下，图片数据可以直接拿过来用，少加载一次图片
                if (this.loadImageFromOtherDisplayType(meteoType, displayType)) {
                    return new Promise((resolve, reject) => {
                        resolve();
                    });
                } else {      // 如果其他显示类型没有相同气象类型或者时间不同的话，就重新加载数据
                    return this.loadEachImage(displayType);
                }
            } else if (this._currentMeteoData.meteoType === meteoType) {             // 气象类型没变
                // 判断是否需要刷新图像数据
                if (this.needToRefreshOrNot(period, displayType)) {
                    this._currentMeteoData.currentPeriod = period;
                    // 需要重新加载数据，但如果在其他显示类型中，存在气象类型相同且周期相同的情况下，图片数据可以直接拿过来用，少加载一次图片
                    if (this.loadImageFromOtherDisplayType(meteoType, displayType)) {
                        return new Promise((resolve, reject) => {
                            resolve();
                        });
                    } else {      // 如果其他显示类型没有相同气象类型或者时间不同的话，就重新加载数据
                        return this.loadEachImage(displayType);
                    }
                } else {
                    return new Promise((resolve, reject) => {
                        resolve();
                    });
                }

            }
        } else {
            console.log("不支持此种气象类型的显示类型");
        }
    }

    // 需要重新加载数据，但如果在其他显示类型中，存在气象类型相同且周期相同的情况下，图片数据可以直接拿过来用，少加载一次图片
    loadImageFromOtherDisplayType(meteoType: string, displayType: number) {
        for (let i = 0; i < MeteoOptions.STYLE[meteoType].displayType.length; i++) {
            if (MeteoOptions.STYLE[meteoType].displayType[i] !== displayType) {   // 展示类型不同
                if (this.getMeteoDataObject(MeteoOptions.STYLE[meteoType].displayType[i]).meteoType === this._currentMeteoData.meteoType) {   // 气象类型相同
                    if (this._currentMeteoData.currentPeriod === this.getMeteoDataObject(MeteoOptions.STYLE[meteoType].displayType[i]).currentPeriod) {   // 周期相同
                        this._currentMeteoData.imageData = this.getMeteoDataObject(MeteoOptions.STYLE[meteoType].displayType[i]).imageData;
                        this._currentMeteoData.webGLObject.loadMeteo(this._currentMeteoData.imageData, MeteoOptions.STYLE[this._currentMeteoData.meteoType], this.getPrecisionByPrecisionIndex(MeteoOptions.METEO_TYPE[this._currentMeteoData.meteoType].precision));
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
            let imageUrl = this.getImageUrl(displayType);
            this.meteoImage.load(imageUrl).then((meteo: any) => {
                this._currentMeteoData.imageData = meteo;
                this._currentMeteoData.webGLObject.loadMeteo(this._currentMeteoData.imageData, MeteoOptions.STYLE[this._currentMeteoData.meteoType], this.getPrecisionByPrecisionIndex(MeteoOptions.METEO_TYPE[this._currentMeteoData.meteoType].precision));
                resolve();
            });
        });
    }

    // 保存显示类型的周期数组
    setPeriods(displayType: number, _periods: number) {
        this.getMeteoDataObject(displayType).periods = _periods;
    }

    // 播放时加载某种气象类型的图片
    loadEachSliderImage(meteoShowArray: Array<any>, index: number, ignore: boolean) {  // meteoShowArray=[[meteoType,[showType],period]],meteoShowArray[index]=[meteoType,[showType],period]
        return new Promise((resolve, reject) => {
            if (meteoShowArray.length > index) {
                let param = meteoShowArray[index];
                for (let i = 0; i < param[1].length; i++) {
                    if (this.getMeteoDataObject(param[1][i]).currentPeriod === (ignore ? param[2] : (this.matchPeriod(param[2], this.getMeteoDataObject(param[1][i]).periods))) && this.getMeteoDataObject(param[1][i]).meteoType === param[0]) {
                        resolve();    // 主要是防止maritime那样三小时一个图片的,没有对应周期就不加载图片了
                        return;
                    }
                    this.getMeteoDataObject(param[1][i]).currentPeriod = (ignore ? param[2] : (this.matchPeriod(param[2], this.getMeteoDataObject(param[1][i]).periods)));
                    this.getMeteoDataObject(param[1][i]).meteoType = param[0];
                }
                let imageUrl1 = this.getImageUrl(param[1][0]);
                this.meteoImage.load(imageUrl1).then((meteo) => {   // 同种气象类型的气象只加载一次图片，然后给各显示类型设置数据
                    for (let i = 0; i < param[1].length; i++) {
                        let _currentMeteoData: any = this.getMeteoDataObject(param[1][i]);
                        _currentMeteoData.imageData = meteo;
                        _currentMeteoData.webGLObject.loadMeteo(_currentMeteoData.imageData, MeteoOptions.STYLE[_currentMeteoData.meteoType], this.getPrecisionByPrecisionIndex(MeteoOptions.METEO_TYPE[_currentMeteoData.meteoType].precision));
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        })
    }

    // 播放时加载所有气象类型的图片
    period(period: number, ignore: boolean) {   // ignore:是否忽略根据传入周期匹配有效周期
        return new Promise((resolve, reject) => {
            let meteoShowArray: any = [];
            for (let i in this._meteoData) {
                if (this._meteoData[i].show) {
                    let displayType = [];
                    displayType.push(this._meteoData[i].displayType);
                    for (let j in this._meteoData) {
                        if (this._meteoData[j].show && this._meteoData[j].displayType > this._meteoData[i].displayType && this._meteoData[j].meteoType === this._meteoData[i].meteoType) {
                            displayType.push(this._meteoData[j].displayType);
                        }
                    }
                    let hasSameMeteoType = false;
                    for (let k = 0; k < meteoShowArray.length; k++) {
                        if (meteoShowArray[k][0] === this._meteoData[i].meteoType) {
                            hasSameMeteoType = true;
                            break;
                        }
                    }
                    if (!hasSameMeteoType) {
                        meteoShowArray.push([this._meteoData[i].meteoType, displayType, period]);
                    }
                }
            }

            Promise.all([this.loadEachSliderImage(meteoShowArray, 0, ignore),
                this.loadEachSliderImage(meteoShowArray, 1, ignore),
                this.loadEachSliderImage(meteoShowArray, 2, ignore),
                this.loadEachSliderImage(meteoShowArray, 3, ignore),
            ]).then(() => {
                for (let i = 0; i < meteoShowArray.length; i++) {
                    for (let j = 0; j < meteoShowArray[i][1].length; j++) {

                        if (this.getMeteoDataObject(meteoShowArray[i][1][j]).show) {    // 只有显示的时候，播放才会显示，要不然不显示
                            this.show(meteoShowArray[i][1][j], meteoShowArray[i][0], meteoShowArray[i][2], ignore);
                        }
                    }
                }
                resolve();
            })
        })
    }

    // 外部调用显示气象
    show(displayType: number, meteoType: string, time: number, ignore: boolean) {   // 显示类型，气象类型，时间(long型)
        return new Promise((resolve, reject) => {

            this._currentMeteoData = this.getMeteoDataObject(displayType);
            // todo:这里得优化，在流之间切换时，先清空再重刷
            if (displayType === MeteoOptions.DISPLAY_TYPE.mgl && this._currentMeteoData.meteoType !== meteoType) {
                this._currentMeteoData.webGLObject.stop();
            }
            if (this._currentMeteoData.meteoType === meteoType) {   // 气象类型相同就不查周期了
                this.initParams(meteoType, displayType, time, ignore).then(() => {
                    // meteo.hide(displayType);   // 不隐藏了，要不会一闪一闪的
                    this.showMeteo(displayType, meteoType, false);
                    resolve();
                });
            } else {
                this.selectPeriod(meteoType).then((_periods: any) => {
                    this.setPeriods(displayType, _periods);
                    this.initParams(meteoType, displayType, time, ignore).then(() => {
                        // meteo.hide(displayType);
                        this.showMeteo(displayType, meteoType, false);
                        resolve();
                    });
                });
            }
        });
    }

    // 显示气象
    showMeteo(displayType: number, meteoType: string, refreshColor?: boolean) {
        this._currentMeteoData = this.getMeteoDataObject(displayType);
        this._currentMeteoData.show = true;
        //调色板 刷新气象色卡
        if (refreshColor) {
            this.hide(displayType);
            this._currentMeteoData.meteoType ? this._currentMeteoData.webGLObject.setColor(MeteoOptions.STYLE[this._currentMeteoData.meteoType].color) : false;
        }
        if (displayType === MeteoOptions.DISPLAY_TYPE.mgl) {    // 是流线的话，调play()
            this._currentMeteoData.webGLObject.play(this._currentMeteoData.meteoType !== meteoType);
        } else {
            this._currentMeteoData.webGLObject.show();
        }
    }

    // 隐藏气象
    hide(displayType: number) {
        this._currentMeteoData = this.getMeteoDataObject(displayType);
        this._currentMeteoData.show = false;
        if (displayType === MeteoOptions.DISPLAY_TYPE.mgl) {    // 是流线的话，调stop()
            this._currentMeteoData.webGLObject.stop();
        } else {
            this._currentMeteoData.webGLObject.hide();
        }
    }

    getPrecisionByPrecisionIndex(precisionArray: Array<number>) {   // 通过精度索引来找对应的精度，小于0就取0，大于2就取2
        if (this.precisionIndex < 0) {
            return precisionArray[0];
        } else if (this.precisionIndex > precisionArray.length - 1) {
            return precisionArray[precisionArray.length - 1];
        } else {
            return precisionArray[this.precisionIndex];
        }
    }


    get precisionIndex() {
        return this._precisionIndex;
    }

    // 设置精度索引
    set precisionIndex(value) {               // 这样就能根据索引设置精度，0是最高精度0.25，1是中等精度0.5，2是最低精度1.0
        this._precisionIndex = value;
    }

    // 清除WebGL上下文
    removeContext() {
        this._meteoData.shade.webGLObject.removeContext();
        this._meteoData.isoline.webGLObject.removeContext();
        this._meteoData.mgl.webGLObject.removeContext();
        this._meteoData.bar.webGLObject.removeContext();
    }


}

