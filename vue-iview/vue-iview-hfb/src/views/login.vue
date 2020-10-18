<template>
  <div key="login" class="login">
    <div class="login-top">
      <!--<span class="mui-icon mui-icon-arrowleft" @tap="toHome()" style="font-size: 15px;">Back</span>-->
      <span class="mui-icon mui-icon-closeempty" @tap="hideLogin()" style="font-size: 30px;float:right;"></span>
    </div>
    <!--内容区-->
    <div class="login-central mui-scroll-wrapper">
      <form class="mui-input-group" ref="loginForm" :model="form"
            style="display: initial;height: 100%;width:100%;font-size: 15px;">
        <!--头像or Logo-->
        <div class="login-content-top">
          <!--todo：这里暂时没加头像img，贴了个背景图-->
          <div v-model="form.imgUrl" class="login-media"></div>
        </div>

        <!--表单-->
        <div class="login-content-central">
          <div class="login-content-con">
            <label><span class="mui-icon mui-icon-contact login-content-con-label"></span></label>
            <input v-model="form.account" type="text" class="mui-input-clear login-content-con-input"
                   placeholder="account">
          </div>
          <br/>
          <div class="login-content-con">
            <label><span class="mui-icon mui-icon-locked login-content-con-label"></span></label>
            <input v-model="form.password" type="password"
                   class="mui-input-password login-content-con-input" placeholder="password">
          </div>
          <!--忘记密码-->
          <div class="login-forget-text">
            <h5 style="margin-top: 14px;color: #f34e0e" @tap="toFindPass">Forgot your password?</h5>
          </div>

          <div class="login-content-bottom-button">
            <button type="button" class="mui-btn mui-btn-primary" @tap="toLogin">
              SIGN IN
            </button>
          </div>

          <div class="login-no-account-text">
            <!--<h5 style="color: white">Don't have an account?</h5>-->
            <h5 style="color: #8491a5">Don't have an account?</h5>
          </div>
          <div class="login-register-text" @tap="toRegister">
            <!--<h4 style="color: #f34e0e">REGISTER</h4>-->
            <h4 style="color: rgb(243, 78, 14)">REGISTER</h4>
          </div>
        </div>
      </form>
    </div>
    <transition name="tran-bottom">
      <register v-show="showRegisterPage" @hideRegisterPage="hideRegisterPage" :showRegisterPage="showRegisterPage"
                style="position: absolute;z-index: 2;top: 0px;"></register>
    </transition>
    <transition name="tran-bottom">
      <password v-show="showFindPasswordPage" @hideFindPasswordPage="hideFindPasswordPage"
                style="position: absolute;z-index: 2;top: 0px;"></password>
    </transition>

  </div>
  <!--</transition-group>-->
</template>

<script lang="ts">
import Vue from 'vue';
import service from "../service";
import mutationType from "@/store/mutationType";
import Register from "@/views/register.vue";
import Password from "@/views/password.vue";

