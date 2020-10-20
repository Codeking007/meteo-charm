<template>
  <div class="home">
    <jsx-template :hSize="this.hSize" :data=this.berthPorts></jsx-template>
    <tsx-template :hSize="this.hSize"></tsx-template>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import HomeMap from "../../components/map/index.vue"
import JsxTemplate from "./home-components/jsx.vue";
import TsxTemplate from "./home-components/tsx.vue";
import service from "@/service"
import dolphin from "@/components/dolphin";

export default Vue.extend({
  // functional: true,
  name: "",
  components: {
    HomeMap,
    JsxTemplate,
    TsxTemplate
  },
  data() {
    return {
      hSize: 2,
      berthPorts: [
        {name: "AMSTERDAM", time: new Date()},
      ],
    }
  },
  /*beforeRouteEnter(to, from, next) {
    next((vm: any) => {
      if (vm.$store.state.um.user) {

      } else {
        vm.initAllButton();
      }
    })
  },*/
  /*beforeRouteLeave(to, from, next) {
    this.$refs["meteoSlider"].meteoSwiper.autoplay.stop();
    this.$refs["meteoSlider"].meteoSwiperPlay = false;
    this.func.keyframesMap = false;
    this.func.keyframesAisTrack = false;
    this.func.keyframesMeteo = false;
    next();
  },*/
  mounted() {
    this.initUser();
    this.$nextTick(() => {

    });
  },
  activated() {
    this.$nextTick(() => {

    });
  },
  methods: {
    initUser() {

    },
  },
  computed: {},
  watch: {}

})
</script>

<style scoped lang="less">
//@fontSize: 12px;
//@bottom-height: 63px;
.home {
  width: 100%;
  height: 100%;
}

</style>
