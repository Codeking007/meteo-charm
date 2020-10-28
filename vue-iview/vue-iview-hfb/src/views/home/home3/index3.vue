<template>
  <div class="home">
    <tsx-table :hSize="this.hSize"></tsx-table>
    <tsx-table-zj :chargeTemplate="this.chargeTemplate"></tsx-table-zj>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import TsxTable from "./tsx-table.vue";
import TsxTableZj from "./tsx-table-zj.vue";

export default Vue.extend({
  // functional: true,
  name: "",
  components: {
    TsxTable,
    TsxTableZj
  },
  data() {
    return {
      hSize: 2,
      chargeTemplate: {
        // null代表是要合并的
        // ${t(yyyyMMddHH)} 08:00-23:00 ${i(03d)}
        regex: [
          ["机动车停车场(道路)收费明码标价", null, null, null, null, null],
          ["收费依据", "湛价函[2010]208号文和湛价函[2014]68号文", null, null, null, null],
          ["车型", "白天时段: 08:00-23:00", null, null, "夜间时段: 00:00-08:00", "24小时内（含）最高限价"],
          [null, "停车3小时内(含)", "停车3小时至6小时(含)", "停车6小时以上", null, null],
          ["小型车辆", "5元/次", "8元/次", "10元/次", "10元/次", "12元/次"],
          ["超大型车辆", "60元/次", null, null, "30元/次", ""],
          ["停车不超过15分钟的免费, 本停车点保管看护时段:", null, null, null, null, null],
          ["价格举报电话:", "12358", null, null, null, null],
          ["服务监督电话:", "0759-3162699", null, null, null, null],
        ],
        // {rowspan: 2,colspan: 1}
        span: [
          [[1, 6], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
          [[1, 1], [1, 5], [0, 0], [0, 0], [0, 0], [0, 0]],
          [[2, 1], [1, 3], [0, 0], [0, 0], [2, 1], [2, 1]],
          [[0, 0], [1, 1], [1, 1], [1, 1], [0, 0], [0, 0]],
          [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]],
          [[1, 1], [1, 3], [0, 0], [0, 0], [1, 1], [1, 1]],
          [[1, 6], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
          [[1, 1], [1, 5], [0, 0], [0, 0], [0, 0], [0, 0]],
          [[1, 1], [1, 5], [0, 0], [0, 0], [0, 0], [0, 0]],
        ],
        unit: [
          [null, null, null, null, null, null],
          [null, null, null, null, null, null],
          [null, "白天时段: 08:00-23:00", null, null, "夜间时段: 00:00-08:00", "24小时内（含）最高限价"],
          [null, "停车3小时内(含)", "停车3小时至6小时(含)", "停车6小时以上", null, null],
          ["小型车辆", "5元/次", "8元/次", "10元/次", "10元/次", "12元/次"],
          ["超大型车辆", "60元/次", null, null, "30元/次", ""],
          ["停车不超过15分钟的免费, 本停车点保管看护时段:", null, null, null, null, null],
          ["价格举报电话:", "12358", null, null, null, null],
          ["服务监督电话:", "0759-3162699", null, null, null, null],
        ],
      },
      chargeRule: {
        data: [
          ["机动车停车场(道路)收费明码标价", null, null, null, null, null],
          ["收费依据", "湛价函[2010]208号文和湛价函[2014]68号文", null, null, null, null],
          ["车型", "白天时段: 08:00-23:00", null, null, "夜间时段: 00:00-08:00", "24小时内（含）最高限价"],
          [null, "停车3小时内(含)", "停车3小时至6小时(含)", "停车6小时以上", null, null],
          ["小型车辆", "5元/次", "8元/次", "10元/次", "10元/次", "12元/次"],
          ["超大型车辆", "60元/次", null, null, "30元/次", ""],
          ["停车不超过15分钟的免费, 本停车点保管看护时段:", null, null, null, null, null],
          ["价格举报电话:", "12358", null, null, null, null],
          ["服务监督电话:", "0759-3162699", null, null, null, null],
        ],
      },
    }
  },
  mounted() {
    this.$nextTick(() => {

    });
  },
  activated() {
    this.$nextTick(() => {

    });
  },
  methods: {},

})
</script>

<style scoped lang="less">
.home {
  width: 100%;
  height: 100%;
}

</style>
