<template>
  <div class="home">
    <Item :data=this.berthPorts></Item>
    <Bbb :data=this.berthPorts></Bbb>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import HomeMap from "../../components/map/index.vue"
import Item from "./home-components/jsx.vue";
import Bbb from "./home-components/tsx.vue";
import service from "@/service"
import dolphin from "@/components/dolphin";
// import tsxTest from "@/views/home/home-components/tsx-test";

export default Vue.extend({
  // functional: true,
  name: "",
  components: {
    HomeMap,
    Item,
    Bbb
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
