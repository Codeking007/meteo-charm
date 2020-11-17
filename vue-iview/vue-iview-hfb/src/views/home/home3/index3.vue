<template>
  <div class="home">
<!--        <tsx-table :hSize="this.hSize"></tsx-table>-->
    <tsx-table-zj :chargeTemplate="this.chargeTemplate" :chargeRule="this.chargeRule"></tsx-table-zj>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import TsxTable from "./tsx-table.vue";
import TsxTableZj from "./tsx-table-zj.vue";
import {ScopedSlot, VNodeDirective} from "vue/types/vnode";

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
        sampleData: [
          ["机动车停车场(道路)收费明码标价", null, null, null, null, null],
          ["收费依据", "湛价函[2010]208号文和湛价函[2014]68号文", null, null, null, null],
          ["车型", "白天时段: 08:00-24:00", null, null, "夜间时段: 00:00-08:00", "24小时内（含）最高限价"],
          [null, "停车3小时内(含)", "停车3小时至6小时(含)", "停车6小时以上", null, null],
          ["小型车辆", "5元/次", "8元/次", "10元/次", "10元/次", "12元/次"],
          ["超大型车辆", "60元/次", null, null, "30元/次", ""],
          ["停车不超过15分钟的免费, 本停车点保管看护时段", null, null, null, null, null],
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
        /* fixme
              "白天时段: ${t(dd:HH)}-${t(dd:HH22)}".match(/(?<=\$\{).+?(?=\})/g)
                ["t(dd:HH)", "t(dd:HH22)"]
              "白天时段: ${t(dd:HH)}-${t(dd:HH)}".match(/\$\{[^\}]+\}/g)
                ["${t(dd:HH)}", "${t(dd:HH)}"]
              "白天时段: ${t(dd:HH)}-${t(dd:H22H)}".match(/(?<=\$\{)[^\}]+/g)
                ["t(dd:HH)", "t(dd:H22H)"]
              用零宽断言：const&nbsp;d&nbsp;=&nbsp;"1【ddd】sfdsaf【ccc】fdsaf【bbbb】"; d.match(/[^【]+(?=】)/g);上面只用了零宽度正预测先行断言，实际上如果&nbsp;不限于JavaScript的话&nbsp;是新版 Chrome、新版 Node.JS 的话，还可以写成(?<=【).+?(?=】)零宽断言分为两类四种：正向零宽断言零宽度正预测先行断言(?=exp)表示自身位置之后可以匹配到exp的表达式，而不匹配exp。比如\d+(?=999)表示以999结尾的数字串（但是匹配结果不包含999）零宽度正回顾后发断言(?<=exp)（JavaScript不支持&nbsp;新版 Chrome、新版 Node.JS 支持，Firefox 至今不支持，其他未测试）表示自身位置之前可以匹配到exp的表达式，而不匹配exp。比如(?<=999)\d+表示以999开头的数字串（但是匹配结果不包含999）负向零宽断言零宽度负预测先行断言(?!exp)表示自身位置之后不能是exp的表达式。比如\d+(?!999)表示匹配不是以999结尾的数字串零宽度负回顾后发断言(?<!exp)（JavaScript不支持&nbsp;新版 Chrome、新版 Node.JS 支持，Firefox 至今不支持，其他未测试）表示自身位置之前不能是exp的表达式。比如(?<!999)\d+表示匹配不是以999开头的数字串举个例子const str = '~~~%ABC%~~~DEF~~~%GHI~~~JKL%~~~';console.log('左右都有 % 的三个连续字母（ABC）：', str.match(/(?<=%)\w{3}(?=%)/g));console.log('左右都没有 % 的三个连续字母（DEF）：', str.match(/(?<!%)\w{3}(?!%)/g));console.log('仅左边有 % 的三个连续字母（GHI）：', str.match(/(?<=%)\w{3}(?!%)/g));console.log('仅右边有 % 的三个连续字母（JKL）：', str.match(/(?<!%)\w{3}(?=%)/g));在新版 Chrome 下可以得到结果：左右都有 % 的三个连续字母（ABC）： ["ABC"]左右都没有 % 的三个连续字母（DEF）： ["DEF"]仅左边有 % 的三个连续字母（GHI）： ["GHI"]仅右边有 % 的三个连续字母（JKL）： ["JKL"]在 Firefox 或是旧版 Chrome 下无法执行。

              "aabbccdd".split(/aa|cc/);
        */
        regex: [
          [["机动车停车场(道路)收费明码标价"], null, null, null, null, null],
          [["收费依据"], ["${s(u)}"], null, null, null, null],
          [["车型"], ["白天时段: ", "${TimePicker(dd:HH)}", " - ", "${TimePicker(dd:HH)}"], null, null, ["夜间时段: ", "${TimePicker(dd:HH)}", " - ", "${TimePicker(dd:HH)}"], ["24小时内（含）最高限价"]],
          [null, ["停车 ", "${t(H)}", " 小时内(含)"], ["停车 ", "${t(H)}", " 小时至 ", "${t(H)}", " 小时(含)"], ["停车 ", "${t(H)}", " 小时以上"], null, null],
          [["小型车辆"], ["${m(yuan)}", "元/次"], ["${m(yuan)}", "元/次"], ["${m(yuan)}", "元/次"], ["${m(yuan)}", "元/次"], ["${m(yuan)}", "元/次"]],
          [["超大型车辆"], ["${m(yuan)}", "元/次"], null, null, ["${m(yuan)}", "元/次"], [""]],
          [["停车不超过", "${t(m)}", "分钟的免费, 本停车点保管看护时段"], null, null, null, null, null],
          [["价格举报电话:"], ["${s(u)}"], null, null, null, null],
          [["服务监督电话:"], ["${s(u)}"], null, null, null, null],
        ],
        VNodeData: [
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "left", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
          [{style: {"text-align": "center", "font-weight": "bolder"}}, null, null, null, null, null],
        ],
      },
      chargeRule: {
        variables: [
          {0: null, 1: null, 2: null, 3: null, 4: null, 5: null},
          {0: null, 1: ["湛价函[2010]208号文和湛价函[2014]68号文"], 2: null, 3: null, 4: null, 5: null},
          {0: null, 1: [8 * 60 * 60, 24 * 60 * 60], 2: null, 3: null, 4: [0, 8 * 60 * 60], 5: null},
          {0: null, 1: [3 * 60 * 60], 2: [3 * 60 * 60, 6 * 60 * 60], 3: [6 * 60 * 60], 4: null, 5: null},
          {0: null, 1: [5 * 100], 2: [8 * 100], 3: [10 * 100], 4: [10 * 100], 5: [12 * 100]},
          {0: null, 1: [60 * 100], 2: null, 3: null, 4: [30 * 100], 5: null},
          {0: [15 * 60], 1: null, 2: null, 3: null, 4: null, 5: null},
          {0: null, 1: ["12358"], 2: null, 3: null, 4: null, 5: null},
          {0: null, 1: ["0759-3162699"], 2: null, 3: null, 4: null, 5: null},
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
