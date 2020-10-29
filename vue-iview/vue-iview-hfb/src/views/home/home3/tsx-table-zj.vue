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
    },
    chargeRule: {
      type: Object,
      default: {}
    },
  },
  data() {
    return {
      columns6: [
        {
          title: '0',
          key: '0',
          // width: 150,
          render: (h, params) => {
            return (
                <div style={{"text-align": params.index === 6 ? "left" : "center"}}>
                  <strong>{params.row[0]}</strong>
                </div>
            );
          }
        },
        {
          title: '1',
          key: '1',
          align: 'center',
          // width: 100,
          /*render: (h, params) => {
            console.log(params)
            if (params.index === 4) {
              return (
                  <div>
                    <i-input v-model={(this as any).chargeTemplate.regex[params.index][1]} placeholder={"Enter something..dwdw."}>
                      <span slot="append">元/次</span>
                    </i-input>
                  </div>
              );
            } else {
              return (<div>{params.row[1]}</div>);
            }

          },*/
        },
        {
          title: '2',
          key: '2',
          align: 'center',
          // width: 130,
        },
        {
          title: '3',
          key: '3',
          align: 'center',
          // width: 100,
        },
        {
          title: '4',
          key: '4',
          align: 'center',
          // width: 130,
        },
        {
          title: '5',
          key: '5',
          align: 'center',
          // width: 130,
        },
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
        data: this.chargeTemplate.regex,
        // fixme 看iview源码的prop就是这个属性，所以这么写没问题。不一定非得照着iview官网写成“span-method”
        spanMethod: this.handleSpan,
        contextMenu: true,
        showContextMenu: true,
        showHeader: false,
      },
      on: {
        // fixme 直接看iview源码，把子组件$emit函数的第一个参数复制过来就行了
        "on-contextmenu": (row, event, position) => {
          this.$nextTick(() => {
            this.handleContextMenu(row, event, position);
            this.generateUrl("${s(u)}");
            this.generateUrl("白天时段: ${t(dd:HH)}-${t(dd:HH)}");
            this.generateUrl("${m(yuan)}元/次");
          })
        },
        // "on-contextmenu": this.handleContextMenu,
      },
      nativeOn: {},
    };
    return (
        <div /*style={{width: (740 + 2) + "px"}}*/>
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
    handleContextMenu(row) {
      console.log("handleContextMenu");
      const index = this.chargeTemplate.regex.findIndex(item => item[0] === row[0]);
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
      return this.chargeTemplate.span[rowIndex][columnIndex];

    },
    generateUrl(str: string) {
      let typeMatchArray: RegExpMatchArray | null = str.match(/(?<=\${).+?(?=})/g);
      if (typeMatchArray != null) {
        typeMatchArray.forEach((typeValue, typeIndex, typeArray) => {
          let formatMatchArray: RegExpMatchArray | null = str.match(/(?<=\().+?(?=\))/g);
          if (formatMatchArray != null) {
            formatMatchArray.forEach((formatValue, formatIndex, formatArray) => {
              switch (typeValue.charAt(0)) {
                  // 字符串，直接显示
                case 's':
                  console.log('s');
                  console.log(formatValue);
                  break;
                  // 时间（单位：从0点开始有多少秒），render渲染为时间组件
                case 't':
                  console.log('t');
                  console.log(formatValue);
                  break;
                  // 金额（单位：分）， render渲染为金钱组件
                case 'm':
                  console.log('m');
                  console.log(formatValue);
                  break;
                default:
                  console.log(formatValue);
                  break;
              }
            })
          }
        });
      }

      "aabbccdd".split(/aa|cc/);

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
