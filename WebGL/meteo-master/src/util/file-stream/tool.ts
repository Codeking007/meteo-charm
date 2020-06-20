import {exp, fileStreamHttp} from "@/util/http"

// 资源类型索引
export enum MeteoSourceIndex {
    GFS = 0,
    MARITIME = 10,
    HYCOM = 20,
    SHH_WW = 50,
    TEST = 99
}

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
}

// region 精度
// gfs
export enum GfsPrecision {
    L1 = 0.25,
    L2 = 0.5,
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
}

// ww
export enum WwPrecision {
    L1 = 0.25,
}

// test
export enum TestPrecision {
    L1 = 0.5,
}

// endregion

// region
// 资源类型配置接口
export interface MeteoSourceConfigurationInterface {
    meteoSourceIndex: MeteoSourceIndex;
    lonFrom: number;
    lonTo: number;
    latFrom: number;
    latTo: number;
}

// 资源类型配置
export class MeteoSourceConfiguration {
    static readonly gfs: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.GFS,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -90,
        latTo: 90
    };
    static readonly maritime: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.MARITIME,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -85.25,
        latTo: 89.25
    };
    static readonly hycom: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.HYCOM,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -80.0,
        latTo: 80.0
    };
    static readonly shhWw: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.SHH_WW,
        lonFrom: -180,
        lonTo: 180,
        latFrom: -78,
        latTo: 77.75
    };
    static readonly test: MeteoSourceConfigurationInterface = {
        meteoSourceIndex: MeteoSourceIndex.TEST,
        lonFrom: -1.5,
        lonTo: 1.5,
        latFrom: -1.0,
        latTo: 1.0
    };
    static readonly meteoSources: Array<MeteoSourceConfigurationInterface> = [MeteoSourceConfiguration.gfs, MeteoSourceConfiguration.maritime, MeteoSourceConfiguration.hycom, MeteoSourceConfiguration.shhWw, MeteoSourceConfiguration.test];
}

// endregion

// region
// 气象数据接口定义
export interface MeteoStreamInterface {

    // 从服务器获取气象文件
    loadFileData(): Promise<boolean>;

    // 获取某经纬度范围内的气象数据
    getData(lonFrom: number, lonTo: number, latFrom: number, latTo: number): Float32Array;

    // 设置某经纬度范围内的气象数据
    setData(data: Float32Array): void;

    // 将气象文件保存到服务器中
    saveFileData(tag?: number): Promise<boolean>;

    // 后退到几步前保存的数据
    goBackward(step: number): Float32Array;

    // 前进到几步后保存的数据
    goForeward(step: number): Float32Array;

}

// 历史保存 数据接口定义
export interface HistoricalDataInterface {
    data: Float32Array;
    modifiedData: Array<Float32Array>; // 第一个是数据索引，第二个是值
    lonFrom?: number;
    lonTo?: number;
    latFrom?: number;
    latTo?: number;
}

// 气象数据操作类
export class MeteoStream implements MeteoStreamInterface {
    // 历史保存数据的最大记录数量
    static readonly maxHistoryNum: number = 10;
    // 批次时间
    private _scheduleTime: number;
    // 预报时间
    private _forecastTime: number;
    // 气象来源
    private _meteoSourceIndex: MeteoSourceIndex;
    // 气象类型
    private _meteoTypeIndex: MeteoTypeIndex;
    // 气象精度
    private _meteoPrecision: GfsPrecision | MaritimePrecision | HycomPrecision | WwPrecision | TestPrecision;
    // 标签
    private _tag: number;
    private _meteoSourceConfiguration!: MeteoSourceConfigurationInterface;


    private _currentLonFrom!: number;
    private _currentLonTo!: number;
    private _currentLatFrom!: number;
    private _currentLatTo!: number;

    // 历史数据
    private _historyData: Array<HistoricalDataInterface>;
    // 当前正在操作是第几份（从0开始算）保存数据（还没存modifiedData，存了就跳到下一个索引）
    private _currentStep!: number;
    // 当前临时操作数据，用于后退时将未保存数据暂时存在这里
    private _temporaryData!: Float32Array | null;

