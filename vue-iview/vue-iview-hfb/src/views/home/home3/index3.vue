<template>
  <div class="home">
    <tsx-table :hSize="this.hSize"></tsx-table>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import TsxTable from "./tsx-table.vue";

export default Vue.extend({
  // functional: true,
  name: "",
  components: {
    TsxTable,
  },
  data() {
    return {
      hSize: 2,
      berthPorts: [
        {name: "AMSTERDAM", time: new Date()},
      ],
    }
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
.home {
  width: 100%;
  height: 100%;
}

</style>
