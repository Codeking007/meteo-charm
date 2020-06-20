import {MeteoSourcePrecision, MeteoTypeConfigurationInterface} from "@/util/meteo/thor-meteo/meteo";

export default interface IWebGL {
    setColor(color: Array<any>): void;

    load(url: string, meteoTypeConfiguration: MeteoTypeConfigurationInterface, meteoSourcePrecision: number,): Promise<Array<MeteoResultInterface>>;

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