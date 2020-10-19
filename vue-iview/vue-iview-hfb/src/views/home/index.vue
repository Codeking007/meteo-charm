<template>
  <div class="home">
    <Button>Default</Button>
    <Button type="primary">Primary</Button>
    <Button type="dashed">Dashed</Button>
    <Button type="text">Text</Button>
    <br><br>
    <Button type="info">Info</Button>
    <Button type="success">Success</Button>
    <Button type="warning">Warning</Button>
    <Button type="error">Error</Button>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import HomeMap from "../../components/map/index.vue"

import service from "@/service"
import dolphin from "@/components/dolphin";

export default Vue.extend({
  name: "",
  components: {
    HomeMap,
  },
  data() {
    return {
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
