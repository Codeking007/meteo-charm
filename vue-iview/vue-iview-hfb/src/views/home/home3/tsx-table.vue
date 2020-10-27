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
            return h('div', [
              h('Icon', {
                props: {
                  type: 'person'
                }
              }),
              h('strong', params.row.name)
            ]);
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
                return h('Input', {
                  props: {
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
                    input(e) {
                      // this.text=e.target.value
                      console.log(params)
                      console.log(e)
                    }
                  }
                });
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
            return h('div', [
              h('Button', {
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
              }, 'View'),
              h('Button', {
                props: {
                  type: 'error',
                  size: 'small'
                },
                on: {
                  click: () => {
                    (this as any).remove(params.index)
                  }
                }
              }, 'Delete')
            ]);
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
      renderTemplate: {
        buttonIndex: null,
        buttonTemplate: [],
        formIndex: null,
        formTemplate: [],
        hText: null,
        str: null,
        func: () => {
        },
        test1: null,
      },
      ownTag: "tsx",
      num: 0,
      formItem: {
        message: '',
      },
      contextLine: 0,

    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    /* fixme Render 写法
        通过给 columns 数据的项，设置一个函数 render，可以自定义渲染当前列，包括渲染自定义组件，它基于 Vue 的 Render 函数。
        render 函数传入两个参数，第一个是 h，第二个是对象，包含 row、column 和 index，分别指当前单元格数据，当前列数据，当前是第几行。
*/
    /* todo 右键菜单 #
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

    /* todo 尺寸 #
        通过设置属性 size 为 large 或 small 可以调整表格尺寸为大或小，默认不填或填写 default 为中。
*/

    return (
        <div>
          <i-table context-menu show-context-menu highlight-row border on-contextmenu={this.handleContextMenu}
                   span-method={this.handleSpan} columns={this.columns6} data={this.data6}>
            <template slot="contextMenu">
              <dropdownItem nativeOnClick={this.handleContextMenuEdit}>编辑</dropdownItem>
              <dropdownItem nativeOnClick={this.handleContextMenuDelete} style="color: #ed4014">删除</dropdownItem>
            </template>
          </i-table>

          <div>
            <i-button type={"info"}
                      onClick={this.changeButton}>{this.ownTag + ":button:" + this.renderTemplate.buttonIndex}</i-button>
            {(this.renderTemplate.buttonIndex !== null && this.renderTemplate.buttonTemplate.length > 0) ? this.renderTemplate.buttonTemplate[this.renderTemplate.buttonIndex].tag : ""}
          </div>
          <br/>
          <div>
            <i-button type={"warning"}
                      onClick={this.changeForm}>{this.ownTag + ":form表单:" + this.renderTemplate.formIndex + ":" + this.formItem.message}</i-button>
            {(this.renderTemplate.formIndex !== null && this.renderTemplate.formTemplate.length > 0) ? this.renderTemplate.formTemplate[this.renderTemplate.formIndex].tag : ""}
          </div>
        </div>
    );
  },
  mounted() {
    this.initButtonRenderTemplate();
    this.initFormRenderTemplate();
    this.$nextTick(() => {

    });
  },
  activated() {
    this.$nextTick(() => {

    });
  },
  methods: {
    show(index) {
      this.$Modal.info({
        title: 'User Info',
        content: `Name：${this.data6[index].name}<br>Age：${this.data6[index].age}<br>Address：${this.data6[index].address}`
      })
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
    initButtonRenderTemplate() {
      let buttonNodeData: VNodeData = {
        props: {
          type: "success",
        },
        on: {
          click: () => {
            this.changeButton();
          }
        },
      };
      this.renderTemplate.buttonIndex = 0;
      this.renderTemplate.buttonTemplate = [
        {
          data: null,
          tag: <i-button type="error" percent="80">绑定属性</i-button>
        },
        {
          data: null,
          // todo 这里有个bug，一开始初始化时，拿到的是this.renderTemplate.buttonIndex中的属性值0（本来是null的，是在上一行代码进行的初始化设置为0的），所以tag就拿到了值0，而不是值1.需要解决
          // todo 说明在跳进来初始化tag时，是用的最开始的初始化值0，而不是同步更新的值1
          // todo 难道需要先更新data的数据，然后再加载这个渲染模板？这样就能一开始就拿到最新的数值了
          tag: <i-button type={"info"}
                         onClick={this.changeButton}>{this.ownTag + ":button:" + this.renderTemplate.buttonIndex}</i-button>
        },
        {
          data: buttonNodeData,
          // todo 这里有个bug，一开始初始化时，拿到的是this.renderTemplate.buttonIndex中的属性值0（本来是null的，是在上一行代码进行的初始化设置为0的），所以tag就拿到了值0，而不是值1.需要解决
          // todo 说明在跳进来初始化tag时，是用的最开始的初始化值0，而不是同步更新的值1
          // todo 难道需要先更新data的数据，然后再加载这个渲染模板？这样就能一开始就拿到最新的数值了
          tag: <i-button {...buttonNodeData}>{this.ownTag + ":button:" + this.renderTemplate.buttonIndex}</i-button>
        }
      ];
    },
    changeButton() {
      console.log("tsx:changeButton()")
      this.renderTemplate.buttonIndex = (this.renderTemplate.buttonIndex + 1) % this.renderTemplate.buttonTemplate.length;
    },
    initFormRenderTemplate() {
      // fixme 具体参数看源码中，render()的第一个参数CreateElement中的参数data:VNodeData
      let formNodeData: VNodeData = {
        props: {
          model: this.formItem,
          "label-width": 170,
        },
      };
      this.renderTemplate.formIndex = 0;
      this.renderTemplate.formTemplate = [
        {
          data: null,
          // fixme i-form标签增加mode后报错： [Vue warn]: Invalid handler for event "input": got undefined临时解决 : 可以在 i-form上加 on-input={() => {}} 解决 让他的input有事件就不会报错了 onInput={() => {}}
          // fixme 因为package.json中引入的@vue/babel-preset-jsx模块中的package.json引入了@vue/babel-sugar-v-model模块和@vue/babel-sugar-v-on模块，所以这里vue的v-model语法糖才起作用
          tag:
              <i-form model={this.formItem} onInput={() => {
              }} label-width={150}>
                <form-item label={"label宽度为150px"}>
                  <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}/>
                </form-item>
              </i-form>
        },
        {
          data: null,
          // fixme 如果通过「配置render()的第一个参数CreateElement中的参数data:VNodeData时」，并且把model放到VNodeData中的话，就可以不配置input事件了
          tag:
              <i-form {...formNodeData}>
                <form-item label={"label宽度为170px"}>
                  <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}/>
                </form-item>
              </i-form>
        }
      ];
    },
    changeForm() {
      console.log("tsx:changeForm()")
      this.renderTemplate.formIndex = (this.renderTemplate.formIndex + 1) % this.renderTemplate.formTemplate.length;
    },
    initUser1(content) {
      console.log(this.ownTag + ":" + this.num);
      this.num++;
    },
  },
  computed: {},
  watch: {}

})
</script>

<style scoped lang="less">

</style>
