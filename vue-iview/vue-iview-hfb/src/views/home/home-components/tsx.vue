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
      berthPorts: [
        {name: "AMSTERDAM", time: new Date()},
      ],
    }
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    return (
        <div class="red">
          <i-button type="info" percent="80">tsx</i-button>
        </div>
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
