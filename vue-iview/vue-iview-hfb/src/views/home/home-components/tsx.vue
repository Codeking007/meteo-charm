<!--fixme 现在是tsx，不是ts-->
<script lang="tsx">
import Vue, {CreateElement, RenderContext, VNodeData} from "vue"
import {DefaultProps} from "vue/types/options";
import {ScopedSlot, VNode, VNodeDirective} from "vue/types/vnode";
// import { transform } from "@babel/core";
// import * as babel from "@babel/core";

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
        formIndex: null,
        formTemplate: [],
      },
      ownTag: "tsx",
      num: 0,
      formItem: {
        message: '',
      },
    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    // let hText = `<h${this.hSize} onClick="${this.initUser1}">${this.ownTag + ":" + this.num}</h${this.hSize}>`;
    let hText = "<h" + this.hSize + ">" + (this.ownTag + ":" + this.num) + "</h" + this.hSize + ">";
    let str = '(hSize,ownTag,num,initUser1) => `<h${hSize}>${ownTag + ":" + num}</h${hSize}>`';
    let func = eval.call(null, str);

    // 模板字符串的大括号内部，就是执行JavaScript代码
    // 如果执行完JavaScript代码后，大括号中的值不是字符串，将按照一般的规则转为字符串。比如，大括号中是一个对象，将默认调用对象的toString方法。

    /*var Colors = {SUCCESS: "green", ALERT: "red"};
    var Button = ({color, children}) => (
        <button style={{backgroundColor: color}}>{children}</button>
    );
    var htmlFromApi = '<div className="button-basics-example"><Button color={Colors.SUCCESS}>Save</Button><Button color={Colors.ALERT}>Delete</Button></div>';

    debugger
    var Component = babel.transform(htmlFromApi, {presets: ["react"]}).code;
    return <div>{eval(Component)}</div>;*/


    return (
        <div>
          <div domPropsInnerHTML={hText}>

          </div>
          <div domPropsInnerHTML={func(this.hSize, this.ownTag, this.num, this.initUser1)}>

          </div>

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
                  <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."} />
                </form-item>
              </i-form>
        },
        {
          data: null,
          // fixme 如果通过「配置render()的第一个参数CreateElement中的参数data:VNodeData时」，并且把model放到VNodeData中的话，就可以不配置input事件了
          tag:
              <i-form {...formNodeData}>
                <form-item label={"label宽度为170px"}>
                  <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."} />
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
