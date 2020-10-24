<template>
  <div class="home">
    <tsx-template :hSize="this.hSize"></tsx-template>
    <jsx-jsx :hSize="this.hSize"></jsx-jsx>
    <tsx-tsx :hSize="this.hSize"></tsx-tsx>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import HomeMap from "../../components/map/index.vue"
import TsxTemplate from "@/views/home/home-components/tsx.vue";
import JsxJsx from "@/views/home/home-components/JsxTest";
import TsxTsx from "@/views/home/home-components/TsxTest";
import service from "@/service"
import dolphin from "@/components/dolphin";

export default Vue.extend({
  // functional: true,
  name: "",
  components: {
    HomeMap,
    TsxTemplate,
    JsxJsx,
    TsxTsx
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
