<template>
    <div class="app-main" id="display">
        <!--地图模型，用于移动时显示-->
        <svg id="map" class="fill-screen" xmlns="http://www.w3.org/2000/svg" version="1.1"></svg>
        <!--流线-->
        <canvas id="animation" class="fill-screen"></canvas>
        <canvas id="mgl" style="position: absolute;z-index: 1;"></canvas>
        <canvas id="mglW9" style="position: absolute;z-index: 4;"></canvas>
        <!--热力图、grid格点-->
        <canvas id="shade" style="position: absolute;z-index: 1;"></canvas>
        <canvas id="shadeW9" style="position: absolute;z-index: 3;"></canvas>
        <!--maskCanvas-->
        <canvas id="maskCanvas" class="invisible"></canvas>
        <!--覆盖球体边缘的锯齿-->
        <svg id="foreground" class="fill-screen" xmlns="http://www.w3.org/2000/svg" version="1.1" style="z-index: 1;"></svg>
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import Micro from "@/util/meteo/micro";
    import Earth from "@/util/meteo/earth";
    import lodash from "lodash";
    import * as d3 from 'd3';
    let µ = new Micro();
    let earth=new Earth();
    export default Vue.extend({
        name: 'main-app',
        components: {},
        data() {
            return {
                view: µ.view(),     // 当前视图宽高
            };
        },
        watch: {},
        computed: {},
        mounted() {
            this.init();
        },
        methods: {
            init() {
                d3.selectAll(".fill-screen").attr("width", this.view.width).attr("height", this.view.height);
                earth.initMeshAndGlobe().then((data)=>{

                });
            },
        },
        activated() {

        },
    });
</script>
<style scoped lang="less">

</style>
