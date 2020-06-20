// 加载图片
import {fileStreamHttp} from "@/util/http";
import Meteo, {
    MeteoSourceConfiguration,
    MeteoSourceConfigurationInterface,
    MeteoTypeConfigurationInterface,
    MeteoSourcePrecision,
    MeteoTypeIndex, MeteoSourceIndex, ProductParamsInterface
} from "@/util/meteo/thor-meteo-final/meteo";
import {MeteoResultInterface} from "@/util/meteo/thor-meteo-final/index";

export class MeteoImage {
    load(url: string) {
        return new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => resolve(this._loadImage(image));
            image.src = url;
        });
    }

    _loadImage(image: HTMLImageElement) {
        //this.valueTexture = createTexture(this.gl, this.gl.LINEAR, image);
        //读取图片
        const canvas = document.createElement('canvas');
        const ctx: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const re: any = {};
        // 形成数据纹理
        re.width = image.width;
        re.height = image.height - 1;
        re.data = new Uint8Array(ctx.getImageData(0, 0, image.width, image.height - 1).data);
        re.minAndMax = this.getMinAndMax(ctx.getImageData(0, image.height - 1, 8, 1).data);
        re.lon = this.getCoord(ctx.getImageData(8, image.height - 1, 4, 1).data);
        re.lat = this.getCoord(ctx.getImageData(12, image.height - 1, 4, 1).data);
        // re.minAndMax = [new Float32Array([-21.32,26.8]),new Float32Array([-21.57,21.42])];
        // re.lon = new Float32Array([-180,180,0.5]);
        // re.lat = new Float32Array([90,-90,0.5]);
        return re;


    }

    getCoord(uintArray: Uint8ClampedArray) {
        let d = new Float32Array(3);
        let u = new Uint8Array(d.buffer);
        for (let m = 0; m < d.length; m++)
            for (let n = 0; n < 4; n++)
                u[4 * m + n] = uintArray[4 * n + m];
        return d;
    }

    getMinAndMax(uintArray: Uint8ClampedArray) {
        let mm = new Array(3);
        for (let n = 0; n < mm.length; n++) {
            let d = mm[n] = new Float32Array(2);
            let u = new Uint8Array(d.buffer);
            for (let m = 0; m < u.length; m++)
                u[m] = uintArray[4 * m + n];
        }
        return mm;
    }

    getFloatArray(base64: string) {
        const a = this.base64ToArrayBuffer(base64);
        const re = new Float32Array(a);
        const dv = new DataView(a);
        for (let m = 0; m < re.length; m++) {
            re[m] = dv.getFloat32(m * 4);
        }
        return re;
    }

    base64ToArrayBuffer(base64: string) {
        let binary_string = window.atob(base64);
        let len = binary_string.length;
        let bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// 加载二进制流文件
export class MeteoArrayBuffer {
    load(period: number, meteoTypeConfiguration: MeteoTypeConfigurationInterface, meteoSourcePrecision: number, productParams: ProductParamsInterface): Promise<Array<Float32Array>> {
        // debugger
        let allNeededPromise: Array<Promise<Float32Array>> = new Array<Promise<Float32Array>>();
        for (let sourceIndex = 0; sourceIndex < meteoTypeConfiguration.meteoSourceConfiguration.length; sourceIndex++) {
            // 获取不同气象来源通用的文件
            let currentMeteoSourceConfiguration: MeteoSourceConfigurationInterface = meteoTypeConfiguration.meteoSourceConfiguration[sourceIndex];
            for (let typeIndex = 0; typeIndex < meteoTypeConfiguration.meteoTypeIndex.length; typeIndex++) {
                // 获取不种气象类型的数据文件
                let currentMeteoTypeIndex: MeteoTypeIndex = meteoTypeConfiguration.meteoTypeIndex[typeIndex];
                let meteoTypeUrl = "";
                // 正常显示的气象文件
                let nonGrid = currentMeteoSourceConfiguration.meteoSourceIndex >= 70
                    && currentMeteoSourceConfiguration.meteoSourceIndex < 90;
                if (productParams.scheduleTime == Meteo.SCHEDULETIME_INVALID && productParams.currentTag == Meteo.TAG_INVALID) {

                    meteoTypeUrl = MeteoSourceConfiguration.URL_PREFIX
                        + currentMeteoSourceConfiguration.meteoSourceIndex + "/"
                        + currentMeteoTypeIndex + "/"
                        + (nonGrid ? 0 : meteoSourcePrecision == 1 ? "1.0" : meteoSourcePrecision).toString().replace(/\./g, "_") + "/"
                        + period;
                } else {    // 气象产品文件
                    meteoTypeUrl = MeteoSourceConfiguration.URL_TAG_PREFIX +
                        +currentMeteoSourceConfiguration.meteoSourceIndex + "/"
                        + productParams.scheduleTime + "/"
                        + period + "/"
                        + currentMeteoTypeIndex + "/"
                        + (nonGrid ? 0 : meteoSourcePrecision == 1 ? "1.0" : meteoSourcePrecision).toString().replace(/\./g, "_") + "/"
                        + productParams.currentTag;
                }
                // fixme:雷达的还补充仰角路径
                if (currentMeteoSourceConfiguration.meteoSourceIndex == MeteoSourceIndex.CIMMIS_CRADAR) {
                    meteoTypeUrl += "_" + "unknown";
                    if (currentMeteoTypeIndex >= MeteoTypeIndex.ELEVATION_R_0_5 && currentMeteoTypeIndex <= MeteoTypeIndex.VIL_0_5) {
                        meteoTypeUrl += "_0";
                    } else if (currentMeteoTypeIndex >= MeteoTypeIndex.ELEVATION_R_1_5 && currentMeteoTypeIndex <= MeteoTypeIndex.VIL_1_5) {
                        meteoTypeUrl += "_1";
                    }
                }


                allNeededPromise.push(fileStreamHttp.get(meteoTypeUrl, null));
                for (let additionalFileIndex = 0; additionalFileIndex < meteoTypeConfiguration.baseComponentUrl.length; additionalFileIndex++) {
                    // 获取不同气象类型所要加载的额外文件
                    let currentBaseComponentUrl: string = meteoTypeConfiguration.baseComponentUrl[additionalFileIndex];
                    let additionalFileUrl = meteoTypeUrl + currentBaseComponentUrl;
                    allNeededPromise.push(fileStreamHttp.get(additionalFileUrl, null));
                }
            }
        }

        return Promise.all(allNeededPromise)

            /*.then((allNeededData: Array<Float32Array>) => {

            for (let sourceIndex = 0; sourceIndex < meteoTypeConfiguration.meteoSourceConfiguration.length; sourceIndex++) {
                // 获取不同气象来源通用的文件
                let currentMeteoSourceConfiguration: MeteoSourceConfigurationInterface = meteoTypeConfiguration.meteoSourceConfiguration[sourceIndex];
                currentMeteoSourceConfiguration.baseComponent.then((baseComponentData: Array<Float32Array>) => {
                    for (let typeIndex = 0; typeIndex < meteoTypeConfiguration.meteoTypeIndex.length; typeIndex++) {
                        // 获取不种气象类型的数据文件
                        let currentMeteoTypeIndex: MeteoTypeIndex = meteoTypeConfiguration.meteoTypeIndex[typeIndex];

                        for (let additionalFileIndex = 0; additionalFileIndex < meteoTypeConfiguration.baseComponentUrl.length; additionalFileIndex++) {
                            // 获取不同气象类型所要加载的额外文件
                            let currentBaseComponentUrl: string = meteoTypeConfiguration.baseComponentUrl[additionalFileIndex];
                            // fixme；arrayBuffer是从服务器/java传来的大端字节序二进制数据流，要转换成小字节序二进制数据流
                            // let originalData = this.getFloatArray(data);
                            // this.resolveData(originalData, meteoTypeConfiguration, meteoSourcePrecision);
                        }
                    }
                })
            }

        })*/;

    }

    getFloatArray(arrayBuffer: ArrayBuffer): Float32Array {
        const re = new Float32Array(arrayBuffer);
        const dv = new DataView(arrayBuffer);       // 通过它可防止big endian和little endian的问题
        for (let m = 0; m < re.length; m++) {
            re[m] = dv.getFloat32(m * 4);
        }
        return re;
    }

    resolveData(originalData: Float32Array, meteoSourceConfiguration: MeteoSourceConfigurationInterface, meteoSourcePrecision: number,) {
        // debugger
        let minAndMax: Float32Array = this.getMinAndMax(originalData);
        let pixelData: Uint8Array = this.getPixelData(originalData, minAndMax);
        let latFrom: number = Math.ceil(meteoSourceConfiguration.latFrom / meteoSourcePrecision) * meteoSourcePrecision;
        let latTo: number = Math.floor(meteoSourceConfiguration.latTo / meteoSourcePrecision) * meteoSourcePrecision;
        let re: MeteoResultInterface = {
            width: (meteoSourceConfiguration.lonTo - meteoSourceConfiguration.lonFrom) / meteoSourcePrecision + 1,
            height: (latTo - latFrom) / meteoSourcePrecision + 1,
            data: pixelData,
            minAndMax: minAndMax,
            lon: new Float32Array([meteoSourceConfiguration.lonFrom, meteoSourceConfiguration.lonTo, meteoSourcePrecision]),
            lat: new Float32Array([latFrom, latTo, meteoSourcePrecision]),
        };
        return re;
    }

    getPixelData(originalData: Float32Array, minAndMax: Float32Array): Uint8Array {
        let pixelData = new Uint8Array(originalData.length);
        for (let i = 0; i < pixelData.length; i++) {
            // fixme:pixelData是Uint8Array类型，所以值只能是0-255，不能存NaN
            // fixme:让无效值变成255，有效值在0-254之间
            if (isNaN(originalData[i])) {
                // todo:这个有问题，虽然把无效值变成透明了；但是在地图国家边界附近的无效值也透明了，没和有效值衔接上==>可以把这个值变成最小像素值0，这样无效值也是最小值得颜色了
                pixelData[i] = MeteoSourceConfiguration.INVALID_PIXEL_DATA;
            } else {
                pixelData[i] = (originalData[i] - minAndMax[0]) / (minAndMax[1] - minAndMax[0]) * MeteoSourceConfiguration.MAX_VALID_PIXEL_DATA;
            }
        }
        return pixelData;
    }

    // 合并格点像素数据
    mergeGridPixelData(meteoResults: Array<MeteoResultInterface>): Uint8Array {
        if (meteoResults.length > 0) {
            let pixelData = new Uint8Array(meteoResults[0].data.length * 4);
            for (let i = 0; i < meteoResults.length; i++) {
                for (let j = 0; j < meteoResults[i].data.length; j++) {
                    let data = meteoResults[i].data[j];
                    // fixme:如果气象数值的像素值不是255的话,就让它的alpha通道的像素值变成255
                    if (data != MeteoSourceConfiguration.INVALID_PIXEL_DATA) {
                        pixelData[j * 4 + 3] = MeteoSourceConfiguration.VALID_PIXEL_ALPHA;   // fixme:alpha=255代表是有效数据，不加的话画不出来，因为GLSL判断了；0代表是无效数据
                    }
                    pixelData[j * 4 + i] = data;
                }
            }
            return pixelData;
        } else {
            return new Uint8Array();
        }
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

    // 将双通道数值转换成四通道像素点
    transferPixelData(originalData: Array<Float32Array>, minAndMax: Array<Float32Array>): Uint8Array {
        // debugger
        if (originalData.length > 0) {
            let pixelData = new Uint8Array(originalData[0].length * 4);
            for (let i = 0; i < originalData[0].length; i++) {
                // fixme:pixelData是Uint8Array类型，所以值只能是0-255，不能存NaN
                // fixme:让无效值变成255，有效值在0-254之间
                if (isNaN(originalData[0][i]) || isNaN(originalData[1][i])) {
                    // todo:这个有问题，虽然把无效值变成透明了；但是在地图国家边界附近的无效值也透明了，没和有效值衔接上==>可以把这个值变成最小像素值0，这样无效值也是最小值得颜色了
                    // todo:这里用的全是0，因为海冰移向的南极点肯定没移向，所以给它设成无效值标志
                    pixelData[i * 4] = MeteoSourceConfiguration.INVALID_PIXEL_RGB;
                    pixelData[i * 4 + 1] = MeteoSourceConfiguration.INVALID_PIXEL_RGB;
                    pixelData[i * 4 + 2] = MeteoSourceConfiguration.INVALID_PIXEL_RGB;
                    pixelData[i * 4 + 3] = MeteoSourceConfiguration.INVALID_PIXEL_ALPHA;
                } else {
                    let lonlatpixel: Uint8Array = this.pack(new Float32Array([originalData[0][i], originalData[1][i]]), minAndMax[0], minAndMax[1]);
                    lonlatpixel.forEach((value, index, array) => {
                        pixelData[i * 4 + index] = value;
                    });
                }
            }
            return pixelData;
        } else {
            return new Uint8Array();
        }
    }

    getMinAndMax(originalData: Float32Array): Float32Array {
        let mm = new Float32Array(2);
        mm[0] = Infinity;
        mm[1] = -Infinity;
        for (let i = 0; i < originalData.length; i++) {
            if (isNaN(originalData[i])) {
                continue;
            }
            if (originalData[i] < mm[0]) {
                mm[0] = originalData[i];
            }
            if (originalData[i] > mm[1]) {
                mm[1] = originalData[i];
            }
        }
        return mm;
    }


}

