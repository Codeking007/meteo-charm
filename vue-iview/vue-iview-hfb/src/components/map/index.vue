<template>
  <div>
    <div id="map"></div>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
// import mapData from "@/assets/map/map.ts";
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';

export default Vue.extend({
  name: "",
  data() {
    return {
      // 地图
      map: null,
    }
  },
  mounted() {
    this.initMapbox();
  },
  methods: {
    initMapbox() {

    },
  }
})
</script>

<style scoped>
#map {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
</style>
