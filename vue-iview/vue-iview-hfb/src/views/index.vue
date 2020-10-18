<template>
  <div class="app-main">
    <!--顶部菜单栏-->
    <div class="top-pane">

    </div>
    <!--页面详情栏-->
    <div class="um-central-pane" id="umCentralPane">
      <!--通过路由route跳转后显示的页面都在这里-->
      <div id="main-view" class="main-view"> <!--v-if="$store.state.um.user"退出登录后直接销毁组件，避免各个页面的数据清除-->
        <keep-alive>
          <router-view></router-view>
        </keep-alive>
      </div>
    </div>
    <!--底部菜单栏-->
    <transition-group name="menu-down" tag="div">
      <div key="bottom-menu" v-show="showBottomMenu">
        <div class="um-bottom-pane" id="umBottomPane">
          <button
              v-for="(item, index) in openedList"
              :key="item.path"
              :name="item.path"
              @tap="clickTab(item)"
              :class="{
                        'um-bottom-button':true,
                        'um-bottom-button-active':item.current,
                        'mui-icon':true,
                        'main-home':index===0,
                        'main-service':index===1,
                        'main-message':index===2,
                        'main-icon main-my':index===3
                    }"
          >

            <div class="um-bottom-text">{{ item.title }}</div>
            <span class="mui-badge" style="left: calc(50% + 20px);top: calc(0% + 2px);"
                  v-if="index===2&&allUnreadMessageNum&&allUnreadMessageNum>0">{{ allUnreadMessageNum }}</span>
          </button>
        </div>
      </div>
    </transition-group>
    <transition name="show-login">
      <login v-show="showOrHideLogin" @hideLogin="hideLogin" style="z-index: 12;position: absolute;top:0;">

      </login>
    </transition>
  </div>

</template>
<script lang="ts">
import Vue from 'vue';
import Login from "@/views/login.vue";
import mutationType from "@/store/mutationType";

export default Vue.extend({
  name: 'main-app',
  components: {
    Login
  },
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
    showBottomMenu() {
      return this.$store.state.um.showBottomMenu
    },
    showOrHideLogin() {
      return this.$store.state.um.showOrHideLogin
    }
  },
  mounted() {
  },
  methods: {
    clickTab(item) {
      this.$router.push({path: item.path});
    },
    showLogin() {
      this.$store.commit(mutationType.showOrHideLogin, {showOrHideLogin: true});
    },
    hideLogin() {
      this.$store.commit(mutationType.showOrHideLogin, {showOrHideLogin: false});
    }
  },
  /**
   *
   */
  activated() {
    this.openedList.forEach((item) => {
      item.current = item.name === this.$route.name
    });
  },
  /**
   * 路由更新，即切换下面四个菜单tab时变色
   * @param to
   * @param from
   * @param next
   */
  beforeRouteUpdate(to, from, next) {
    this.openedList.forEach((item) => {
      item.current = item.name === to.name
    });
    next();
  }
});
</script>
<style scoped lang="less">
.menu-down-enter-active, .menu-down-leave-active {
  transition: all 0.5s;
  /*transition-timing-function: linear;*/
}

.menu-down-enter, .menu-down-leave-to {
  transform: translateY(100%);
  /*transition-timing-function: linear;*/
}

.show-login-enter-active, .show-login-leave-active {
  transition: all 1s;
}

.show-login-enter, .show-login-leave-to {
  transform: translateY(100%);
}
</style>
