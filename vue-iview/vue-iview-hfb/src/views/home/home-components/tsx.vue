<!--fixme 现在是tsx，不是ts-->
<script lang="tsx">
import Vue, {CreateElement, RenderContext} from "vue"
import {testButton, testCircle} from "./TsxTest";
import {DefaultProps} from "vue/types/options";
import {VNode} from "vue/types/vnode";

export default Vue.extend({
  // functional: true,
  name: "bbb",
  components: {},
  data() {
    return {
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

    let MyTable=`<i-table columns={this.columns1} data={this.data1}/>`;
    return (
        <i-table columns={this.columns1} data={this.data1}/>
    )
  },
  mounted() {
    this.initUser();
    this.$nextTick(() => {

    });
  },
  activated() {
    this.$nextTick(() => {

    });
  },
  methods: {
    initUser() {

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
