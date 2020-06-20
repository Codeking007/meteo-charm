<template>
    <div class="app-main">
        <canvas id="renderCanvas"></canvas>
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import lodash from "lodash";
    import * as BABYLON from 'babylonjs';
    import {Game} from "@/util/babylon101/1/game.ts"
    import {glTFUtil} from "@/util/glTF-test.ts"
    export default Vue.extend({
        name: 'main-app',
        components: {},
        data() {
            return {};
        },
        watch: {},
        computed: {},
        mounted() {
            /*// Create the game using the 'renderCanvas'.
            let game = new Game('renderCanvas');
            // Create the scene.
            game.createScene();
            // Start render loop.
            game.doRender();*/
            // Create the game using the 'renderCanvas'.
            let glTFTest = new glTFUtil('renderCanvas');
            // Create the scene.
            glTFTest.createScene();
            // Start render loop.
            glTFTest.doRender();
        },
        methods: {},
        activated() {

        },
    });
</script>
<style scoped lang="less">
    .app-main {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
    }

    #renderCanvas {
        width: 100%;
        height: 100%;
        touch-action: none;
    }
</style>
