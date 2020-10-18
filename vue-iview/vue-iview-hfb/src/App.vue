<template>
  <div id="app">
    <keep-alive>
      <router-view/>
    </keep-alive>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import service from "./service";

export default Vue.extend({
  name: 'app',
  components: {},
  data() {
    return {
      pushRoute: null,
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      this.$store.state.um.pageOpenedList = [];
      this.$router.push({path: "/home"});
    },
  }
});
</script>

<style lang="less">
html, body {
  width: 100%;
  height: 100%;
  background: #000000;
  overflow: hidden;
}

#app {
  height: 100%;
  width: 100%;
  background-color: #1d2536;
}
</style>
