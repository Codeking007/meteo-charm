<template>
    <div id="app">
        <div id="canvasDiv">
            <canvas id="canvas" ref="canvas" ></canvas>
        </div>
        <div id="consoleDiv">
            <textarea id="console" :value="log"></textarea>
        </div>
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import Test from './test';
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
            const test = new Test(canvas,(message)=>{
                this.log = message;
            });
            test.play();
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
        height:60%;
    }
    #consoleDiv {
        width: 100%;
        height:40%;
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
