import {
    MeteoData,
    MeteoSourcePrecision,
    MeteoTypeConfigurationInterface,
    ProductParamsInterface,
    MeteoTypeDisplayTypeConfiguration
} from "@/util/meteo/thor-meteo-final/meteo";
import {WebGL} from "@/util/meteo/thor-meteo-final/gl";

export interface ProductParamMapInterface {
    // 热力图-等格点-自定义层
    shade_grid_customlayer: ProductParamsInterface;
    // 等值线-等格点-canvas3d
    isoline_grid_3d: ProductParamsInterface;
    // 流线-等格点-canvas3d
    mgl_grid_3d: ProductParamsInterface;
    // 风杆-等格点-瓦片
    bar_grid_tile: ProductParamsInterface;
    // 热力图-非等格点-自定义层
    shade_non_grid_customlayer: ProductParamsInterface;
    // 移向-非等格点-瓦片
    drift_non_grid_tile: ProductParamsInterface;

    // Add index signature
    [key: string]: any;
}

export interface IMeteo {
    // 显示气象类型
    show(displayType: number,
         meteoType: MeteoTypeConfigurationInterface,
         precision: number,
         period: number,
         showMimeData: boolean,
         productParams: ProductParamsInterface,
         ignore?: boolean): Promise<any>;

    // 隐藏气象
    hide(displayType: number): void;

    // 清除WebGL上下文
    removeContext(): void;

    // 播放
    period(productParams: ProductParamMapInterface,
           ignore?: boolean): Promise<any>;
}

export default interface IWebGL {
    setColor(color: Array<any>, colorType?: string): void;

    load(url: number, meteoTypeConfiguration: MeteoTypeConfigurationInterface, meteoSourcePrecision: number, productParams: ProductParamsInterface): Promise<Array<MeteoResultInterface>>;

    loadMeteo(meteoResults: Array<MeteoResultInterface>, meteoTypeConfiguration: MeteoTypeConfigurationInterface): void;

    show(clear?: boolean): void;

    hide(): void;

    setZIndex(z: string): void;

    setOpacity(opacity: number): void;

    removeContext(): void;
}

export interface MeteoResultInterface {
    // 数据宽度，即多少个经度线
    width: number;
    // 数据高度，即多少个纬度线
    height: number;
    // fixme:转换后的像素点数据==>[0-255]==>让无效值变成255，有效值在0-254之间
    data: Uint8Array;
    // new Float32Array([真实数据最小值,真实数据最大值])
    minAndMax: Float32Array;
    // new Float32Array([经度最小值,经度最大值,经度格点精度])
    lon: Float32Array;
    // new Float32Array([纬度最小值,纬度最大值,纬度格点精度])
    lat: Float32Array;
}