    constructor(meteoSourceIndex: MeteoSourceIndex,
                scheduleTime: number,
                forecastTime: number,
                meteoTypeIndex: MeteoTypeIndex,
                meteoPrecision: GfsPrecision | MaritimePrecision | HycomPrecision | WwPrecision | TestPrecision,
                tag: number) {
        this._scheduleTime = scheduleTime;
        this._forecastTime = forecastTime;
        this._meteoSourceIndex = meteoSourceIndex;
        this._meteoTypeIndex = meteoTypeIndex;
        this._meteoPrecision = meteoPrecision;
        this._tag = tag;
        this._meteoSourceConfiguration = MeteoSourceConfiguration.meteoSources.filter((value, index, array) => {
            return value.meteoSourceIndex === meteoSourceIndex;
        })[0];
        this._historyData = new Array<HistoricalDataInterface>();
    }

    getFloatArray(arrayBuffer: ArrayBuffer): Float32Array {
        const re = new Float32Array(arrayBuffer);
        const dv = new DataView(arrayBuffer);       // 通过它可防止big endian和little endian的问题
        for (let m = 0; m < re.length; m++) {
            re[m] = dv.getFloat32(m * 4);
        }
        return re;
    }

    loadFileData(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // todo：获取文件路径
            // let relativeFilePath = "testArrayBuffer";
            // let relativeFilePath = "test0";
            let relativeFilePath = "process/"
                + this.meteoSourceIndex + "/"
                + this.scheduleTime + "/"
                + this.forecastTime + "/"
                + this.meteoTypeIndex + "/"
                + this.meteoPrecision.toString().replace(/\./g,"_") + "/"
                + this.tag;
            fileStreamHttp.get(relativeFilePath, null).then((data: ArrayBuffer) => {
                // fixme；arrayBuffer是从服务器/java传来的大端字节序二进制数据流
                // fixme: originalData是前台存的小字节序二进制数据流
                this.historyData.push({data: this.getFloatArray(data), modifiedData: new Array<Float32Array>()});
                this.currentStep = this.historyData.length;
                this.temporaryData = null;
                resolve(true);
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    // region 获取数据+前后退几步
    // 标准化经度
    standardLon(degree: number): number {
        return (degree + 180.0) % 360.0 - 180.0;
    }

    /**
     *
     * @param step 往后退几步（大于0）
     */
    goBackward(step: number): Float32Array {
        this.currentStep = this.currentStep - step;
        return this.getData(this.currentLonFrom, this.currentLonTo, this.currentLatFrom, this.currentLatTo);
    }

    // 可以后退几步
    getBackwardStep(): number {
        return this.currentStep;
    }

    /**
     *
     * @param step 向前进几步（大于0）
     */
    goForeward(step: number): Float32Array {
        this.currentStep = this.currentStep + step;
        return this.getData(this.currentLonFrom, this.currentLonTo, this.currentLatFrom, this.currentLatTo);
    }

    // 可以前进几步
    getForewardStep(): number {
        let step: number = (this.historyData.length - 1) - this.currentStep + (this.temporaryData != null ? 1 : 0);
        return step < 0 ? 0 : step;
    }

    // 不传参数就是查全部数据
    getData(lonFrom?: number, lonTo?: number, latFrom?: number, latTo?: number): Float32Array {
        let reData: Float32Array = new Float32Array();
        if (lonFrom == null || lonTo == null || latFrom == null || latTo == null) {
            if (this.currentStep < this.historyData.length) {
                reData = this.getStepData(this.currentStep);
            } else {
                if (this.temporaryData != null) {
                    reData = this.temporaryData;
                } else {
                    reData = this.getStepData(this.historyData.length - 1);
                }
            }
        } else {
            this.currentLonFrom = lonFrom;
            this.currentLonTo = lonTo;
            this.currentLatFrom = latFrom;
            this.currentLatTo = latTo;
            if (this.currentStep < this.historyData.length) {
                reData = this.extractDataFromAllData(lonFrom, lonTo, latFrom, latTo, this.getStepData(this.currentStep));
            } else {
                if (this.temporaryData != null) {
                    reData = this.extractDataFromAllData(lonFrom, lonTo, latFrom, latTo, this.temporaryData);
                } else {
                    reData = this.extractDataFromAllData(lonFrom, lonTo, latFrom, latTo, this.getStepData(this.historyData.length - 1));
                }
            }
        }
        return reData;
    }

    /**
     *
     * @param step  要获取第几份（从0开始算）保存数据
     */
    getStepData(step: number): Float32Array {
        let stepData = new Float32Array();
        let originalData = this.historyData[0].data;
        if (originalData != null) {
            stepData = new Float32Array(originalData);  // fixme:重新创建个数组，把地址和源数组的地址分开，这样就不会修改源数组的值了
            for (let i = 0; i <= step; i++) {
                let modifiedData = this.historyData[i].modifiedData;
                if (modifiedData != null) {
                    for (let j = 0; j < modifiedData.length; j++) {
                        stepData[modifiedData[j][0]] = modifiedData[j][1];      // fixme:这里指针是两个，不用重建数组
                    }
                }
            }
        }
        return stepData;
    }

    /**
     * 从全部数据中抽取经纬度范围内的数据
     * @param lonFrom
     * @param lonTo
     * @param latFrom
     * @param latTo
     * @param AllData
     */
    extractDataFromAllData(lonFrom: number, lonTo: number, latFrom: number, latTo: number, AllData: Float32Array): Float32Array {
        let reData: Float32Array = new Float32Array();
        // fixme:（1）经纬度点不一定正好跟0.25格点对齐
        // fixme:（2）抽取的经度范围不一定在-180~180之间，可能范围在170~190或者-190~-170，这样就超出范围了
        let lonFromIndex: number = Math.floor((lonFrom - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision);
        let lonToIndex: number = Math.floor((lonTo - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision);
        let latFromIndex: number = Math.floor((latFrom - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision);
        let latToIndex: number = Math.floor((latTo - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision);
        let givenColumns = lonToIndex - lonFromIndex + 1;
        let givenRows = latToIndex - latFromIndex + 1;

        let columns = (this.meteoSourceConfiguration.lonTo - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision + 1;
        let rows = (this.meteoSourceConfiguration.latTo - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision + 1;
        reData = new Float32Array(givenRows * givenColumns);
        for (let i = latFromIndex; i <= latToIndex; i++) {
            for (let j = lonFromIndex; j <= lonToIndex; j++) {
                reData[(i - latFromIndex) * givenColumns + (j - lonFromIndex)] = AllData[i * columns + (j + columns) % columns];  // fixme:这里指针是两个，不用重建数组
            }
        }
        return reData;
    }

    // endregion
    // region 保存数据+保留最大历史数量数据
    setData(data: Float32Array): void {
        if (this.currentStep < this.historyData.length) {
            // 找出从当前保存数据往后的所有多余修改数据
            let abandonedModifiedDataArray: Array<Float32Array> = new Array<Float32Array>();
            for (let i = this.currentStep + 1; i < this.historyData.length; i++) {
                let modifiedData = this.historyData[i].modifiedData;
                if (modifiedData != null) {
                    for (let j = 0; j < modifiedData.length; j++) {
                        let index: number = abandonedModifiedDataArray.findIndex((value, index, obj) => {
                            return value[0] == modifiedData[j][0];
                        });
                        if (index == -1) {  // 没有相同的索引
                            // fixme:重新创建数组以区分指针
                            abandonedModifiedDataArray.push(new Float32Array(modifiedData[j]));
                        }
                    }
                }
            }

            let currentStepAllData: Float32Array = this.getStepData(this.currentStep);
            let historicalModifiedDataArray: Array<Float32Array> = this.getModifiedData(this.currentLonFrom,
                this.currentLonTo,
                this.currentLatFrom,
                this.currentLatTo, currentStepAllData, data);
            for (let i = 0; i < abandonedModifiedDataArray.length; i++) {
                // 将abandonedModifiedDataArray的数值恢复到当前保存数据的数值
                abandonedModifiedDataArray[i][1] = currentStepAllData[abandonedModifiedDataArray[i][0]];
                // 并和本次修改数据对比，把不在本次修改数据中的abandonedModifiedDataArray数值加到historicalModifiedDataArray里面
                let index: number = historicalModifiedDataArray.findIndex((value, index, obj) => {
                    return value[0] == abandonedModifiedDataArray[i][0];
                });
                if (index == -1) {  // 没有相同索引
                    historicalModifiedDataArray.push(new Float32Array(abandonedModifiedDataArray[i]));   // fixme:重新创建数组以区分指针
                }
            }

            this.historyData.push({
                data: new Float32Array(),
                modifiedData: historicalModifiedDataArray,
            });
        } else {
            let historicalModifiedDataArray: Array<Float32Array> = this.getModifiedData(this.currentLonFrom,
                this.currentLonTo,
                this.currentLatFrom,
                this.currentLatTo, this.getStepData(this.historyData.length - 1), data);
            this.historyData.push({
                data: new Float32Array(),
                modifiedData: historicalModifiedDataArray,
            });
        }

        // 检查历史数据是否超出最大记录数量
        this.spliceHistoryData();
        // 将当前操作step设成最新的索引
        this.currentStep = this.historyData.length;
        // 清空临时数据
        this.temporaryData = null;
    }

    // 按照经纬度范围找出modifiedData中与allData不同的数据
    getModifiedData(lonFrom: number, lonTo: number, latFrom: number, latTo: number, allData: Float32Array, modifiedData: Float32Array): Array<Float32Array> {
        let historicalModifiedDataArray: Array<Float32Array> = new Array<Float32Array>();
        if (lonFrom == null || lonTo == null || latFrom == null || latTo == null) {
            if (allData.length == modifiedData.length) {
                for (let i = 0; i < allData.length; i++) {
                    if (allData[i] != modifiedData[i]) {
                        historicalModifiedDataArray.push(new Float32Array([i, modifiedData[i]])); // fixme:重新创建数组以区分指针
                    }
                }
            }
        } else {
            let lonFromIndex: number = Math.floor((lonFrom - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision);
            let lonToIndex: number = Math.floor((lonTo - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision);
            let latFromIndex: number = Math.floor((latFrom - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision);
            let latToIndex: number = Math.floor((latTo - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision);
            let givenColumns = lonToIndex - lonFromIndex + 1;
            let givenRows = latToIndex - latFromIndex + 1;

            let columns = (this.meteoSourceConfiguration.lonTo - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision + 1;
            let rows = (this.meteoSourceConfiguration.latTo - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision + 1;


            for (let i = latFromIndex; i <= latToIndex; i++) {
                for (let j = lonFromIndex; j <= lonToIndex; j++) {
                    let allDataIndex = i * columns + (j + columns) % columns;
                    let modifiedDataIndex = (i - latFromIndex) * givenColumns + (j - lonFromIndex);
                    if (allData[allDataIndex] != modifiedData[modifiedDataIndex]) {
                        historicalModifiedDataArray.push(new Float32Array([allDataIndex, modifiedData[modifiedDataIndex]])); // fixme:重新创建数组以区分指针
                    }
                }
            }
        }

        return historicalModifiedDataArray;
    }


    // 检查历史数据是否超出最大记录数量，超出就取最后maxHistoryNum(10)个，并给第一个元素加入全体数据data
    spliceHistoryData(): void {
        // 多了几个历史数据
        let spareHistoryNum = this.historyData.length - MeteoStream.maxHistoryNum;
        if (spareHistoryNum > 0) {
            this.historyData[spareHistoryNum].data = this.getStepData(spareHistoryNum - 1);
            this.historyData.splice(0, spareHistoryNum);
        }
    }

    // endregion


    /**
     * 设置临时数据
     * @param data
     */
    setTemporaryData(data: Float32Array): void {
        if (this.currentLonFrom == null || this.currentLonTo == null || this.currentLatFrom == null || this.currentLatTo == null) {
            this.temporaryData = new Float32Array(data);
        } else {
            let lonFromIndex: number = Math.floor((this.currentLonFrom - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision);
            let lonToIndex: number = Math.floor((this.currentLonTo - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision);
            let latFromIndex: number = Math.floor((this.currentLatFrom - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision);
            let latToIndex: number = Math.floor((this.currentLatTo - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision);
            let givenColumns = lonToIndex - lonFromIndex + 1;
            let givenRows = latToIndex - latFromIndex + 1;

            let columns = (this.meteoSourceConfiguration.lonTo - this.meteoSourceConfiguration.lonFrom) / this.meteoPrecision + 1;
            let rows = (this.meteoSourceConfiguration.latTo - this.meteoSourceConfiguration.latFrom) / this.meteoPrecision + 1;

            this.temporaryData = this.getStepData(this.historyData.length - 1);
            for (let i = latFromIndex; i <= latToIndex; i++) {
                for (let j = lonFromIndex; j <= lonToIndex; j++) {
                    this.temporaryData[i * columns + (j + columns) % columns] = data[(i - latFromIndex) * givenColumns + (j - lonFromIndex)];
                }
            }
        }
    }

    saveFileData(tag?: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const re = this.getStepData(this.historyData.length - 1);
            if (this.littleEndian()) {
                // 小字节序的TypedArrayBuffer转成大字节序的TypedArrayBuffer传到后台服务器中
                const dv = new DataView(re.buffer);
                for (let m = 0; m < re.length; m++) {
                    dv.setFloat32(m * 4, re[m]);
                }
            }
            exp.postOnly("meteo-stream/upload/" + this.meteoSourceIndex + "-" + this.scheduleTime + "-" + this.forecastTime + "-" + this.meteoTypeIndex + "-" + this.meteoPrecision + "-" + this.tag + ".do", re).then(value => {
                resolve(true);
            }).catch(reason => {
                reject(reason);
            });
        });

    }

    // 判断前台TypedArray是否是小字节序
    littleEndian(): boolean {
        const buffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, 256, true);
        return new Int16Array(buffer)[0] === 256;
    }

    // region getter/setter


    get historyData(): Array<HistoricalDataInterface> {
        return this._historyData;
    }

    set historyData(value: Array<HistoricalDataInterface>) {
        this._historyData = value;
    }

    get currentStep(): number {
        return this._currentStep;
    }

    set currentStep(value: number) {
        this._currentStep = value;
    }

    get currentLonFrom(): number {
        return this._currentLonFrom;
    }

    set currentLonFrom(value: number) {
        this._currentLonFrom = value;
    }

    get currentLonTo(): number {
        return this._currentLonTo;
    }

    set currentLonTo(value: number) {
        this._currentLonTo = value;
    }

    get currentLatFrom(): number {
        return this._currentLatFrom;
    }

    set currentLatFrom(value: number) {
        this._currentLatFrom = value;
    }

    get currentLatTo(): number {
        return this._currentLatTo;
    }

    set currentLatTo(value: number) {
        this._currentLatTo = value;
    }

    get meteoSourceConfiguration(): MeteoSourceConfigurationInterface {
        return this._meteoSourceConfiguration;
    }

    set meteoSourceConfiguration(value: MeteoSourceConfigurationInterface) {
        this._meteoSourceConfiguration = value;
    }

    get tag(): number {
        return this._tag;
    }

    set tag(value: number) {
        this._tag = value;
    }


    get temporaryData(): Float32Array | null {
        return this._temporaryData;
    }

    set temporaryData(value: Float32Array | null) {
        this._temporaryData = value;
    }

    get scheduleTime(): number {
        return this._scheduleTime;
    }

    set scheduleTime(value: number) {
        this._scheduleTime = value;
    }


    get forecastTime(): number {
        return this._forecastTime;
    }

    set forecastTime(value: number) {
        this._forecastTime = value;
    }

    get meteoSourceIndex(): MeteoSourceIndex {
        return this._meteoSourceIndex;
    }

    set meteoSourceIndex(value: MeteoSourceIndex) {
        this._meteoSourceIndex = value;
    }

    get meteoTypeIndex(): MeteoTypeIndex {
        return this._meteoTypeIndex;
    }

    set meteoTypeIndex(value: MeteoTypeIndex) {
        this._meteoTypeIndex = value;
    }

    get meteoPrecision(): GfsPrecision | MaritimePrecision | HycomPrecision | WwPrecision | TestPrecision {
        return this._meteoPrecision;
    }

    set meteoPrecision(value: GfsPrecision | MaritimePrecision | HycomPrecision | WwPrecision | TestPrecision) {
        this._meteoPrecision = value;
    }

    // endregion
}

// endregion

