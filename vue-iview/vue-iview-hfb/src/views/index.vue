<template>
  <div class="app-main">
    <!--顶部菜单栏-->
    <!--页面详情栏 通过路由route跳转后显示的页面都在这里-->
    <div id="main-view" class="main-view">
      <Button type="primary" @click="clickTab()">主页面==>首页</Button>
      <keep-alive>
        <router-view></router-view>
      </keep-alive>
    </div>
    <!--底部菜单栏-->
  </div>

</template>
<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'main-app',
  components: {},
  data() {
    return {
      openedList: this.$store.state.um.pageOpenedList,
      messageTimer: null,
    };
  },
  computed: {
    allUnreadMessageNum() {
      return this.$store.getters.allUnreadMessagesNum
    },
  },
  mounted() {
  },
  methods: {
    clickTab() {
      this.$router.push({path: "/home"});
    },
    showLogin() {
      // this.$store.commit(mutationType.showOrHideLogin, {showOrHideLogin: true});
    },
  },
  activated() {
    /*this.openedList.forEach((item) => {
      item.current = item.name === this.$route.name
    });*/
  },
});
</script>
<style scoped lang="less">
.app-main {
  width: 100%;
  height: 100%;
}
</style>
