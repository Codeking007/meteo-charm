<!--fixme 现在是tsx，不是ts-->
<script lang="tsx">
import Vue from "vue"

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
  render(h, context) {
    return (
        <div class="red">
          <Button type="info">Info</Button>
          ccc
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
