<template>
  <!--首页用切换地图-->
  <div class="map-switch-main">
    <div class="yd-grids-4"
         :style="{'animation-play-state':frames.keyframesMap?'running':'paused','height':pauseHeight+'px'}"
         :class="{'animateShow': frames.keyframesMap&&frames.actives.indexOf('mapSwitch') !== -1,'animateHide':frames.keyframesMap&&!(frames.actives.indexOf('mapSwitch') !== -1) }">
      <a style="padding: 0;" @click="showMap('gTiles')"
         class="yd-grids-item router-link-exact-active router-link-active">
        <div class="yd-grids-icon" style="height: 50px;">
          <img :src="baseUrl+'img/mapSwitch/landMap_selected.png'"
               :class="{'map-icon-active':mapShow === 'gTiles'}"
               style="border-radius: 5px;">
        </div>
        <!--<div class="yd-grids-txt">-->
        <!--<span>谷歌地图</span>-->
        <!--</div>-->
      </a>
      <a style="padding: 0;" @click="showMap('gsTiles')"
         class="yd-grids-item router-link-exact-active router-link-active">
        <div class="yd-grids-icon" style="height: 50px;">
          <img :src="baseUrl+'img/mapSwitch/satelliteMap_unselected.png'"
               :class="{'map-icon-active':mapShow === 'gsTiles'}"
               style="border-radius: 5px;">
        </div>
        <!--<div class="yd-grids-txt">-->
        <!--<span>谷歌卫图</span>-->
        <!--</div>-->
      </a>
      <a style="padding: 0;" @click="showMap('defTiles3')"
         class="yd-grids-item router-link-exact-active router-link-active">
        <div class="yd-grids-icon" style="height: 50px;">
          <img :src="baseUrl+'img/mapSwitch/defTiles.png'"
               :class="{'map-icon-active':mapShow === 'defTiles3'}"
               style="border-radius: 5px">
        </div>
        <!--<div class="yd-grids-txt">-->
        <!--<span>工作图</span>-->
        <!--</div>-->
      </a>
      <a style="padding: 0;" @click="showMap('bTiles')"
         class="yd-grids-item router-link-exact-active router-link-active">
        <div class="yd-grids-icon" style="height: 50px;">
          <img :src="baseUrl+'img/mapSwitch/bTiles.png'"
               :class="{'map-icon-active':mapShow === 'bTiles'}"
               style="border-radius: 5px">
        </div>
        <!--<div class="yd-grids-txt">-->
        <!--<span>海图</span>-->
        <!--</div>-->
      </a>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  name: "map-switch",
  components: {},
  props: ["map", "frames"],
  data() {
    return {
      baseUrl: "./",
      mapTitle: {     // mapbox的source名字
        'gTiles': 'gTiles',
        'gsTiles': 'gsTiles',
        "defTiles3": "defTiles3",
        "bTiles": "bTiles"
      },
      mapShow: "defTiles3",
      BoxMap: {
        UNIMETLAYER: "unimet",		   //3最外层。点线面在其上。
        BASELAYER: "base",        //2示意图。天气等图层在其上或其下
      },
    };
  },
  computed: {
    pauseHeight() {
      if ((this as any).frames.keyframesAisTrack === false) {
        if ((this as any).frames.actives.indexOf('mapSwitch') !== -1) {
          return 40;
        } else {
          return 0;
        }
      } else {
        return null;
      }
    },
  },
  mounted() {

  },
  methods: {
    showMap(_mapTitleShow: string) {
      /*if(_mapTitleShow == "defTiles3"){
          this.map.setLayoutProperty(this.BoxMap.UNIMETLAYER, 'visibility', 'none');
          this.map.setLayoutProperty("^" + this.BoxMap.BASELAYER, 'visibility', 'visible');
      }else{*/
      this.mapShow = _mapTitleShow;
      this.map.setLayoutProperty(this.BoxMap.UNIMETLAYER, 'visibility', 'visible');
      // this.map.setLayoutProperty("^" + this.BoxMap.BASELAYER, 'visibility', 'none');
      this.map.getLayer(this.BoxMap.UNIMETLAYER).source = this.mapTitle[_mapTitleShow];
      // }
    }
  },
})
</script>

<style lang="less" scoped>
.animateShow {
  animation: keyframesShow 0.5s;
  animation-fill-mode: both;
  /*animation-timing-function: linear;*/
}

@keyframes keyframesShow {
  0% {
    height: 0px;
  }
  100% {
    height: 40px;
  }
}

.animateHide {
  animation: keyframesHide 0.5s;
  animation-fill-mode: both;
  /*animation-timing-function: linear;*/
}

@keyframes keyframesHide {
  0% {
    height: 40px;
  }
  100% {
    height: 0px;
  }
}

.map-switch-main {
  width: 100%;
  height: 100%;
}

.yd-grids-icon img {
  margin-top: -7px;

}
</style>
