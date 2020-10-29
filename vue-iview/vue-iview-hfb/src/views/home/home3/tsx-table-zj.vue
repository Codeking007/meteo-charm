<!--fixme 现在是tsx，不是ts-->
<script lang="tsx">
import Vue, {CreateElement, RenderContext, VNodeData} from "vue"
import {DefaultProps} from "vue/types/options";
import {ScopedSlot, VNode, VNodeDirective} from "vue/types/vnode";

export default Vue.extend({
  // todo
  // functional: true,
  name: "tsx-table-zj",
  components: {},
  props: {
    chargeTemplate: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      columns6: [
        {
          title: '0',
          key: '0',
          width: 150,
          render: (h, params) => {
            return (
                <div style={{"text-align": params.index == 6 ? "left" : "center"}}>
                  <strong>{params.row[0]}</strong>
                </div>
            );
          }
        },
        {
          title: '1',
          key: '1',
          align: 'center',
          width: 100,
        },
        {
          title: '2',
          key: '2',
          align: 'center',
          width: 130,
        },
        {
          title: '3',
          key: '3',
          align: 'center',
          width: 100,
        },
        {
          title: '4',
          key: '4',
          align: 'center',
          width: 130,
        },
        {
          title: '5',
          key: '5',
          align: 'center',
          width: 130,
        },
      ],
      data6: [
        {0: "机动车停车场(道路)收费明码标价", 1: null, 2: null, 3: null, 4: null, 5: null},
        {0: "收费依据", 1: "湛价函[2010]208号文和湛价函[2014]68号文", 2: null, 3: null, 4: null, 5: null},
        {0: "车型", 1: "白天时段: 08:00-24:00", 2: null, 3: null, 4: "夜间时段: 00:00-08:00", 5: "24小时内（含）最高限价"},
        {0: null, 1: "停车3小时内(含)", 2: "停车3小时至6小时(含)", 3: "停车6小时以上", 4: null, 5: null},
        {0: "小型车辆", 1: "5元/次", 2: "8元/次", 3: "10元/次", 4: "10元/次", 5: "12元/次"},
        {0: "超大型车辆", 1: "60元/次", 2: null, 3: null, 4: "30元/次", 5: ""},
        {0: "停车不超过15分钟的免费, 本停车点保管看护时段:", 1: null, 2: null, 3: null, 4: null, 5: null},
        {0: "价格举报电话:", 1: "12358", 2: null, 3: null, 4: null, 5: null},
        {0: "服务监督电话:", 1: "0759-3162699", 2: null, 3: null, 4: null, 5: null},
      ],
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
      contextLine: 0,
    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    let tableNodeData: VNodeData = {
      props: {
        size: "small",
        highlightRow: true,
        border: true,
        columns: this.columns6,
        data: this.data6,
        // fixme 看iview源码的prop就是这个属性，所以这么写没问题。不一定非得照着iview官网写成“span-method”
        spanMethod: this.handleSpan,
        contextMenu: true,
        showContextMenu: true,
        showHeader:false,
      },
      on: {
        // fixme 直接看iview源码，把子组件$emit函数的第一个参数复制过来就行了
        "on-contextmenu": (row, event, position) => {
          this.$nextTick(() => {
            this.handleContextMenu(row, event, position);
          })
        },
        // "on-contextmenu": this.handleContextMenu,
      },
      nativeOn: {},
    };
    return (
        <div style={{width: (740+2)+"px"}}>
          <i-table {...tableNodeData} >
            <template slot="contextMenu">
              <dropdownItem nativeOnClick={this.handleContextMenuEdit}>编辑</dropdownItem>
              <dropdownItem nativeOnClick={this.handleContextMenuDelete} style="color: #ed4014">删除</dropdownItem>
            </template>
          </i-table>
        </div>
    );
  },
  methods: {
    show(index) {
      this.$Modal.info({
        title: 'User Info',
        content: `Name：${this.data6[index].name}<br>Age：${this.data6[index].age}<br>Address：${this.data6[index].address}`
      })
      console.log(this.data6)
    },
    remove(index) {
      this.data6.splice(index, 1);
    },
    handleContextMenu(row) {
      console.log("handleContextMenu");
      const index = this.data6.findIndex(item => item[0] === row[0]);
      this.contextLine = index + 1;
    },
    handleContextMenuEdit() {
      console.log("handleContextMenuEdit");
      this.$Message.info('Click edit of line' + this.contextLine);
    },
    handleContextMenuDelete() {
      console.log("handleContextMenuDelete");
      this.$Message.info('Click delete of line' + this.contextLine);
    },
    handleSpan({row, column, rowIndex, columnIndex}) {
      return this.span[rowIndex][columnIndex];

    },
  },
  computed: {},
  watch: {},
  mounted() {
    this.$nextTick(() => {

    });
  },
  activated() {
    this.$nextTick(() => {

    });
  },
})
</script>

<style scoped lang="less">
</style>
