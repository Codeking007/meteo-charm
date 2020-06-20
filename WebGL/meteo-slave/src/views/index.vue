<template>
    <div class="app-main">
        <div id="map"></div>
<!--        <meteo-master></meteo-master>-->
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import mapboxgl from "mapbox-gl";
    import 'mapbox-gl/dist/mapbox-gl.css';
    import MapUtil from "@/util/map";
    let map=new MapUtil();
    export default Vue.extend({
        name: 'main-app',
        components: {},
        data() {
            return {

            };
        },
        watch: {},
        computed: {},
        mounted() {
            map.initMapbox("map");
        },
        methods: {

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
</style>
