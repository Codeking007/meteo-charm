<template>
    <div id="app">
        <div id="canvasDiv">
            <!--<canvas id="canvas" ref="canvas" ></canvas>-->
        </div>
        <div id="consoleDiv">
            <textarea id="console" :value="log"></textarea>
        </div>
        <div id="sliderDiv">
            <Form :model="params" :label-width="80" id="formSlider">
                <FormItem label="fadeopacity">
                    <Slider v-model="params.fadeopacity" show-input :min=0.9 :max=1 :step=0.001 @on-change="changeMglParams"></Slider>
                </FormItem>
                <FormItem label="speedfactor">
                    <Slider v-model="params.speedfactor" show-input :min=0 :max=50 :step=0.01 @on-change="changeMglParams"></Slider>
                </FormItem>
                <FormItem label="droprate">
                    <Slider v-model="params.droprate" show-input :min=0 :max=0.02 :step=0.001 @on-change="changeMglParams"></Slider>
                </FormItem>
                <FormItem label="dropratebump">
                    <Slider v-model="params.dropratebump" show-input :min=0 :max=0.5 :step=0.01 @on-change="changeMglParams"></Slider>
                </FormItem>
                <FormItem label="particlesradix">
                    <Slider v-model="params.particlesradix" show-input :min=0 :max=512 :step=64 @on-change="changeMglParams"></Slider>
                </FormItem>
            </Form>
        </div>
        <!--<unimet-key></unimet-key>
        <unimet-value></unimet-value>-->
        <!--<div id="sliderDiv">
            <Dropdown trigger="custom" :visible="visible" style="margin-left: 20px">
                <a href="javascript:void(0)" @click="handleOpen">
                    custom 触发
                    <Icon type="ios-arrow-down"></Icon>
                </a>
                <DropdownMenu slot="list">
                    <Form :model="params" :label-width="80" id="formSlider">
                        <FormItem label="fadeopacity">
                            <Slider v-model="params.fadeopacity" show-input :min=0 :max=1 :step=0.001 @on-change="changeMglParams"></Slider>
                        </FormItem>
                        <FormItem label="speedfactor">
                            <Slider v-model="params.speedfactor" show-input :min=0 :max=50 :step=0.01 @on-change="changeMglParams"></Slider>
                        </FormItem>
                        <FormItem label="droprate">
                            <Slider v-model="params.droprate" show-input :min=0 :max=1 :step=0.001 @on-change="changeMglParams"></Slider>
                        </FormItem>
                        <FormItem label="dropratebump">
                            <Slider v-model="params.dropratebump" show-input :min=0 :max=1 :step=0.01 @on-change="changeMglParams"></Slider>
                        </FormItem>
                        <FormItem label="particlesradix">
                            <Slider v-model="params.particlesradix" show-input :min=0 :max=512 :step=64 @on-change="changeMglParams"></Slider>
                        </FormItem>
                    </Form>
                    <div style="text-align: right;margin:10px;">
                        <Button type="primary" @click="handleClose">关闭</Button>
                    </div>
                </DropdownMenu>
            </Dropdown>
        </div>-->
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import Test from './test';
    import mapboxgl from "mapbox-gl";
    import 'mapbox-gl/dist/mapbox-gl.css';
    import turf from "turf";
    import _Map from './a/map';
    // import Mgl from './a/mgl';
    import {Mgl,Params} from './a/mglParams';
    // import imageData1 from '../static/5.png';
    import UnimetKey from "./lib/aa/unimet-key.vue";
    import UnimetValue from "./lib/bb/unimet-value.vue";
    export default Vue.extend({
        components:{
            UnimetKey,
            UnimetValue
        },
        name: 'TestCompo',
        data(){
            return {
                log:"",
                params: new Params(),
                mgl:new Mgl(),
                visible: false
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
            const map= new mapboxgl.Map({
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
            this.mgl.constructAll(map,this.params);
            this.mgl.setColor(color);
            this.mgl.load("../static/5.png").then(()=>{
                this.mgl.play();
            });

        },
        methods:{
            playMgl(){
                const color = [[0,[37, 74, 255, 1]],[4,[0,99,254, 1]],[7,[0,198,254, 1]],[10,[36,193,147, 1]],[13,[0,229,1, 1]],[17,[0,249,0, 1]],
                    [20,[252,225,0, 1]],[23,[254, 174, 0, 1]],[27,[220,74,28, 1]],[30,[180,0,49, 1]],[33,[253,0,149, 1]],[35,[255,0,0, 1]]];
                this.mgl.stop();
                debugger
                this.mgl.constructAll(null,this.params);
                this.mgl.setColor(color);
                this.mgl.load("../static/5.png").then(()=>{
                    this.mgl.play();
                });

            },
            changeMglParams(){
                this.playMgl();
            },
            handleOpen () {
                this.visible = true;
            },
            handleClose () {
                this.visible = false;
            }
        },
    });
</script>
<style lang="less">
    #app {
        height: 98%;
        width: 99%;
        margin: 0;
        color: #ed4d24;
    }
    #canvasDiv {
        width: 100%;
        height:100%;
    }
    #consoleDiv {
        width: 100%;
        height:0%;
    }
    #sliderDiv {
        width: 30%;
        height:20%;
        margin-top: 2%;
        z-index: 1;
        position: absolute;
        top: 0%;
        margin-left: 68%;
    }
    #formSlider:hover {
        background-color: #0bffc7;
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
