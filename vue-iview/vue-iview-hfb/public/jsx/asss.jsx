import Vue from "vue";

export default Vue.extend({
    // functional: true,
    name: "asss",
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
            id: 0,
            tests: {
                0: "<div><span>第一道题</span></div>",
                1: `<div><section>第二道题</section></div>`,
                2: <div><p>第三道题</p></div>
            }
        };
    },
    render(createElement, context) {
        return (
            <table style="width: 100%;text-align: center;">
                <tr>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="5">机动车停车场(道路)收费明码标价</td>
                </tr>
                <tr>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1">收费依据</td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="5">湛价函[2010]208号文和湛价函[2014]68号文</td>
                </tr>
                <tr>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="2" colSpan="1">车型</td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="3">白天时段: <span name="feeRules" className="time">08:00</span>-<span name="feeRules" className="time">23:00</span></td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="2" colSpan="1">夜间时段: <span name="feeRules" className="time">00:00</span>-<span name="feeRules" className="time">08:00</span></td>
                </tr>
                <tr>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1">停车<span name="feeRules">3</span>小时内(含)
                    </td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1">停车<span name="feeRules">3</span>小时至<span name="feeRules">6</span>小时(含)
                    </td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1">停车<span name="feeRules">6</span>小时以上
                    </td>
                </tr>
                <tr>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1">微型、小型、中型客车及微型、轻型货车</td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1"><span name="feeRules" className="money">5</span>元/次
                    </td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1"><span name="feeRules" className="money">8</span>元/次
                    </td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1"><span name="feeRules" className="money">10</span>元/次
                    </td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1"><span name="feeRules" className="money">10</span>元/次
                    </td>
                </tr>
                <tr>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1">价格举报电话:</td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="5">12358</td>
                </tr>
                <tr>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="1">服务监督电话:</td>
                    <td style="height: 2rem;border: 1px #ccc solid;" rowSpan="1" colSpan="5">0759-3162699</td>
                </tr>
            </table>
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
            let buttonNodeData = {
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
                    tag:
                        <i-button {...buttonNodeData}>{this.ownTag + ":button:" + this.renderTemplate.buttonIndex}</i-button>
                }
            ];
        },
        changeButton() {
            console.log("tsx:changeButton()");
            this.renderTemplate.buttonIndex = (this.renderTemplate.buttonIndex + 1) % this.renderTemplate.buttonTemplate.length;
        },
        initFormRenderTemplate() {
            // fixme 具体参数看源码中，render()的第一个参数CreateElement中的参数data:VNodeData
            let formNodeData = {
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
                    tag: <i-form model={this.formItem} onInput={() => {
                    }} label-width={150}>
                        <form-item label={"label宽度为150px"}>
                            <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}></i-input>
                        </form-item>
                    </i-form>
                },
                {
                    data: null,
                    // fixme 如果通过「配置render()的第一个参数CreateElement中的参数data:VNodeData时」，并且把model放到VNodeData中的话，就可以不配置input事件了
                    tag: <i-form {...formNodeData}>
                        <form-item label={"label宽度为170px"}>
                            <i-input v-model={this.formItem.message} placeholder={"Enter something..dwdw."}></i-input>
                        </form-item>
                    </i-form>
                }
            ];
        },
        changeForm() {
            console.log("tsx:changeForm()");
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
});
//# sourceMappingURL=tsx.vue.jsx.map