<script lang="jsx">
import {CreateElement} from "vue";
import * as Babel from "@babel/core";

export default {
  // todo
  // functional: true,
  name: "jsx-template",
  components: {},
  props: {
    hSize: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      ownTag: "jsx",
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
  render(h, context) {
    /*return <div class="red">
      <i-button type="info" percent="80">jsx</i-button>
    </div>*/

    /*const Tag=`h1`;
    return <Tag>111</Tag>*/

    /*return (
        <i-table columns={this.columns1} data={this.data1}>

        </i-table>
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
      <i-button {...{attrs: inputAttrs}} >jsx</i-button>
    </div>*/

    /*return <div class="red">
      <i-button type="info" onClick={this.initUser1} percent="80">{this.ownTag + ":" + this.num}</i-button>
    </div>*/

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
    let hText = `<h${this.hSize}>${this.ownTag + ":" + this.num}</h${this.hSize}>`;
    // let hText = "<h" + this.hSize + ">" + (this.ownTag + ":" + this.num) + "</h" + this.hSize + ">";
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
          <div className="red">
            <i-button type={"error"}
                      onClick={this.initUser1}>{this.ownTag + ":" + this.num + ":" + this.formItem.message}</i-button>
            <i-button {...buttonNodeData}>{this.ownTag + ":" + this.num + ":" + this.formItem.message}</i-button>
            <div>`i-form标签增加mode后报错： [Vue warn]: Invalid handler for event "input": got undefined临时解决 : 可以在 i-form上加
              on-input={() => {
              }} 解决 让他的input有事件就不会报错了 onInput={() => {
              }}`
            </div>
            <i-form model={this.formItem} onInput={() => {
            }} label-width={150}>
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
          <div domPropsInnerHTML={func(this.hSize, this.ownTag, this.num, this.initUser1)}>

          </div>
          <div domPropsInnerHTML={hButton}>

          </div>
          <div domPropsInnerHTML={funcButton(buttonNodeData, this.ownTag, this.num)}>

          </div>
        </div>
    );


  },
  methods: {
    initUser1(content) {
      console.log(this.ownTag + ":" + this.num);
      this.num++;
      return 123;
    },
  },
}
</script>