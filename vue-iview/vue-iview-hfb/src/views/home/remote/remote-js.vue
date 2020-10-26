<script lang="ts">
import Vue, {CreateElement, RenderContext, VNodeData} from "vue"
import {DefaultProps} from "vue/types/options";
import {ScopedSlot, VNode, VNodeDirective} from "vue/types/vnode";

export default Vue.extend({
  name: "remote-js",
  components: {},
  props: {
    src: {
      type: String,
      required: true
    },
  },
  data() {
    return {}
  },
  render(createElement: CreateElement, context: RenderContext<DefaultProps>): VNode {
    // return createElement('script', { attrs: { type: 'text/javascript', src: this.src }});
    return createElement('script', {attrs: {type: 'text/jsx', src: this.src}});
  },
})
</script>

