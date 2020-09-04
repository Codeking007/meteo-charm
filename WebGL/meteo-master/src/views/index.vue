<template>
    <div class="app-main">
        <div id="map"></div>
        <canvas id="isolineText"></canvas>
        <label class="ui_button ui_button_primary btn-control2" for="xFile">上传文件</label>
        <form><input type="file" id="xFile" name="file1" style="position:absolute;clip:rect(0 0 0 0);" @change="file2Xce($event)"></form>
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import mapboxgl, {Layer, LngLatLike} from "mapbox-gl";
    import 'mapbox-gl/dist/mapbox-gl.css';
    import MapUtil from "@/util/map";
    import {Mgl} from "@/util/meteo/mgl/grid/3d";
    import {MglLine} from "@/util/meteo/mgl/grid/3d_1";
    import {Shade} from "@/util/meteo/shade/grid/3d";
    import {CustomLayerShade} from "@/util/meteo/shade/grid/customlayer";
    import {Bar} from "@/util/meteo/bar/grid/3d";
    import {CustomlayerBar} from "@/util/meteo/bar/grid/customlayer";
    import {TileBar} from "@/util/meteo/bar/grid/tile";
    import {Isoline} from "@/util/meteo/isoline/grid/3d";
    /*import {
        GfsPrecision, HycomPrecision,
        MaritimePrecision,
        MeteoSourceIndex,
        MeteoStream,
        MeteoTypeIndex,
        TestPrecision, WwPrecision
    } from "@/util/file-stream/tool";
    import {exp, extendHttp, meteoHttp, fileStreamHttp, testHttp} from "@/util/http"
    import {
        MeteoTypeColorConfiguration,
        MeteoTypeConfiguration,
        MeteoTypeConfigurationInterface,
    } from "@/util/meteo/thor-meteo/meteo";
    import {CustomLayerShade} from "@/util/meteo/thor-meteo/shade/grid/customlayer";
    import {Mgl} from "@/util/meteo/thor-meteo/mgl/grid/3d";
    import {TileBar} from "@/util/meteo/thor-meteo/bar/grid/tile";
    import {Isoline} from "@/util/meteo/thor-meteo/isoline/grid/3d";
    import {NonGridCustomLayerShade} from "@/util/meteo/thor-meteo/shade/non-grid/customlayer";
    import {NonGridTileIceDrift} from "@/util/meteo/thor-meteo/bar/non-grid/tile";
    import {WebGL} from "@/util/meteo/gl";*/
    import {windyData} from "@/util/meteo/isoline/windy/data";
    import {meteoinfodata} from "@/util/meteo/isoline/meteoinfo/data";
    import {PolyLine} from "@/util/meteo/isoline/meteoinfo/global/PolyLine";
    import {PointD} from "@/util/meteo/isoline/meteoinfo/global/PointD";
    import {Contour} from "@/util/meteo/isoline/meteoinfo/contour";
    import {exp, fileStreamHttp} from "@/util/http";
    import axios, {AxiosInstance} from "axios";
    import S2CJson from "@/util/http/S2CJson";

    let map = new MapUtil();
    export default Vue.extend({
        name: 'meteo-master',
        components: {},
        data() {
            return {};
        },
        watch: {},
        computed: {},
        mounted() {
            // fixme:方案一：先用经纬度点算控制点，再把所有点转换成像素值，最后用canvas2d的贝塞尔曲线画等值线
            // this.bezierCurveTest();
            // fixme:meteoinfo的等值线平滑,用的windy的数据
            // this.meteoinfosmoothTest();
            // fixme:meteoinfo的等值线平滑,用的meteoinfo的数据
            // this.meteoinfosmoothTest1();


            // this.thorMeteoTest();
            /*const re = new Float32Array(35);
            const dv = new DataView(re.buffer);
            for (let m = 0; m < re.length; m++) {
                dv.setFloat32(m * 4, m);
            }
            exp.postOnly("meteo-stream/post-meteo-stream.do", re).then(value => {

            });*/
            debugger
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.GFS, 19070112, 19070113, MeteoTypeIndex.PRMSL, GfsPrecision.L1, 0);
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.GFS, 19070112, 19070113, MeteoTypeIndex.PRMSL, GfsPrecision.L2, 0);
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.GFS, 19070112, 19070113, MeteoTypeIndex.PRMSL, GfsPrecision.L3, 0);
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.MARITIME, 19070112, 19070115, MeteoTypeIndex.SHCW, MaritimePrecision.L1, 0);
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.MARITIME, 19070112, 19070115, MeteoTypeIndex.SHCW, MaritimePrecision.L2, 0);
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.MARITIME, 19070112, 19070115, MeteoTypeIndex.SHCW, MaritimePrecision.L3, 0);
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.HYCOM, 19070100, 19070103, MeteoTypeIndex.US, HycomPrecision.L1, 0);
            // let meteoStream1 = new MeteoStream(MeteoSourceIndex.HYCOM, 19070100, 19070103, MeteoTypeIndex.US, HycomPrecision.L2, 0);
            /*let meteoStream1 = new MeteoStream(MeteoSourceIndex.SHH_WW, 19070200, 19070206, MeteoTypeIndex.US, WwPrecision.L1, 0);
            meteoStream1.loadFileData().then(() => {
                console.log(meteoStream1.historyData)
                debugger
            });*/
            /*let meteoStream2 = new MeteoStream(MeteoSourceIndex.GFS, 0, 0, MeteoTypeIndex.GUST, TestPrecision.L1, 0);
            meteoStream2.loadFileData().then(() => {
                // currentStep==1-2==历史数据索引==>0-1== （5,5）= （9,5），（8,8）=（16,8）
                let data: Float32Array = meteoStream2.getData();
                data[5] = 5;
                data[8] = 8;
                meteoStream2.setData(data);
                // currentStep==2-3==历史数据索引==>1-2== （7,7）=（11,7），（14,14）=（24,14）
                data = meteoStream2.getData();
                data[7] = 7;
                data[14] = 14;
                meteoStream2.setData(data);
                // currentStep==3-4==历史数据索引==>2-3== （7,8）=（7,8），（14,4）=（14,4）
                data = meteoStream2.getData();
                data[7] = 8;
                data[14] = 4;
                meteoStream2.setData(data);
                // currentStep==4-5==历史数据索引==>3-4== （13,3）=（13,3），（33,3）=（33,3）
                data = meteoStream2.getData();
                data[13] = 3;
                data[33] = 3;
                meteoStream2.setData(data);
                // currentStep==5-6==历史数据索引==>4-5== （3,4）= （7,4），（6,41）=（14,41）
                data = meteoStream2.getData();
                data[3] = 4;
                data[6] = 41;
                meteoStream2.setData(data);
                // currentStep==6==临时保存数据
                data[1] = -1;
                data[2] = -2;
                meteoStream2.setTemporaryData(data);
                // 返回一步==>currentStep==6-5
                let backStep = meteoStream2.getBackwardStep();
                let foreStep = meteoStream2.getForewardStep();
                data = meteoStream2.goBackward(1);
                // 前进一步==>currentStep==5-6==获得临时数据
                backStep = meteoStream2.getBackwardStep();
                foreStep = meteoStream2.getForewardStep();
                data = meteoStream2.goForeward(1);
                // currentStep==6-7==历史数据索引==>5-6== （1,-1）=（1,-1），（2,-2）=（2,-2）
                meteoStream2.setData(data);
                // 返回两步==>currentStep==7-5
                backStep = meteoStream2.getBackwardStep();
                foreStep = meteoStream2.getForewardStep();
                data = meteoStream2.goBackward(2);
                // 返回一步==>currentStep==5-4
                backStep = meteoStream2.getBackwardStep();
                foreStep = meteoStream2.getForewardStep();
                data = meteoStream2.goBackward(1);
                // 前进一步==>currentStep==4-5
                backStep = meteoStream2.getBackwardStep();
                foreStep = meteoStream2.getForewardStep();
                data = meteoStream2.goForeward(1);
                // 返回两步==>currentStep==5-3 ++ 历史数据索引==>6-7== （3,888）= （7,888），（4,777）=（8,777）
                data = meteoStream2.goBackward(2);
                // currentStep==3-8==历史数据索引==>3-7== （3,888）= （7,888），（4,777）=（8,777）
                data[3] = 888;
                data[4] = 777;
                meteoStream2.setData(data);

                meteoStream2.saveFileData(1);
            });*/

            /*let meteoStream1 = new MeteoStream1(MeteoSourceIndex.TEST, 0, 0, MeteoTypeIndex.GUST, TestPrecision.L1, 0);
            meteoStream1.loadFileData().then(() => {
                // currentStep==1-2==历史数据索引==>0-1== （5,5）= （9,5），（8,8）=（16,8）
                let data: Float32Array = meteoStream1.getData(-1.25, -0.25, -0.75, 0);
                data[5] = 5;
                data[8] = 8;
                meteoStream1.setData(data);
                // currentStep==2-3==历史数据索引==>1-2== （7,7）=（11,7），（14,14）=（24,14）
                data = meteoStream1.getData(-1.0, 0.5, -1.0, 0.5);
                data[7] = 7;
                data[14] = 14;
                meteoStream1.setData(data);
                // currentStep==3-4==历史数据索引==>2-3== （7,8）=（7,8），（14,4）=（14,4）
                data = meteoStream1.getData(-1.5, 1.5, -1.0, 1.0);
                data[7] = 8;
                data[14] = 4;
                meteoStream1.setData(data);
                // currentStep==4-5==历史数据索引==>3-4== （13,3）=（13,3），（33,3）=（33,3）
                data = meteoStream1.getData(-1.5, 1.5, -1.0, 1.0);
                data[13] = 3;
                data[33] = 3;
                meteoStream1.setData(data);
                // currentStep==5-6==历史数据索引==>4-5== （3,4）= （7,4），（6,41）=（14,41）
                data = meteoStream1.getData(-1.25, -0.25, -0.75, 0);
                data[3] = 4;
                data[6] = 41;
                meteoStream1.setData(data);
                // currentStep==6==临时保存数据
                data[1] = -1;
                data[2] = -2;
                meteoStream1.setTemporaryData(data);
                // 返回一步==>currentStep==6-5
                let backStep = meteoStream1.getBackwardStep();
                let foreStep = meteoStream1.getForewardStep();
                data = meteoStream1.goBackward(1);
                // 前进一步==>currentStep==5-6==获得临时数据
                backStep = meteoStream1.getBackwardStep();
                foreStep = meteoStream1.getForewardStep();
                data = meteoStream1.goForeward(1);
                // currentStep==6-7==历史数据索引==>5-6== （1,-1）=（1,-1），（2,-2）=（2,-2）
                meteoStream1.setData(data);
                // 返回两步==>currentStep==7-5
                backStep = meteoStream1.getBackwardStep();
                foreStep = meteoStream1.getForewardStep();
                data = meteoStream1.goBackward(2);
                // 返回一步==>currentStep==5-4
                backStep = meteoStream1.getBackwardStep();
                foreStep = meteoStream1.getForewardStep();
                data = meteoStream1.goBackward(1);
                // 前进一步==>currentStep==4-5
                backStep = meteoStream1.getBackwardStep();
                foreStep = meteoStream1.getForewardStep();
                data = meteoStream1.goForeward(1);
                // 返回两步==>currentStep==5-3 ++ 历史数据索引==>6-7== （3,888）= （7,888），（4,777）=（8,777）
                data = meteoStream1.goBackward(2);
                // currentStep==3-8==历史数据索引==>3-7== （3,888）= （7,888），（4,777）=（8,777）
                data[3] = 888;
                data[4] = 777;
                meteoStream1.setData(data);

                meteoStream1.saveFileData(1);
            });*/

            // todo:要取的经纬度位置
            let lon = 52.4645631;
            let lat = 71.31653;
            fileStreamHttp.get("testArrayBuffer", null).then((data: Float32Array) => {
                console.log("第一次的Float32Array");
                console.log(data);
                console.log(data.buffer);
                console.log("第一次得到的数据==>" + this.getArrayBufferData(data, lon, lat));

                /*const re = new Float32Array(data);
                const dv = new DataView(re.buffer);
                for (let m = 0; m < re.length; m++) {
                    dv.setFloat32(m * 4, re[m]);
                }
                exp.postOnly("meteo-stream/post-meteo-stream.do", re).then(value => {

                });*/
            });

            /*fileStreamHttp.get("postMeteoStream.txt", null).then((data1: Float32Array) => {
                console.log("第二次的Float32Array");
                console.log(data1);
                console.log(data1.buffer);
                console.log("第二次得到的数据==>" + this.getArrayBufferData(data1, lon, lat));
            });*/


            map.initMapbox("map");

            const cWuv = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
                [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];
            const urlWuv = "img/meteo/data/gfs/wuv/25/19110709.png";
            const cSs = [[0, [37, 74, 255, 1]], [.02, [0, 100, 254, 1]], [.06, [0, 200, 254, 1]], [.1, [37, 193, 146, 1]], [.15, [0, 230, 0, 1]],
                [.2, [0, 250, 0, 1]], [.3, [254, 225, 0, 1]], [.4, [254, 174, 0, 1]], [.5, [220, 74, 29, 1]], [.6, [180, 0, 50, 1]], [.7, [254, 0, 150, 1]], [.8, [151, 50, 222, 1]], [.85, [86, 54, 222, 1]], [.9, [42, 132, 222, 1]], [1, [64, 199, 222, 1]], [1.5, [255, 255, 255, 1]]];
            const urlSs = "img/meteo/data/noaa/ss/40/19110709.png";

            const cAt0 = [[48000, [0, 0, 255, 1]], [92000, [152, 189, 197, 1]],
                [96000, [142, 179, 187, 1]], [99000, [142, 179, 184, 1]],
                [100000, [71, 168, 167, 1]], [101000, [51, 98, 139, 1]],
                [102000, [157, 151, 60, 1]], [103000, [97, 61, 81, 1]],
                [105000, [95, 60, 81, 1]]];
            const urlAt0 = "img/meteo/data/gfs/at0/25/19110709.png";

            // region fixme:米cap4的json等格点数据测试
            /*let c = [
                [0, [0, 153, 255, 1]],
                [1.6, [0, 103, 255, 1]],
                [3.4, [47, 153, 0, 1]],
                [5.5, [38, 255, 0, 1]],
                [8.0, [210, 254, 9, 1]],
                [10.8, [252, 254, 0, 1]],
                [13.9, [243, 212, 47, 1]],
                [17.2, [251, 155, 3, 1]],
                [20.8, [222, 196, 195, 1]],
                [24.5, [204, 149, 145, 1]],
                [28.5, [144, 75, 69, 1]],
                [32.7, [255, 51, 51, 1]],
                [37.0, [210, 57, 58, 1]],
                [41.5, [178, 55, 55, 1]],
                [46.2, [178, 51, 178, 1]],
                [51.0, [222, 55, 225, 1]],
                [56.1, [242, 55, 225, 1]],
            ];
            /!* c = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
                 [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];
             *!/
            let shade = new Shade(map.map);
            shade.setColor(c);
            shade.show();

            const color = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
                [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];
            let mgl = new Mgl(map.map);
            mgl.setColor(color);

            testHttp.get("wind.json").then((windData) => {
                let re: any = {};
                re["lat"] = [Math.min(windData[0].header.la1, windData[0].header.la2), Math.max(windData[0].header.la1, windData[0].header.la2), windData[0].header.dx];
                re["lon"] = [Math.min(windData[0].header.lo1, windData[0].header.lo2), Math.max(windData[0].header.lo1, windData[0].header.lo2), windData[0].header.dy];
                re["height"] = (re.lat[1] - re.lat[0]) / re.lat[2] + 1;
                re["width"] = (re.lon[1] - re.lon[0]) / re.lon[2] + 1;
                re["minAndMax"] = [[Infinity, -Infinity], [Infinity, -Infinity]];
                for (let i = 0; i < re.height * re.width; i++) {
                    for (let index = 0; index < windData.length; index++) {
                        let data = windData[index].data[i];
                        let invalidNumLength = data.toString().split("9").length - 1;
                        if (invalidNumLength >= 4 && (Math.pow(10, invalidNumLength) - 1 == data)) {
                            continue;
                        }
                        if (re.minAndMax[index][1] < data) {
                            re.minAndMax[index][1] = data;
                        }
                        if (re.minAndMax[index][0] > data) {
                            re.minAndMax[index][0] = data;
                        }
                    }
                }
                re["data"] = new Uint8Array(re.height * re.width * 4);
                for (let i = 0; i < re.data.length; i += 4) {
                    let row = Math.floor(i / 4 / re.width);
                    let column = Math.floor(i / 4 % re.width);
                    if (re.lat[0] != windData[0].header.la1) {
                        row = re.height - 1 - row;
                    }
                    if (re.lon[0] != windData[0].header.lo1) {
                        column = re.width - 1 - column;
                    }
                    re.data[i + 3] = 255;   // fixme:255代表是有效数据，不加的话画不出来，因为GLSL判断了
                    for (let index = 0; index < windData.length; index++) {
                        re.data[i + index] = Math.floor((windData[index].data[row * re.width + column] - re.minAndMax[index][0]) / (re.minAndMax[index][1] - re.minAndMax[index][0]) * 254);
                    }
                }
                shade.loadMeteo(re, {computeAsVector: [windData.length >= 1, windData.length >= 2]}, null);
                mgl.loadMeteo(re, {
                    params: {
                        fadeOpacity: 0.996,
                        speedFactor: 6.0,
                        dropRate: 0.003,
                        dropRateBump: 0.01,
                        particlesRadix: 32
                    }
                }, null);
                mgl.show(false);
            });*/
            // endregion

            // region fixme:shade
            let shade = new Shade(map.map);
            shade.setColor(cAt0);
            shade.show();
            shade.load(urlAt0).then((meteo:any) => {
                shade.loadMeteo(meteo, {computeAsVector: [false, false]}, null);
            });

            /*let shadeLayer:any=new CustomLayerShade(map.map, "customLayer1");
            map.map.on('load', () => {
                map.map.addLayer(shadeLayer);
                shadeLayer.setColor(cAt0);
                shadeLayer.show();
                shadeLayer.load(urlAt0).then((meteo:any) => {
                    shadeLayer.loadMeteo(meteo, {computeAsVector: [false, false]}, null);
                });
            });*/
            // endregion

            // region fixme:mgl
            /*const mgl = new Mgl(map.map).setColor(cWuv);
            mgl.load(urlWuv).then((meteo:any)=>{
                mgl.loadMeteo(meteo, {params: {fadeOpacity:0.996,speedFactor:6.0,dropRate:0.003,dropRateBump:0.01,particlesRadix:64}}, null);
                mgl.show(false);
            });*/
            /*const mgl = new MglLine(map.map).setColor(cWuv);
            mgl.load(urlWuv).then((meteo: any) => {
                // mgl.loadMeteo(meteo, {params: {fadeOpacity:0.966,speedFactor:6.0,dropRate:0.01,dropRateBump:0.01,particlesRadix:128}}, null);
                mgl.loadMeteo(meteo,
                    {
                        params: {
                            fadeOpacity: 0.99,
                            speedFactor: 5.0,
                            dropRate: 0.01,
                            dropRateBump: 0.01,
                            particlesRadix: 128
                        }
                    }, null);
                mgl.show(false);
            });*/
            /*const mgl = new MglLine(map.map).setColor(cSs);
            mgl.load(urlSs).then((meteo:any)=>{
                mgl.loadMeteo(meteo, {params: {fadeOpacity:0.966,speedFactor:100.0,dropRate:0.03,dropRateBump:0.01,particlesRadix:128}}, null);
                mgl.show(false);
            });*/
            // endregion

            // region fixme:bar
            /*const bar = new Bar(map.map);
            bar.setColor([]);
            bar.show();
            bar.load(urlWuv).then((meteo: any) => {
                bar.loadMeteo(meteo, null, null);
            });*/

            /*map.map.on('load', () => {
                const tileBar = new TileBar(map.map);
                tileBar.setColor([]);
                tileBar.show();
                tileBar.load(urlWuv).then((meteo: any) => {
                    tileBar.loadMeteo(meteo, null, null);
                });
            });

            const barLayer = new CustomlayerBar(map.map);
            barLayer.setColor([]);
            barLayer.show();
            barLayer.load(urlWuv).then((meteo: any) => {
                barLayer.loadMeteo(meteo, null, null);
            });*/
            // endregion

            // region fixme:isoline
            /*let isoline = new Isoline(map.map);
            isoline.load(urlAt0).then((meteo: any) => {
                isoline.loadMeteo(meteo, {isoline: {
                        delta: function (zoom:any) {
                            if (zoom > 3 || zoom == null) {
                                return 200;
                            } else {
                                return 400;
                            }
                        },             // 等值线间距
                        dataFormat: function (data:any) {
                            return Math.round(data / 100);
                        },    // 值的格式处理
                    },computeAsVector: [true, false, false],}, 25);
                isoline.show();
            });*/
            // endregion

        },
        methods: {
            getArrayBufferData(data: Float32Array, lon: number, lat: number): number {
                let lonConfig = [-180, 180, 0.25];
                let latConfig = [-90, 90, 0.25];
                let lonIndex = Math.floor((lon - lonConfig[0]) / lonConfig[2]);
                let latIndex = Math.floor((lat - latConfig[0]) / latConfig[2]);
                let dataIndex = latIndex * ((lonConfig[1] - lonConfig[0]) / lonConfig[2] + 1) + lonIndex;
                return data[dataIndex];
            },
            // 项气象制作平台thor用的气象文件测试
            thorMeteoTest() {
                debugger
                map.initMapbox("map");

                const cWuv = [[0, [37, 74, 255, 1]], [4, [0, 99, 254, 1]], [7, [0, 198, 254, 1]], [10, [36, 193, 147, 1]], [13, [0, 229, 1, 1]], [17, [0, 249, 0, 1]],
                    [20, [252, 225, 0, 1]], [23, [254, 174, 0, 1]], [27, [220, 74, 28, 1]], [30, [180, 0, 49, 1]], [33, [253, 0, 149, 1]], [35, [255, 0, 0, 1]]];
                const urlWuv = "http://weather.unmeteo.com/tiles/meteo/gfs/wuv/25/18073000.png?time=18073008";

                const cAt0 = [[48000, [0, 0, 255, 1]], [92000, [152, 189, 197, 1]],
                    [96000, [142, 179, 187, 1]], [99000, [142, 179, 184, 1]], [100000, [71, 168, 167, 1]], [101000, [51, 98, 139, 1]],
                    [102000, [157, 151, 60, 1]], [103000, [97, 61, 81, 1]],
                    [105000, [95, 60, 81, 1]]];
                const urlAt0 = "http://weather.unmeteo.com/tiles/meteo/gfs/at0/25/18073000.png?time=18073008";

                // region fixme:热力图
                // (1)等格点自定义层
                // let shadeLayer: any = new CustomLayerShade(map.map, "customLayer1");
                /*let meteoTypeConfigurationInterface: MeteoTypeConfigurationInterface = MeteoTypeConfiguration.GFS_PRMSL;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.At);
                    shadeLayer.show();
                    shadeLayer.load("19061408", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    });
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.GFS_UVGRD;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.W);
                    shadeLayer.show();
                    shadeLayer.load("19061408", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    });
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.HYCOM_UVS;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.Ss);
                    shadeLayer.show();
                    shadeLayer.load("19042609", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "customLayer1");
                        }
                    });
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.SHH_WW_UVGRD;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.W);
                    shadeLayer.show();
                    shadeLayer.load("19042521", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "customLayer1");
                        }
                    });
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.SHH_WW_WAS;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.Cwh);
                    shadeLayer.show();
                    shadeLayer.load("19042521", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "customLayer1");
                        }
                    });
                });*/
                /*let meteoTypeConfigurationInterface = MeteoTypeConfiguration.EC_C1D_UVGRD;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.W);
                    shadeLayer.show();
                    shadeLayer.load("19071104", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "customLayer1");
                        }
                    });
                });*/
                /*let meteoTypeConfigurationInterface = MeteoTypeConfiguration.EC_C1D_PRMSL;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.At_hpa);
                    shadeLayer.show();
                    shadeLayer.load("19071104", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "customLayer1");
                        }
                    });
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.EC_C2P_WAS;
                map.map.on('load', () => {
                    map.map.addLayer(shadeLayer);
                    shadeLayer.setColor(MeteoTypeColorConfiguration.Cwh);
                    shadeLayer.show();
                    shadeLayer.load("19070704", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        shadeLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "customLayer1");
                        }
                    });
                });*/

                // (2)非等格点自定义层
                /*let nonGridCustomLayer: any = new NonGridCustomLayerShade(map.map, "non-grid-customLayer1");
                let meteoTypeConfigurationInterface: MeteoTypeConfigurationInterface = MeteoTypeConfiguration.ICE_CONC;
                map.map.on('load', () => {
                    map.map.addLayer(nonGridCustomLayer);
                    nonGridCustomLayer.setColor(MeteoTypeColorConfiguration.Ice_conc);
                    nonGridCustomLayer.show();
                    nonGridCustomLayer.load("19072612", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        nonGridCustomLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("non-grid-customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "non-grid-customLayer1");
                        }
                    });
                });*/
                /*let meteoTypeConfigurationInterface: MeteoTypeConfigurationInterface = MeteoTypeConfiguration.ICE_TYPE;
                map.map.on('load', () => {
                    map.map.addLayer(nonGridCustomLayer);
                    nonGridCustomLayer.setColor(MeteoTypeColorConfiguration.Ice_type, WebGL.colorTypes[1]);
                    nonGridCustomLayer.show();
                    nonGridCustomLayer.load("19072412", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        nonGridCustomLayer.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("non-grid-customLayer1", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "non-grid-customLayer1");
                        }
                    });
                });*/
                // endregion

                // region fixme:流线
                // (1)等格点流线
                // const mgl = new Mgl(map.map);
                /*let meteoTypeConfigurationInterface = MeteoTypeConfiguration.GFS_UVGRD;
                mgl.setColor(MeteoTypeColorConfiguration.W);
                mgl.load("19061408", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                    mgl.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    mgl.show(false);
                    if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                        mgl.setZIndex("-1");
                    } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                        mgl.setZIndex("0");
                    }
                });*/
                /*let meteoTypeConfigurationInterface = MeteoTypeConfiguration.HYCOM_UVS;
                mgl.setColor(MeteoTypeColorConfiguration.Ss);
                mgl.load("19042609", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                    mgl.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    mgl.show(false);
                    if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                        mgl.setZIndex("-1");
                    } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                        mgl.setZIndex("0");
                    }
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.SHH_WW_UVGRD;
                mgl.setColor(MeteoTypeColorConfiguration.W);
                mgl.load("19042521", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo:any)=>{
                    mgl.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    mgl.show(false);
                    if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                        mgl.setZIndex("-1");
                    } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                        mgl.setZIndex("0");
                    }
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.EC_C1D_UVGRD;
                mgl.setColor(MeteoTypeColorConfiguration.W);
                mgl.load("19071104", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo:any)=>{
                    mgl.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    mgl.show(false);
                    if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                        mgl.setZIndex("-1");
                    } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                        mgl.setZIndex("0");
                    }
                });*/
                // endregion

                // region fixme:风杆
                // (1)等格点风杆
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.GFS_UVGRD;
                map.map.on('load', () => {
                    const tileBar = new TileBar(map.map);
                    tileBar.setColor([]);
                    tileBar.show();
                    tileBar.load("19061408", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        tileBar.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    });
                });*/
                // todo:MeteoTypeConfiguration.SHH_WW_UVGRD==>上海的风数据没有陆地风，风杆显示错误==>第一步没取中间点而是左上角点，所以出问题了
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.SHH_WW_UVGRD;
                map.map.on('load', () => {
                    const tileBar = new TileBar(map.map);
                    tileBar.setColor([]);
                    tileBar.show();
                    tileBar.load("19042521", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        tileBar.loadMeteo(meteo, meteoTypeConfigurationInterface);
                        if (meteoTypeConfigurationInterface.underMap) {    // 被地图覆盖
                            map.map.moveLayer("windBarLayer", "unimet");
                        } else {                                                                      // 不被地图覆盖eteoOptions.DISPLAY_TYPE.shade || displayType === MeteoOptions.DISPLAY_TYPE.shade1) {
                            map.map.moveLayer("unimet", "windBarLayer");
                        }
                    });
                });*/
                /*meteoTypeConfigurationInterface = MeteoTypeConfiguration.EC_C1D_UVGRD;
                map.map.on('load', () => {
                    const tileBar = new TileBar(map.map);
                    tileBar.setColor([]);
                    tileBar.show();
                    tileBar.load("19071104", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        tileBar.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    });
                });*/

                // (2)海冰移向
                /*let meteoTypeConfigurationInterface = MeteoTypeConfiguration.ICE_DRIFT;
                map.map.on('load', () => {
                    const tileBar = new NonGridTileIceDrift(map.map);
                    tileBar.setColor([]);
                    tileBar.show();
                    tileBar.load("19072412", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                        tileBar.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    });
                });*/
                // endregion

                // region fixme:等值线
                // (1)等格点等值线
                // let isoline = new Isoline(map.map);
                /*let meteoTypeConfigurationInterface1: MeteoTypeConfigurationInterface = MeteoTypeConfiguration.GFS_PRMSL;
                isoline.load("19061408", meteoTypeConfigurationInterface1, meteoTypeConfigurationInterface1.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                    isoline.loadMeteo(meteo, meteoTypeConfigurationInterface1);
                    isoline.show();
                });*/
                /*// let meteoTypeConfigurationInterface: MeteoTypeConfigurationInterface = MeteoTypeConfiguration.EC_C1D_PRMSL;
                isoline.load("19071104", meteoTypeConfigurationInterface, meteoTypeConfigurationInterface.meteoSourceConfiguration[0].meteoSourcePrecision.L1).then((meteo: any) => {
                    isoline.loadMeteo(meteo, meteoTypeConfigurationInterface);
                    isoline.show();
                });*/

                // endregion

                // endregion
            },
            // region fixme:方案一：先用经纬度点算控制点，再把所有点转换成像素值，最后用canvas2d的贝塞尔曲线画等值线
            bezierCurveTest() {
                let allBezierCurvePoints: Array<Array<Array<number>>> = new Array<Array<Array<number>>>();
                map.initMapbox("map");
                map.map.on("load", () => {
                    // fixme:方案一：先用经纬度算贝塞尔曲线控制点，然后再通过mapbox转换为像素点
                    // fixme：先对经纬度进行处理，先让经度在-180~180°之间，然后让每条等值线的经度能在界面显示中连续，防止mapbox显示路线时把点从179画到-179了，理想情况应该是从179画到181的
                    for (let i = 0; i < windyData.isoline.length; i++) {
                        let isoline = windyData.isoline[i];
                        for (let j = 0; j < isoline.points.length; j += 2) {
                            isoline.points[j + 1] = this.formatTo180(isoline.points[j + 1]);
                        }
                        this.translateGivenDataForShowOfMapbox(isoline.points);
                    }
                    for (let i = 0; i < windyData.isoline.length; i++) {
                        let isoline = windyData.isoline[i];
                        let bezierCurvePoints: Array<Array<number>> = this.getBezierCurveControlPoint(isoline.points);
                        allBezierCurvePoints.push(bezierCurvePoints);
                    }
                    this.drawBezierCurve(allBezierCurvePoints);
                });
                map.map.on('move', (e: any) => {
                    this.drawBezierCurve(allBezierCurvePoints);
                });
            },
            getBezierCurveControlPoint(isolinePoints: Array<number>): Array<Array<number>> {
                let outputPoints: Array<Array<number>> = new Array<Array<number>>();
                let a = 0.25, b = 0.25;
                if (isolinePoints[1] !== isolinePoints[isolinePoints.length - 1]) {     // 如果经过经纬度换算后，首尾点的经度已经不相等了，即首尾点不在同个-180~180的地图范围内了，而是一个在-180~180，一个在180~540范围的地图上
                    let validIsolinePointsLength = isolinePoints.length - 2;    // 首尾端点是一样的，所以length - 2
                    for (let i = 0; i < isolinePoints.length; i += 2) {
                        let previousPoint: number[] = [];
                        let startPoint: number[] = [];
                        let endPoint: number[] = [];
                        let nextPoint: number[] = [];
                        if (i == 0) {
                            outputPoints.push([isolinePoints[i + 1], isolinePoints[i]]);
                            continue;
                        } else if (i == 2) {
                            if (isolinePoints[isolinePoints.length - 1] > isolinePoints[1]) {   // 如果等值线是往右贯穿画的
                                previousPoint = [isolinePoints[((i + 1 - 4) + validIsolinePointsLength) % validIsolinePointsLength] - 360.0, isolinePoints[((i - 4) + validIsolinePointsLength) % validIsolinePointsLength]];
                                startPoint = [isolinePoints[i + 1 - 2], isolinePoints[i - 2]];
                                endPoint = [isolinePoints[i + 1], isolinePoints[i]];
                                nextPoint = [isolinePoints[i + 1 + 2], isolinePoints[i + 2]];
                            } else if (isolinePoints[isolinePoints.length - 1] < isolinePoints[1]) {   // 如果等值线是往左贯穿画的
                                previousPoint = [isolinePoints[((i + 1 - 4) + validIsolinePointsLength) % validIsolinePointsLength] + 360.0, isolinePoints[((i - 4) + validIsolinePointsLength) % validIsolinePointsLength]];
                                startPoint = [isolinePoints[i + 1 - 2], isolinePoints[i - 2]];
                                endPoint = [isolinePoints[i + 1], isolinePoints[i]];
                                nextPoint = [isolinePoints[i + 1 + 2], isolinePoints[i + 2]];
                            }
                        } else if (i == isolinePoints.length - 2) {
                            if (isolinePoints[isolinePoints.length - 1] > isolinePoints[1]) {   // 如果等值线是往右贯穿画的
                                previousPoint = [isolinePoints[i + 1 - 4], isolinePoints[i - 4]];
                                startPoint = [isolinePoints[i + 1 - 2], isolinePoints[i - 2]];
                                endPoint = [isolinePoints[i + 1], isolinePoints[i]];
                                nextPoint = [isolinePoints[((i + 1 + 2) + validIsolinePointsLength) % validIsolinePointsLength] + 360.0, isolinePoints[((i + 2) + validIsolinePointsLength) % validIsolinePointsLength]];
                            } else if (isolinePoints[isolinePoints.length - 1] < isolinePoints[1]) {   // 如果等值线是往左贯穿画的
                                previousPoint = [isolinePoints[i + 1 - 4], isolinePoints[i - 4]];
                                startPoint = [isolinePoints[i + 1 - 2], isolinePoints[i - 2]];
                                endPoint = [isolinePoints[i + 1], isolinePoints[i]];
                                nextPoint = [isolinePoints[((i + 1 + 2) + validIsolinePointsLength) % validIsolinePointsLength] - 360.0, isolinePoints[((i + 2) + validIsolinePointsLength) % validIsolinePointsLength]];
                            }
                        } else {
                            previousPoint = [isolinePoints[i + 1 - 4], isolinePoints[i - 4]];
                            startPoint = [isolinePoints[i + 1 - 2], isolinePoints[i - 2]];
                            endPoint = [isolinePoints[i + 1], isolinePoints[i]];
                            nextPoint = [isolinePoints[i + 1 + 2], isolinePoints[i + 2]];
                        }
                        let controlPointA = [startPoint[0] + a * (endPoint[0] - previousPoint[0]), startPoint[1] + a * (endPoint[1] - previousPoint[1])];
                        let controlPointB = [endPoint[0] - b * (nextPoint[0] - startPoint[0]), endPoint[1] - b * (nextPoint[1] - startPoint[1])];
                        outputPoints.push(controlPointA, controlPointB, endPoint);
                    }
                } else {  // 如果经过经纬度换算后，首尾点的经度还是相等的，即首尾点在同个-180~180的地图范围内了，而不是一个在-180~180，一个在180~540范围的地图上
                    let validIsolinePointsLength = isolinePoints.length - 2;    // 首尾端点是一样的，所以length - 2
                    for (let j = 0; j < validIsolinePointsLength; j += 2) {
                        let previousPoint = [isolinePoints[((j + 1 - 2) + validIsolinePointsLength) % validIsolinePointsLength], isolinePoints[((j - 2) + validIsolinePointsLength) % validIsolinePointsLength]];
                        let startPoint = [isolinePoints[j + 1], isolinePoints[j]];
                        let endPoint = [isolinePoints[((j + 1 + 2) + validIsolinePointsLength) % validIsolinePointsLength], isolinePoints[((j + 2) + validIsolinePointsLength) % validIsolinePointsLength]];
                        let nextPoint = [isolinePoints[((j + 1 + 4) + validIsolinePointsLength) % validIsolinePointsLength], isolinePoints[((j + 4) + validIsolinePointsLength) % validIsolinePointsLength]];
                        let controlPointA = [startPoint[0] + a * (endPoint[0] - previousPoint[0]), startPoint[1] + a * (endPoint[1] - previousPoint[1])];
                        let controlPointB = [endPoint[0] - b * (nextPoint[0] - startPoint[0]), endPoint[1] - b * (nextPoint[1] - startPoint[1])];
                        if (j == 0) {
                            outputPoints.push(startPoint);
                        }
                        outputPoints.push(controlPointA, controlPointB, endPoint);
                    }
                }
                return outputPoints;
            },
            drawBezierCurve(lnglats: Array<Array<Array<number>>>) {
                const mapCanvas = map.map.getCanvas();
                let canvas = document.getElementById('isolineText') as HTMLCanvasElement;
                canvas.style.cssText = mapCanvas.style.cssText;
                canvas.style.pointerEvents = 'none';
                canvas.width = mapCanvas.width;
                canvas.height = mapCanvas.height;
                let context = canvas.getContext('2d') as CanvasRenderingContext2D;
                context.clearRect(0, 0, canvas.width, canvas.height);

                for (let j = 0; j < lnglats.length; j++) {
                    // lnglats[j] = this.translateGivenDataForShowOfMapbox(lnglats[j]);
                    if (lnglats[j].length > 0) {
                        let points: Array<mapboxgl.Point> = new Array<mapboxgl.Point>();
                        for (let i = 0; i < lnglats[j].length; i++) {
                            // todo：这一套是先用经纬度算贝塞尔曲线控制点，然后再通过mapbox转换为像素点。所以在算控制点的时候就可能把纬度算成小于-90和大于90度了；现在临时解决是超过范围就把纬度值卡到-90和90度线上
                            // fixme:所以应该试下和windy一样，先把经纬度换算成像素点，然后再用像素点算贝塞尔曲线控制点
                            if (lnglats[j][i][1] > 90) {
                                points.push(<mapboxgl.Point>{x: map.map.project([lnglats[j][i][0], 90]).x, y: -20});
                            } else if (lnglats[j][i][1] < -90) {
                                points.push(<mapboxgl.Point>{x: map.map.project([lnglats[j][i][0], -90]).x, y: 20});
                            } else {
                                points.push(map.map.project(<LngLatLike>lnglats[j][i]));
                            }

                        }
                        // 绘制3次贝塞尔曲线
                        context.beginPath();
                        context.moveTo(points[0].x, points[0].y);
                        for (let i = 1; i < points.length; i += 3) {
                            context.bezierCurveTo(points[(i)].x, points[(i)].y,
                                points[i + 1].x, points[i + 1].y,
                                points[i + 2].x, points[i + 2].y);
                            context.strokeStyle = "red";
                            context.stroke();
                        }
                    }
                }

            },
            /**
             * 格式化到 -180~180
             * @param degree
             */
            formatTo180(degree: number): number {
                degree %= 360;
                if (degree > 180) {
                    degree -= 360;
                } else if (degree < -180) {
                    degree += 360;
                }
                return degree;
            },
            translateGivenDataForShowOfMapbox(data: Array<any>) {
                if (data[0][0] != undefined) {
                    for (let i = 1; i < data.length; i++) {
                        data[i][0] = this.translateAdjacentPointsLon(data[i - 1][0], data[i][0]);
                    }
                } else if (data[0].lon != undefined) {
                    for (let i = 1; i < data.length; i++) {
                        data[i].lon = this.translateAdjacentPointsLon(data[i - 1].lon, data[i].lon);
                    }
                } else {
                    for (let i = 2; i < data.length; i += 2) {
                        data[i + 1] = this.translateAdjacentPointsLon(data[i - 1], data[i + 1]);
                    }
                }

                return data;
            },
            translateAdjacentPointsLon(firstLon: number, secondLon: number) {
                if (secondLon - firstLon > 180) {
                    let lon = 0;
                    lon = this.translateAdjacentPointsLon(firstLon, secondLon - 360);
                    return lon;
                } else if (firstLon - secondLon > 180) {
                    let lon = 0;
                    lon = this.translateAdjacentPointsLon(firstLon, secondLon + 360);
                    return lon;
                } else {
                    return secondLon;
                }
            },
            // endregion

            // region todo:方案二：和windy一样，先把经纬度换算成像素点，然后再用像素点算贝塞尔曲线控制点，最后用canvas2d的贝塞尔曲线画等值线
            bezierCurveTest1() {

            },
            // endregion
            meteoinfosmoothTest() {
                map.initMapbox("map");
                map.map.on("load", () => {
                    // region fixme:原始数据等值线
                    let geojsonOriginalLine: any = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    let geojsonOriginalPoint: any = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    for (let i = 0; i < windyData.isoline.length; i++) {
                        let isoline = windyData.isoline[i];
                        let model: any = {
                            "type": "Feature",
                            "properties": {
                                'color': "#1CE819",
                            },
                            "geometry": {
                                "type": "LineString",
                                "coordinates": []
                            }
                        };
                        for (let j = 0; j < isoline.points.length; j += 2) {
                            model.geometry.coordinates.push([isoline.points[j + 1], isoline.points[j]]);
                            geojsonOriginalPoint.features.push({
                                "type": "Feature",
                                "properties": {
                                    'isolineValue': Math.round(isoline.value / 100.0),  // todo:要有单位换算，这里先算成百帕
                                },
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [isoline.points[j + 1], isoline.points[j]]
                                }
                            });
                        }
                        geojsonOriginalLine.features.push(model);
                    }
                    /*map.map.addLayer({
                        'id': 'layer_isoline_original_line',
                        'type': 'line',
                        "source": {
                            "type": "geojson",
                            "data": geojsonOriginalLine
                        },
                        "layout": {
                            "line-join": "round",
                            "line-cap": "round",
                        },
                        // The identity function does not take a 'stops' property.
                        // Instead, the property value (in this case, 'color') on the source will be the direct output.
                        'paint': {
                            'line-width': 1,
                            'line-color': '#0c15ff'
                        }
                    });*/
                    /*map.map.addLayer({
                        'id': "layer_isoline_original_value",
                        'type': 'symbol',
                        "source": {
                            "type": "geojson",
                            "data": geojsonOriginalPoint
                        },
                        'layout': {
                            "text-font": ["oss"],
                            'visibility': 'visible',    // 这个是调用show()后渲染完就显示，因为只会进来一次
                            "text-size": {
                                'base': 2,
                                'stops': [[2, 14], [3, 13], [4, 12]]
                            },
                            "text-field": "{isolineValue}",
                            // "text-allow-overlap":true,  // true：会把所有点显示出来，不允许mapbox对数据进行过滤；默认情况是false，这样就能在zoom层较小时只显示一部分数据，渲染更快
                            "text-padding":30,
                        },
                        "paint": {
                            "text-color": "#ff0000"
                        }
                    });*/
                    // endregion

                    // region fixme:meteoinfo光滑后的等值线
                    let geojsonLine: any = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    let geojsonPoint: any = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    let aLineList: Array<PolyLine> = new Array<PolyLine>();
                    for (let i = 0; i < windyData.isoline.length; i++) {
                        let isoline = windyData.isoline[i];
                        let pointList: Array<PointD> = new Array<PointD>();
                        for (let j = 0; j < isoline.points.length; j += 2) {
                            pointList.push(new PointD(isoline.points[j + 1], isoline.points[j]));
                        }
                        let polyLine: PolyLine = new PolyLine(isoline.value, "", 0, pointList);
                        aLineList.push(polyLine);
                    }
                    aLineList = Contour.smoothLines(aLineList);
                    for (let i = 0; i < aLineList.length; i++) {
                        let isoline: PolyLine = aLineList[i];
                        let model: any = {
                            "type": "Feature",
                            "properties": {
                                'color': "#1CE819",
                                'isolineValue': Math.round(isoline.Value / 100.0),  // todo:要有单位换算，这里先算成百帕
                            },
                            "geometry": {
                                "type": "LineString",
                                "coordinates": []
                            }
                        };
                        for (let j = 0; j < isoline.PointList.length; j++) {
                            model.geometry.coordinates.push([isoline.PointList[j].X, isoline.PointList[j].Y]);
                            if (j % 20 == 0) {
                                geojsonPoint.features.push({
                                    "type": "Feature",
                                    "properties": {
                                        'isolineValue': Math.round(isoline.Value / 100.0),  // todo:要有单位换算，这里先算成百帕
                                    },
                                    "geometry": {
                                        "type": "Point",
                                        "coordinates": [isoline.PointList[j].X, isoline.PointList[j].Y]
                                    }
                                });
                            }
                        }
                        if (isoline.PointList.length > 0) {
                            geojsonLine.features.push(model);
                        }
                    }
                    map.map.addLayer({
                        'id': 'layer_isoline_line',
                        'type': 'line',
                        "source": {
                            "type": "geojson",
                            "data": geojsonLine
                        },
                        "layout": {
                            "line-join": "round",
                            "line-cap": "round",
                        },
                        // The identity function does not take a 'stops' property.
                        // Instead, the property value (in this case, 'color') on the source will be the direct output.
                        'paint': {
                            'line-width': 1,
                            /*'line-color': {
                                'type': 'identity',
                                'property': 'color'
                            }*/
                        }
                    });
                    map.map.addLayer({
                        'id': "layer_isoline_value",
                        'type': 'symbol',
                        "source": {
                            "type": "geojson",
                            // "data": geojsonPoint,
                            "data": geojsonLine,    // symbol的layer层也可以用lineString的source层,但这里不用，因为linestring的点太多了，我们不需要线上的所有点，我们每隔20个点取一个点画
                        },
                        'layout': {
                            "text-font": ["oss"],
                            'visibility': 'visible',    // 这个是调用show()后渲染完就显示，因为只会进来一次
                            "text-size": {
                                'base': 2,
                                'stops': [[2, 14], [3, 13], [4, 12]]
                            },
                            "text-field": "{isolineValue}",
                            // "text-allow-overlap":true,  // true：会把所有点显示出来，不允许mapbox对数据进行过滤；默认情况是false，这样就能在zoom层较小时只显示一部分数据，渲染更快
                            "text-padding": 30,
                        },
                        "paint": {
                            "text-color": "#ff0000"
                        }
                    });
                    // endregion

                });
            },
            meteoinfosmoothTest1() {
                map.initMapbox("map");
                map.map.on("load", () => {
                    // region fixme:meteoinfo光滑后的等值线
                    let geojsonLine: any = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    let geojsonPoint: any = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    let aLineList: Array<PolyLine> = meteoinfodata as any;
                    aLineList = Contour.smoothLines(aLineList);
                    for (let i = 0; i < aLineList.length; i++) {
                        let isoline: PolyLine = aLineList[i];
                        let model: any = {
                            "type": "Feature",
                            "properties": {
                                'color': "#1CE819",
                                'isolineValue': Math.round(isoline.Value / 100.0),  // todo:要有单位换算，这里先算成百帕
                            },
                            "geometry": {
                                "type": "LineString",
                                "coordinates": []
                            }
                        };
                        for (let j = 0; j < isoline.PointList.length; j++) {
                            model.geometry.coordinates.push([isoline.PointList[j].X, isoline.PointList[j].Y]);
                            if (j % 20 == 0) {
                                geojsonPoint.features.push({
                                    "type": "Feature",
                                    "properties": {
                                        'isolineValue': Math.round(isoline.Value),  // todo:要有单位换算，这里先算成百帕
                                    },
                                    "geometry": {
                                        "type": "Point",
                                        "coordinates": [isoline.PointList[j].X, isoline.PointList[j].Y]
                                    }
                                });
                            }
                        }
                        if (isoline.PointList.length > 0) {
                            geojsonLine.features.push(model);
                        }
                    }
                    map.map.addLayer({
                        'id': 'layer_isoline_line',
                        'type': 'line',
                        "source": {
                            "type": "geojson",
                            "data": geojsonLine
                        },
                        "layout": {
                            "line-join": "round",
                            "line-cap": "round",
                        },
                        // The identity function does not take a 'stops' property.
                        // Instead, the property value (in this case, 'color') on the source will be the direct output.
                        'paint': {
                            'line-width': 1,
                            /*'line-color': {
                                'type': 'identity',
                                'property': 'color'
                            }*/
                        }
                    });
                    map.map.addLayer({
                        'id': "layer_isoline_value",
                        'type': 'symbol',
                        "source": {
                            "type": "geojson",
                            "data": geojsonPoint,
                            // "data": geojsonLine,    // symbol的layer层也可以用lineString的source层,但这里不用，因为linestring的点太多了，我们不需要线上的所有点，我们每隔20个点取一个点画
                        },
                        'layout': {
                            "text-font": ["oss"],
                            'visibility': 'visible',    // 这个是调用show()后渲染完就显示，因为只会进来一次
                            "text-size": {
                                'base': 2,
                                'stops': [[2, 14], [3, 13], [4, 12]]
                            },
                            "text-field": "{isolineValue}",
                            // "text-allow-overlap":true,  // true：会把所有点显示出来，不允许mapbox对数据进行过滤；默认情况是false，这样就能在zoom层较小时只显示一部分数据，渲染更快
                            "text-padding": 30,
                        },
                        "paint": {
                            "text-color": "#ff0000"
                        }
                    });
                    // endregion

                });
            },
            postOnly<T>(url: string, data?: any): Promise<T> {
                let httpnew = axios.create({
                    headers: {'Content-Type': 'application/json;charset=UTF-8'},
                    baseURL: "/",
                });
                return new Promise<T>((resolve, reject) => {
                    httpnew.post<S2CJson>(url, data)
                        .then(response => {
                            debugger
                            if (response.status !== 200)
                                reject(response.statusText);
                            else {
                                resolve(response.data.data);
                            }
                        })
                        .catch(reason => reject(reason));
                });
            },
            file2Xce(event: any) {
                debugger
                let files = event.currentTarget.files;
                if (files && files.length > 0) {
                    let file = files[0];
                    return new Promise((resolve, reject) => {
                        let reader = new FileReader();
                        reader.onload = (e: ProgressEvent<FileReader>) => {
                            let arrayBuffer: ArrayBuffer = (e.target as any).result;
                            console.log(arrayBuffer);
                            console.time("file-upload");

                            /*const re = new Float32Array(30000000);
                            const dv = new DataView(re.buffer);
                            for (let m = 0; m < re.length; m++) {
                                dv.setFloat32(m * 4, m);
                            }*/

                            this.postOnly("boot-test-standard-ssm/meteo-stream/upload/1.do", re).then(value => {
                                debugger
                                console.timeEnd("file-upload");
                            });
                        };
                        reader.readAsArrayBuffer(file);
                    });
                }
            },
        },
        activated() {

        },
    });
</script>
<style scoped lang="less">
    .app-main {
        height: 100%;
        width: 100%;
    }

    #map {
        width: 100%;
        height: 100%;
    }

    #isolineText {
        position: absolute;
        left: 0px;
        top: 0px;
        z-index: 0 !important;
    }

    .btn-control2 {
        text-align: center;
        font: bold 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif;
        background-color: #3386c0;
        color: #fff;
        position: absolute;
        top: 20px;
        left: 40%;
        border: none;
        width: 152px;
        margin-left: -100px;
        display: block;
        cursor: pointer;
        padding: 10px 20px;
        border-radius: 3px;
    }

    .btn-control2:hover {
        background-color: #4ea0da;
    }
</style>
