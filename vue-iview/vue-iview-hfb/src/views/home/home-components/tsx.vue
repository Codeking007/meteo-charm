<!--fixme 现在是tsx，不是ts-->
<script lang="tsx">
import Vue, {CreateElement, RenderContext, VNodeData} from "vue"
import {ass} from "./TsxTest";
import {DefaultProps} from "vue/types/options";
import {ScopedSlot, VNode, VNodeDirective} from "vue/types/vnode";
import {transform} from "@babel/core";
import * as Babel from "@babel/core";


export default Vue.extend({
  // todo
  // functional: true,
  name: "tsx-template",
  components: {},
  props: {
    hSize: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      renderTemplate: {
        buttonIndex: null,
        buttonTemplate: [],
        formIndex:null,
        formTemplate:[]
      },
      ownTag: "tsx",
      num: 0,
      formItem: {
        message: '',
      },
      columns1: [
        {
          title: 'Name',
          key: 'name'
        },
        {
          title: 'Age',
          key: 'age'
        },
        {
          title: 'Address',
          key: 'address'
        }
      ],
      data1: [
        {
          name: 'John Brown',
          age: 18,
          address: 'New York No. 1 Lake Park',
          date: '2016-10-03'
        },
        {
          name: 'Jim Green',
          age: 24,
          address: 'London No. 1 Lake Park',
          date: '2016-10-01'
        },
        {
          name: 'Joe Black',
          age: 30,
          address: 'Sydney No. 1 Lake Park',
          date: '2016-10-02'
        },
        {
          name: 'Jon Snow',
          age: 26,
          address: 'Ottawa No. 2 Lake Park',
          date: '2016-10-04'
        }
      ],
      id: 0,
      tests: {
        0: "<div><span>第一道题</span></div>",
        1: `<div><section>第二道题</section></div>`,
        2: <div><p>第三道题</p></div>
      }
    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    /*const Tag=`h1`;
    return <Tag>111</Tag>*/

    /*return (
        <i-table columns={this.columns1} data={this.data1}>

        </i-table>
    );*/


    /*let hText = `<h${this.hSize}>${this.columns1[0].key}</h${this.hSize}>`;
    // let hText = "<h" + this.hSize + ">" + this.columns1[0].key + "</h" + this.hSize + ">";
    return (
        <div domPropsInnerHTML={hText}>

        </div>
    );*/

    // let hText = `<h${this.hSize}>${this.ownTag + ":" + this.num}</h${this.hSize}>`;
    // let hText = "<h" + this.hSize + ">" + (this.ownTag + ":" + this.num) + "</h" + this.hSize + ">";
    let hText: string = `<i-button type=${"info"} onClick=${this.initUser1}>${this.ownTag + ":" + this.num}</i-button>`;
    const buttonNodeData = {
      attrs: {},
      on: {
        click: () => {
          this.initUser1();
          console.log('buttonNodeData=>click')
        }
      },
      props: {
        type: "info"
      },
    };
    let str = '(hSize,ownTag,num,initUser1) => `<h${hSize} >${ownTag + ":" + num}</h${hSize}>`';
    let func = eval.call(null, str);

    let hButton = `<i-button ${{...buttonNodeData}}>${this.ownTag + ":" + this.num}</i-button>`;
    let strButton = '(buttonNodeData,ownTag,num) => `<i-button ${{...buttonNodeData}}>${ownTag + ":" + num}</i-button>`';
    let funcButton = eval.call(null, strButton);

    var Colors = {SUCCESS: "green", ALERT: "red"};
    var htmlFromApi = '<div className="button-basics-example"><Button color={Colors.SUCCESS}>Save</Button><Button color={Colors.ALERT}>Delete</Button></div>';

    // var Component = Babel.transform(htmlFromApi, {presets: ["jsx"]}).code;
    // return <div>{eval(Component)}</div>;

    /*Babel.transform("this.initUser1();",{presets: ["react"]}, function(err, result) {
      debugger
      console.log(result);
      console.log(eval(result.code));
    });*/

    // let transform = Babel.transform(hText);
    // console.log(transform)

    // fixme 具体参数看源码中，render()的第一个参数CreateElement中的参数data:VNodeData
    const data = {
      props: {
        model: this.formItem,
        "label-width": 170,
      },
    };



    return (
        <div>
          <div>
            <i-button type={"info"} onClick={this.changeButton}>{this.ownTag + ":button:" + this.renderTemplate.buttonIndex}</i-button>
            {(this.renderTemplate.buttonIndex!==null&&this.renderTemplate.buttonTemplate.length > 0) ? this.renderTemplate.buttonTemplate[this.renderTemplate.buttonIndex].tag : ""}
          </div>
          <br/>
          <div>
            <i-button type={"warning"} onClick={this.changeForm}>{this.ownTag + ":form表单:" + this.renderTemplate.formIndex+":"+this.formItem.message}</i-button>
            {(this.renderTemplate.formIndex!==null&&this.renderTemplate.formTemplate.length > 0) ? this.renderTemplate.formTemplate[this.renderTemplate.formIndex].tag : ""}
          </div>


          <div domPropsInnerHTML={hText}>

          </div>
          <div domPropsInnerHTML={func(this.hSize, this.ownTag, this.num, this.initUser1)}>

          </div>
          <div domPropsInnerHTML={hButton}>

          </div>
          <div domPropsInnerHTML={funcButton(buttonNodeData, this.ownTag, this.num)}>

          </div>

          <div class="red">
            {this.tests[this.id]}
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
            tag: <i-button type={"info"} onClick={this.changeButton}>{this.ownTag + ":button:" + this.renderTemplate.buttonIndex}</i-button>
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
          tag:
              <i-form model={this.formItem} onInput={() => {}} label-width={150}>
                <form-item label={"label宽度为150px"}>
                  <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}></i-input>
                </form-item>
              </i-form>
        },
        {
          data: null,
          // fixme 如果通过「配置render()的第一个参数CreateElement中的参数data:VNodeData时」，并且把model放到VNodeData中的话，就可以不配置input事件了
          tag:
              <i-form {...formNodeData}>
                <form-item label={"label宽度为170px"}>
                  <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}></i-input>
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
      this.id = (this.id + 1) % 3;
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
