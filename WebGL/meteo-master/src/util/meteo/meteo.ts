// fixme:selectPeriod()中http路径改了，配合prohttp
// fixme:加载太慢，且noaa的在app都显示不出来，全改成最大精度的，100和40的
// fixme:给this.STYLE里的流线相关的每个对象加了个参数params，好用来把风和流的流线流动速度等参数区分开
// fixme:所有的色卡颜色都改了，耦合浪1.5m以下是透明色
// todo:在流之间切换时，先清空再重刷，再show()方法中，要重构
// fixme:根据DISPLAY_TYPE属性查找，在需要的每个位置加了风杆bar相应的属性
// fixme：清除context上下文，removeContext()
// todo:临时加了个shade1，用于显示热力图自定义层，以后要整理
// todo:加了个覆不覆盖图层的，搜索moveLayer
import {exp as http} from "../http";
import {Shade} from "./shade/grid/3d/index";
import {CustomLayerShade} from "./shade/grid/customlayer/index";
import {Mgl} from "./mgl/grid/3d/index";
import {Isoline} from "./isoline/grid/3d/index";
import {Bar} from "./bar/grid/3d/index";
import {TileBar} from "./bar/grid/tile/index";
import {MeteoImage} from "./image";
import {mat4} from "gl-matrix";
import mapboxgl from "mapbox-gl";

const DEFAULT_PRECISIONINDEX = 0;

// Add index signature
interface IndexSignature{
    [key:string]: any;
}

export class MeteoOptions {

    static readonly PERIOD_URL = "record/period.do";                          // 路径:查询气象周期
    static readonly URLHEAD = "http://weather.unmeteo.com/tiles/meteo";       // 路径:查询自己的气象图片
    static readonly URLHEAD_SHANGHAI = "http://47.96.15.244/tiles/meteo";     // 路径:查询上海的气象图片
    static readonly OPACITY_DEFAULT = 0.8;                                    // 颜色透明度
    static readonly METEO_FROM:IndexSignature = {                                            // 气象图片来源
        GFS: "gfs",
        MARITIME: "maritime",
        NOAA: "noaa",
        WW: "ww",
        W9: "w9"
    };
    static readonly METEO_DATA_PRECISION:IndexSignature = {                                  // 气象图片数据精度
        "25": 25,
        "50": 50,
        "100": 100,
        "8": 8,
        "40": 40
    };
    static readonly METEO_TYPE:IndexSignature = {                                            // 气象图片类型={from:气象图片来源,fileType:气象图片类型,type:气象图片包含的其中一个气象类型,precision:气象图片数据精度}

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
    static readonly METEO_COLOR:IndexSignature = {                                                // 气象图片显示色卡
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
    static readonly DISPLAY_TYPE:IndexSignature = {     // 显示样式
        shade: 0,
        isoline: 1,
        mgl: 2,
        vector: 3,
        bar: 4
    };
    static readonly STYLE:IndexSignature = {     // 设置显示样式
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
    static readonly BOXMAP:IndexSignature = {
        UNIMETLAYER: "unimet",     //1最里层。谷歌地图、谷歌位图等
        BASELAYER: "base",        //2示意图。天气等图层在其上或其下
        SKYLAYER: "sky",		   //3最外层。点线面在其上。
    };
}

export default class Meteo {
    private _map: any;

    private _precisionIndex: number;
    private _currentMeteoData: any;
    private _meteoData:IndexSignature;
    private meteoImage: MeteoImage;

    constructor(map: mapboxgl.Map) {
        this._map = map;
        this.meteoImage=new MeteoImage();
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
    selectPeriod(meteoType:string):any {    // 传入气象类型，查它有的周期
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
    matchPeriod(period:number, _periods:Array<number>) {
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
    getMeteoDataObject(displayType:number):any {
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

    format(fmt:string, date:Date) { // author: meizz
        let o:any = {
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
    getImageUrl(displayType:number) {
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
    needToRefreshOrNot(period:number, displayType:number) {
        this._currentMeteoData = this.getMeteoDataObject(displayType);
        if (this._currentMeteoData.currentPeriod === undefined) {
            return true;
        }
        let _p1 = period;
        let _p2 = this._currentMeteoData.currentPeriod;
        return !(_p1 === _p2);
    }

    // 初始化相关参数(this._meteoData中的参数、WebGL的loadMeteo())
    initParams(meteoType:string, displayType:number, period:number, ignore:boolean):any {
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
    loadImageFromOtherDisplayType(meteoType:string, displayType:number) {
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
    loadEachImage(displayType:number) {
        return new Promise((resolve, reject) => {
            let imageUrl = this.getImageUrl(displayType);
            this.meteoImage.load(imageUrl).then((meteo:any) => {
                this._currentMeteoData.imageData = meteo;
                this._currentMeteoData.webGLObject.loadMeteo(this._currentMeteoData.imageData, MeteoOptions.STYLE[this._currentMeteoData.meteoType], this.getPrecisionByPrecisionIndex(MeteoOptions.METEO_TYPE[this._currentMeteoData.meteoType].precision));
                resolve();
            });
        });
    }

    // 保存显示类型的周期数组
    setPeriods(displayType:number, _periods:number) {
        this.getMeteoDataObject(displayType).periods = _periods;
    }

    // 播放时加载某种气象类型的图片
    loadEachSliderImage(meteoShowArray:Array<any>, index:number, ignore:boolean) {  // meteoShowArray=[[meteoType,[showType],period]],meteoShowArray[index]=[meteoType,[showType],period]
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
    period(period:number, ignore:boolean) {   // ignore:是否忽略根据传入周期匹配有效周期
        return new Promise((resolve, reject) => {
            let meteoShowArray:any = [];
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
    show(displayType:number, meteoType:string, time:number, ignore:boolean) {   // 显示类型，气象类型，时间(long型)
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
                this.selectPeriod(meteoType).then((_periods:any) => {
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
    showMeteo(displayType:number, meteoType:string, refreshColor?:boolean) {
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
    hide(displayType:number) {
        this._currentMeteoData = this.getMeteoDataObject(displayType);
        this._currentMeteoData.show = false;
        if (displayType === MeteoOptions.DISPLAY_TYPE.mgl) {    // 是流线的话，调stop()
            this._currentMeteoData.webGLObject.stop();
        } else {
            this._currentMeteoData.webGLObject.hide();
        }
    }

    getPrecisionByPrecisionIndex(precisionArray:Array<number>) {   // 通过精度索引来找对应的精度，小于0就取0，大于2就取2
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