declare let window: any;
declare let plus: any;
export default Vue.extend({
  data() {
    return {
      showRegisterPage: false,
      showFindPasswordPage: false,
      loginMethod: "normal",
      form: {
        account: '',
        password: '',
        imgUrl: ''
      },
      rules: {},
      oauthOptions: {
        auths: null,
        aweixin: null,
        authOptions: {
          scope: "snsapi_userinfo",
          state: "unimet_app_login",
          appId: "",
          appSecret: "",
          appKey: "",
          redirectUri: "",
        },
        stateNum: 0,
        code: null,

      },
    };
  },
  components: {
    Register,
    Password
  },
  beforeRouteLeave(to, from, next) {
    next();
  },
  created() {
    this.$mui('.mui-scroll-wrapper').scroll({
      scrollY: true, //是否竖向滚动
      scrollX: false, //是否横向滚动
      startX: 0, //初始化时滚动至x
      startY: 0, //初始化时滚动至y
      indicators: true, //是否显示滚动条
      deceleration: 0.0006, //阻尼系数,系数越小滑动越灵敏
      bounce: true //是否启用回弹
    });
  },

  activated() {
    /*Security.auth("").then((isAuth) => {
        if (isAuth) this.$router.push({path: "/home"})
    });*/
  },
  methods: {
    toHome() {
      if ((this.$route.query && this.$route.query.fromPath)) {
        this.$router.push({path: this.$route.query.fromPath, query: {toggle: false}})
      } else {
        this.$router.push({path: "/home", query: {toggle: false}})
      }
    },
    hideLogin() {
      this.$store.commit(mutationType.showOrHideLogin, {showOrHideLogin: false});
    },
    hideRegisterPage() {
      this.showRegisterPage = false;
    },
    hideFindPasswordPage() {
      this.showFindPasswordPage = false;
    },
    // 绑定clientid
    uploadClientId() {
      // 获取客户端标识信息
      let info: any = plus.push.getClientInfo();
      /*console.log("info "+JSON.stringify(info));
      console.log("info.token "+info.token);
      console.log("info.clientid "+info.clientid);
      console.log("info.appid "+info.appid);
      console.log("info.appkey "+info.appkey);*/
      let userClientEntity = new UserClientEntity();
      userClientEntity.key = info.clientid;
      userClientEntity.userKey = this.$user.key;
      service.userClient.bind(userClientEntity).then(() => {
        // console.log("clientId传到后台了")
      })
    },
    toFindPass() {
      this.showFindPasswordPage = true;
      // this.$router.push({path: "/passwordWithMail"})
    },
    toRegister() {
      this.showRegisterPage = true;
      // this.$router.push({path: "/register"});
    },
    toLogin() {
      if (!(this.form.account && this.form.account !== "")) {
        this.$mui.alert("请输入用户名", "提示", "确定", null);
      } else if (!(this.form.password && this.form.password !== "")) {
        this.$mui.alert("请输入密码", "提示", "确定", null);
      } else {
        if (this.loginMethod == "normal") {
          Security.login(this.form.account, this.form.password).then(() => {
            if (process.env.NODE_ENV === "production") {
              this.uploadClientId();
              plus.storage.setItem("unimet-account", this.form.account);
              plus.storage.setItem("unimet-password", this.form.password);
              let unimetAccount = plus.storage.getItem("unimet-account");
              let unimetPassword = plus.storage.getItem("unimet-password");
              // console.log("unimetAccount => " + unimetAccount);
              // console.log("unimetPassword => " + unimetPassword);
            }
            // this.toHome();
            this.hideLogin();
            // this.$router.push({path: "/home"});
          }).catch(reason => {
            // alert(reason)
            // this.$mui.alert("用户名/密码输入错误", "提示", "确定", null);
            this.$mui.alert(reason, "提示", "确定", null);
            // console.error(reason);
          });
        }
      }
    },
  }
});
</script>

<style lang="less" scoped>
.tran-bottom-enter-active, .tran-bottom-leave-active {
  transition: all 1s;
}

.tran-bottom-enter, .tran-bottom-leave-to {
  transform: translateY(100%);
}

.login {
  /*background: #2e354a;*/
  background: -webkit-linear-gradient(#4f586c, #2e354a);
  /*background: #4f586c;*/
  width: 100%;
  height: 100%;
  color: white;
}

.login-top {
  width: 100%;
  height: 40px;
  position: relative;
  padding: 10px 8px;
}

.login-central {
  width: 100%;
  height: 100%;
  position: relative;
}

.login-content-top {
  width: 100%;
  height: 40%;
  display: flex;
  align-items: center;
}

.login-content-central {
  width: 100%;
  height: auto;
  padding-left: 45px;
  padding-right: 45px;
}


.login-media {
  top: 20px;
  left: calc(50% - 75px);
  width: 150px;
  height: 150px;
  /*background-image: url("../assets/world.jpg");*/
  background-image: url("../assets/img/logo.png");
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  text-align: center;
}

.login-content-con {
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  text-align: center;
  width: 100%;
}

.login-content-con-label {
  width: 15%;
}

.login-content-con-input {
  width: 85%;
  font-size: 15px;
}

.login-content-bottom-button {
  text-align: center;
  width: 100%;
  margin-top: 24px;
}

.login-content-bottom-button button {
  height: 42px;
  width: 80%;
  border-radius: 20px;
}

.login-forget-text {
  display: flex;
  justify-content: flex-end;
}

.login-no-account-text {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.login-register-text {
  display: flex;
  justify-content: center;
}

input::-webkit-input-placeholder {
  /* WebKit browsers */
  color: #677387;
}

input:-moz-placeholder {
  /* Mozilla Firefox 4 to 18 */
  color: #677387;
}

input::-moz-placeholder {
  /* Mozilla Firefox 19+ */
  color: #677387;
}

input::-ms-input-placeholder {
  /* Internet Explorer 10+ */
  color: #677387;
}

@media screen and (max-width: 350px) {

  .login-content-top {

    height: 30%;
  }
}

</style>
