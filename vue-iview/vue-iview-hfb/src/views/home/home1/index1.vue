<template>
  <div class="home">
    <!--fixme 方法1-->
    <!--    <async-example :hSize="this.hSize"></async-example>-->
    <!--fixme 方法2/3-->
    <!--    <component :is="currentTab.component"></component>-->
    <!--fixme 方法4-->
    <!--    <component v-for="app in comps" :is="app"></component>-->
    <!--fixme 方法5-->
    <component v-for="(item,i) in components5" :key="i" :is="item.component"></component>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
// fixme 方法1
// import AsyncExample from "@/views/home/home1/AsyncExample";

// fixme 方法2
// Vue.component("async-example", () => import("./AsyncExample"));

export default Vue.extend({
  // functional: true,
  name: "index1",
  props: {
    allComponentNames: {
      type: Array,
      default: () => ["AsyncExample"]
    }
  },
  components: {
    // fixme 方法1
    // AsyncExample,
    // fixme 方法3
    // AsyncExample: () => import("./AsyncExample"),
  },
  data() {
    return {
      hSize: 2,
      berthPorts: [
        {name: "AMSTERDAM", time: new Date()},
      ],
      currentTab: {
        component: "AsyncExample"
      },
      comps: ["AsyncExample"],
      components5: [],
    }
  },
  created() {
    // fixme 方法4
    /*    this.comps.forEach(app => {
          Vue.component(app, () => import(`./${app}`));
        });*/
    // fixme 方法5
    this.allComponentNames.forEach(componentName => {
      this.components5.push({
        component: () => import(`./${componentName}`)
      });
    });
  },
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
