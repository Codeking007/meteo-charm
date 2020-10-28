<!--fixme 现在是tsx，不是ts-->
<script lang="tsx">
import Vue, {CreateElement, RenderContext, VNodeData} from "vue"
import {DefaultProps} from "vue/types/options";
import {ScopedSlot, VNode, VNodeDirective} from "vue/types/vnode";

export default Vue.extend({
  // todo
  // functional: true,
  name: "tsx-table",
  components: {},
  props: {
    hSize: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      columns6: [
        {
          title: 'Name',
          key: 'name',
          render: (h, params) => {
            return h(
                'div',
                {},
                [
                  h(
                      'Icon',
                      {
                        props: {
                          type: 'person'
                        }
                      },
                      []
                  ),
                  h(
                      'strong',
                      {},
                      [params.row.name]
                  )
                ]
            );
          }
        },
        {
          title: 'Other',
          align: 'center',
          children: [
            {
              title: 'Age',
              key: 'age',
              align: 'center',
              render: (h, params) => {
                return h(
                    'Input',
                    {
                      props: {
                        value: params.row.age,
                        clearable: true,
                        // size: "large",
                        placeholder: "Enter something...",
                      },
                      style: {
                        marginRight: '5px',
                        width: "300px",
                      },
                      on: {
                        /*click: () => {
                          (this as any).show(params.index)
                        }*/
                        input: (e) => {
                          // fixme 改变了data后，param也就跟着改变了
                          (this as any).data6[params.index].age = e;
                        }
                      }
                    },
                    []
                );
              }
            },
            {
              title: 'Address',
              key: 'address'
            },
          ],
        },
        {
          title: 'Action',
          key: 'action',
          width: 150,
          align: 'center',
          render: (h, params) => {
            return h(
                'div',
                {},
                [
                  h(
                      'Button',
                      {
                        props: {
                          type: 'primary',
                          size: 'small'
                        },
                        style: {
                          marginRight: '5px'
                        },
                        on: {
                          click: () => {
                            (this as any).show(params.index)
                          }
                        }
                      },
                      ['View']
                  ),
                  h(
                      'Button',
                      {
                        props: {
                          type: 'error',
                          size: 'small'
                        },
                        on: {
                          click: () => {
                            (this as any).remove(params.index)
                          }
                        }
                      },
                      ['Delete']
                  ),
                ]
            );
          }
        }
      ],
      data6: [
        {
          name: 'John Brown',
          age: 18,
          address: 'New York No. 1 Lake Park'
        },
        {
          name: 'Jim Green',
          age: 24,
          address: 'London No. 1 Lake Park'
        },
        {
          name: 'Joe Black',
          age: 30,
          address: 'Sydney No. 1 Lake Park'
        },
        {
          name: 'Jon Snow',
          age: 26,
          address: 'Ottawa No. 2 Lake Park'
        }
      ],
      contextLine: 0,
    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    /* fixme Render 写法
        通过给 columns 数据的项，设置一个函数 render，可以自定义渲染当前列，包括渲染自定义组件，它基于 Vue 的 Render 函数。
        render 函数传入两个参数，第一个是 h，第二个是对象，包含 row、column 和 index，分别指当前单元格数据，当前列数据，当前是第几行。
*/
    /* fixme 右键菜单 #
        4.2.0
         开启属性 show-context-menu，并配合 slot contextMenu 可以实现点击右键弹出菜单。
*/
    /* fixme 行/列合并 #
        4.0.0
         设置属性 span-method 可以指定合并行或列的算法。
          该方法参数为 4 个对象：
          row: 当前行
          column: 当前列
          rowIndex: 当前行索引
          columnIndex: 当前列索引
          该函数可以返回一个包含两个元素的数组，第一个元素代表 rowspan，第二个元素代表 colspan。 也可以返回一个键名为 rowspan 和 colspan 的对象。
*/
    /* fixme 表头分组 #
        给 column 设置 children，可以渲染出分组表头。
*/
    /* fixme 尺寸 #
        通过设置属性 size 为 large 或 small 可以调整表格尺寸为大或小，默认不填或填写 default 为中。
*/
    /* todo TimePicker 时间选择器 */
    /* todo InputNumber 数字输入框 */
    /* todo Modal 对话框
        使用 render 字段可以基于 Render 函数来自定义内容。
        使用 render 后，将不再限制类型，content 也将无效。
    */
    /* todo Carousel 走马灯*/
    /* todo 计算属性，单位转换  可以模拟manage项目写的lon、lat子组件，用render来做*/
    /* todo 要validate验证输入框是否非空，是否为数字*/
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
        <div>
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
      const index = this.data6.findIndex(item => item.name === row.name);
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
      // console.log("handleSpan", row, column, rowIndex, columnIndex);
      if (rowIndex === 0 && columnIndex === 0) {
        return [1, 2];
      } else if (rowIndex === 0 && columnIndex === 1) {
        return [0, 0];
      }
      if (rowIndex === 2 && columnIndex === 0) {
        return {
          rowspan: 2,
          colspan: 1
        };
      } else if (rowIndex === 3 && columnIndex === 0) {
        return {
          rowspan: 0,
          colspan: 0
        };
      }
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
