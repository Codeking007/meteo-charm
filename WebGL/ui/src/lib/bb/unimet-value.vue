<template>
    <div id="app1">
        <div id="sliderDiv1">
            <Form :model="params" :label-width="80" id="formSlider1">
                <FormItem label="speedfactor">
                    <Slider v-model="params.speedfactor" show-input :min=0 :max=50 :step=0.01 @on-change="changeMglParams"></Slider>
                </FormItem>
            </Form>
        </div>
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    export default Vue.extend({
        name: 'UnimetValue',
        data(){
            return {
                params:{
                    speedfactor:25.0,
                },
                log:"",
                visible: false
            };
        },
        mounted: function () {

        },
        methods:{
            playMgl(){

            },
            changeMglParams(){

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
    #app1 {
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
    #sliderDiv1 {
        width: 30%;
        height:20%;
        margin-top: 2%;
        z-index: 1;
        position: absolute;
        top: 0%;
        margin-left: 68%;
    }
    #formSlider1:hover {
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
