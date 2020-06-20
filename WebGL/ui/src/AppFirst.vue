<template>
    <div id="app">
        <div id="canvasDiv">
            <!--<canvas id="canvas" ref="canvas" ></canvas>-->
        </div>
        <div id="consoleDiv">
            <textarea id="console" :value="log"></textarea>
        </div>
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import Test from './test';
    import mapboxgl from "mapbox-gl";
    import 'mapbox-gl/dist/mapbox-gl.css';
    import turf from "turf";
    import _Map from './a/map';
    import Mgl from './a/mgl';
    // import imageData1 from '../static/5.png';
    export default Vue.extend({
        data(){
            return {
                log:""
            };
        },
        mounted: function () {
            const errorHandler = (error:any, vm:Vue)=>{
                this.log += error;
            };
            Vue.config.errorHandler = errorHandler;
            Vue.prototype.$throw = (error:any)=> errorHandler(error,this);
            const canvas: HTMLCanvasElement = this.$refs["canvas"] as HTMLCanvasElement;
            /*const test = new Test(canvas);
            test.play();*/
            const _data = turf.featureCollection([
                // turf.lineString([[10, 50], [10, 40], [-10, 40], [-10, 50], [10, 50]]),
                turf.lineString([[1, 0],[0, 5], [-1, 0], [1, 0]]),
            ]);
            const map = new mapboxgl.Map({
                container: 'canvasDiv', // container id
                style: {
                    "version": 8,
                    "sources": {
                        "test":{
                            "type": "geojson",
                            "data": _data
                        },
                        "states":{
                            "type": "geojson",
                            "data": new _Map().getJson()
                        },
                    },
                    "layers": [{
                        'id': 'line-animation',
                        "type": "fill",
                        'source': "states",
                        'paint': {
                            'fill-color':'rgba(100, 100, 100, 1)',
                            'fill-outline-color': 'rgba(255,255,255,1)'
                        }
                    }]
                },
                center: [0, 0], // starting position
                zoom: 2 // starting zoom
            });

            const color = [[0,[37, 74, 255, 1]],[4,[0,99,254, 1]],[7,[0,198,254, 1]],[10,[36,193,147, 1]],[13,[0,229,1, 1]],[17,[0,249,0, 1]],
                [20,[252,225,0, 1]],[23,[254, 174, 0, 1]],[27,[220,74,28, 1]],[30,[180,0,49, 1]],[33,[253,0,149, 1]],[35,[255,0,0, 1]]];
            debugger
            const mgl = new Mgl(map).setColor(color);
            mgl.load("../static/5.png");
            mgl.play();
        }
    });
</script>
<style lang="less">
    #app {
        height: 98%;
        width: 99%;
        margin: 0;
    }
    #canvasDiv {
        width: 100%;
        height:100%;
    }
    #consoleDiv {
        width: 100%;
        height:0%;
    }
    #console {
        height: 100%;
        width: 100%;
        margin: 0;
    }
    #canvas {
        height: 100%;
        width: 100%;
        margin: 0;
    }
</style>
