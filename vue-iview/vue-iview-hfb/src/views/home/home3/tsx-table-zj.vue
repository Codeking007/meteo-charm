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
      contextLine: 0,
    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    let tableNodeData: VNodeData = {
      props: {
        size: "small",
        highlightRow: true,
        border: true,
        columns: this.renderCellArray(),
        data: this.chargeRule.variables,
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
      console.log(this.chargeRule.variables);
      this.$Message.info('Click edit of line' + this.contextLine);
    },
    handleContextMenuDelete() {
      console.log("handleContextMenuDelete");
      this.$Message.info('Click delete of line' + this.contextLine);
    },
    handleSpan({row, column, rowIndex, columnIndex}) {
      return this.chargeTemplate.span[rowIndex][columnIndex];
    },
    renderCellArray() {
      let columns: Array<any> = new Array<any>();
      if (this.chargeTemplate.regex != null && this.chargeTemplate.regex.length > 0) {
        for (let i = 0; i < this.chargeTemplate.regex[0].length; i++) {
          columns[i] = {
            title: '第' + i + '列',
            key: i,
            align: 'center',
            // todo 宽度要设置
            // width: 150,
            render: (h, params) => {
              console.log(params);
              return this.renderCell(params.index, i);
            }
          };
        }
      }

      return columns;
    },
    /**
     * 表格table：生成指定单元格的JSX渲染模板
     * @param row 表格table的行索引
     * @param column 表格table的列索引
     */
    renderCell(row: number, column: number): any {
      let chargeTemplateRegexArray: Array<string> | null = this.chargeTemplate.regex[row][column];
      let chargeRuleVariableArray: Array<any> | null = this.chargeRule.variables[row][column];

      let tableRenderCells: Array<any> = new Array<any>();
      if (chargeTemplateRegexArray != null) {
        let chargeRuleVariablesIndex: number = 0;
        for (let i = 0; i < chargeTemplateRegexArray.length; i++) {
          let templateRegexElement = chargeTemplateRegexArray[i];
          let typeMatchArray: RegExpMatchArray | null = templateRegexElement.match(/(?<=\${).+?(?=})/g);
          if (typeMatchArray != null && typeMatchArray.length > 0) {
            typeMatchArray.forEach((typeValue, typeIndex, typeArray) => {
              let formatMatchArray: RegExpMatchArray | null = typeValue.match(/(?<=\().+?(?=\))/g);
              if (formatMatchArray != null && formatMatchArray.length > 0) {
                formatMatchArray.forEach((formatValue, formatIndex, formatArray) => {
                  // fixme 要单独拷贝一个chargeRuleVariablesIndex变量出来到currentChargeRuleVariablesIndex中，要不然input框的input事件就绑定的是++chargeRuleVariablesIndex的索引了。这里利用number数值型是「值传递」的思想，重新拷贝了一份出来，这样v-model绑定的值就不会随着chargeRuleVariablesIndex的递增而改变
                  let currentChargeRuleVariablesIndex = chargeRuleVariablesIndex;
                  switch (typeValue.charAt(0)) {
                      // 字符串，直接显示
                    case 's':
                      tableRenderCells.push(
                          <span>
                            {chargeRuleVariableArray[currentChargeRuleVariablesIndex]}
                          </span>
                      );
                      ++chargeRuleVariablesIndex;
                      break;
                      // 时间（单位：从0点开始有多少秒），render渲染为时间组件
                    case 't':
                      let timeVNodeData = {
                        props: {
                          value: chargeRuleVariableArray[currentChargeRuleVariablesIndex],
                          // clearable: true,
                          // size: "large",
                          placeholder: "Enter something...",
                        },
                        style: {
                          // marginRight: '5px',
                          width: "60px",
                        },
                        on: {
                          "input": (e) => {
                            chargeRuleVariableArray[currentChargeRuleVariablesIndex] = e;
                          }
                        }
                      };
                      tableRenderCells.push(
                          <i-input {...timeVNodeData} />
                      );
                      ++chargeRuleVariablesIndex;
                      break;
                      // 金额（单位：分）， render渲染为金钱组件
                    case 'm':
                      let moneyVNodeData = {
                        props: {
                          value: chargeRuleVariableArray[currentChargeRuleVariablesIndex]/100.0,
                          // clearable: true,
                          // size: "large",
                          placeholder: "Enter something...",
                        },
                        style: {
                          // marginRight: '5px',
                          width: "60px",
                        },
                        on: {
                          "input": (e) => {
                            chargeRuleVariableArray[currentChargeRuleVariablesIndex] = e*100.0;
                          }
                        }
                      };
                      tableRenderCells.push(
                          <i-input {...moneyVNodeData} />
                      );
                      ++chargeRuleVariablesIndex;
                      break;
                    default:
                      tableRenderCells.push(
                          <span>
                            {formatValue}
                          </span>
                      );
                      ++chargeRuleVariablesIndex;
                      break;
                  }
                })
              }
            });
          } else {
            tableRenderCells.push(
                <span>
                  {templateRegexElement}
                </span>
            );
          }
        }
      }
      // fixme 这里返回的tableRenderCells是个Array数组，但Vue会将数组内的元素依次进行渲染。所以并不是一定只能返回一个值
      return (
          <div {...this.chargeTemplate.VNodeData[row][column]}>
            {...tableRenderCells}
          </div>
      );
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
