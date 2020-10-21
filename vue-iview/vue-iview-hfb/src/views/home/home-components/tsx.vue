<!--fixme 现在是tsx，不是ts-->
<script lang="tsx">
import Vue, {CreateElement, RenderContext, VNodeData} from "vue"
import {testButton, testCircle} from "./TsxTest";
import {DefaultProps} from "vue/types/options";
import {VNode} from "vue/types/vnode";

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
      ]
    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    /*return <div class="red">
      <i-button type="info" percent="80">tsx</i-button>
    </div>*/

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

    /*const inputAttrs = {
      type: 'email',
      placeholder: 'Enter your email'
    }
    return <input {...{ attrs: inputAttrs }} />*/


    /*const inputAttrs = {
      shape: "circle",
      type: "info",
      percent: "80"
    }
    return <div class="red">
      <i-button {...{attrs: inputAttrs}} >tsx</i-button>
    </div>*/

    /*const on = {
      click: this.initUser1(),
    }*/

    /*return <div class="red">
      <i-button type="info" onClick={this.initUser1} percent="80">{this.ownTag + ":" + this.num}</i-button>
    </div>*/

    // let hText = `<h${this.hSize}>${this.ownTag + ":" + this.num}</h${this.hSize}>`;
    // let hText = "<h" + this.hSize + ">" + (this.ownTag + ":" + this.num) + "</h" + this.hSize + ">";
    let hText:string = `<i-button type=${"info"} onClick=${this.initUser1}>${this.ownTag + ":" + this.num}</i-button>`;
    // fixme 具体参数看源码中，render()的第一个参数CreateElement中的参数data:VNodeData
    const data: VNodeData = {
      props: {
        model: this.formItem,
        "label-width": 170,
      },
    };
    return (
        <div>
          <div className="red">
            <i-button type={"info"} onClick={this.initUser1}>{this.ownTag + ":" + this.num + ":" + this.formItem.message}</i-button>
            <div>`i-form标签增加mode后报错： [Vue warn]: Invalid handler for event "input": got undefined临时解决 : 可以在 i-form上加 on-input={() => {}} 解决 让他的input有事件就不会报错了 onInput={() => {}}` </div>
            <i-form model={this.formItem} onInput={() => {}} label-width={150}>
              <form-item label={"label宽度为150px"}>
                <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}></i-input>
              </form-item>
            </i-form>
            <div>如果通过「配置render()的第一个参数CreateElement中的参数data:VNodeData时」，并且把model放到VNodeData中的话，就可以不配置input事件了</div>
            <i-form {...data}>
              <form-item label={"label宽度为170px"}>
                <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}></i-input>
              </form-item>
            </i-form>
          </div>
          <div domPropsInnerHTML={hText}>

          </div>
        </div>
    );



  },
  mounted() {
    this.$nextTick(() => {

    });
  },
  activated() {
    this.$nextTick(() => {

    });
  },
  methods: {
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
//@fontSize: 12px;
//@bottom-height: 63px;
.home {
  width: 100%;
  height: 100%;
}

</style>
