<template>
  <div class="um-page">
    <div class="password-top">
      <!--<div class="mui-icon mui-icon-arrowleft" @tap="back" style="font-size: 15px;width: 20px;height: 20px;"></div>-->
      <div class="mui-icon mui-icon-closeempty" @tap="hideFindPasswordPage()"
           style="font-size: 30px;float:right;"></div>
    </div>
    <div class="password-central mui-scroll-wrapper">
      <div class="mui-scroll">
        <form class="mui-input-group" ref="registerForm" :model="form"
              style="display: initial;background: black;height: 100%;width:100%;font-size: 15px;">
          <div class="password-content-top">
            <div class="um-logo"></div>
          </div>

          <div class="password-content-central">
            <div class="password-content-con">
              <label><span class="mui-icon mui-icon-contact password-content-con-label"></span></label>
              <input v-model="form.account" type="text" class="mui-input-clear password-content-con-input"
                     placeholder="account">
            </div>
            <div class="password-content-con margin-top-10">
              <label><span class="mui-icon mui-icon-email password-content-con-label"></span></label>
              <input v-model="form.email" type="text" class="mui-input-clear"
                     style="width: 60%;font-size: 15px;" placeholder="abc@email.com">

              <div style="width: 24%;display: inline-block">
                <div
                    style="display:inherit;width: 2px;height: 16px;margin-right:16px;background: rgba(255,255,255,0.4)"></div>
                <span style="color: rgb(243, 78, 14);"
                      @tap="sendEmailVerifyCode">send{{ waitSeconds === 0 ? '' : '(' + waitSeconds + ')' }}</span>
              </div>

            </div>
            <div class="password-content-con margin-top-10">
              <label><span
                  class="mui-icon whiconfont icon-dunpai password-content-con-label"></span></label>
              <input v-model="form.code" type="text" class="mui-input-clear password-content-con-input"
                     placeholder="verification code">
            </div>
            <div class="password-content-con margin-top-10">
              <label><span class="mui-icon mui-icon-locked password-content-con-label"></span></label>
              <input v-model="form.password" type="password"
                     class="mui-input-password password-content-con-input" placeholder="new password">
            </div>
            <div class="password-content-con margin-top-10">
              <label><span class="mui-icon mui-icon-locked password-content-con-label"></span></label>
              <input v-model="form.checkPassword" type="password"
                     class="mui-input-password password-content-con-input" placeholder="confirm password">
            </div>

            <div class="password-content-bottom-button">
              <button type="button" class="mui-btn mui-btn-primary" @tap="resetPassWord">
                FINISH
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import service from "../service"
//模块功能：找回密码
export default Vue.extend({
  name: "password",
  data() {
    return {
      form: {
        verifySessionKey: '',
        imgUrl: '',
        account: '',
        password: '',
        checkPassword: '',
        nickname: '',
        email: '',
        code: '',
        agreed: false,
      },
      waitSeconds: 0,
      interval: null,
    }
  },
  mounted() {
    this.$mui('.mui-scroll-wrapper').scroll({
      scrollY: true, //是否竖向滚动
      scrollX: false, //是否横向滚动
      startX: 0, //初始化时滚动至x
      startY: 0, //初始化时滚动至y
      indicators: false, //是否显示滚动条
      deceleration: 0.0006, //阻尼系数,系数越小滑动越灵敏
      bounce: true //是否启用回弹
    });
  },
  methods: {
    back() {
      this.$router.back();
    },
    hideFindPasswordPage() {
      this.$emit("hideFindPasswordPage");
    },
    guid32() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }).replace(/-/g, "");
    },
    clearRegisterSendInterval() {
      clearInterval(this.interval);
    },
    sendEmailVerifyCode() {
      if (this.waitSeconds > 0) {
        return;
      }
      this.waitSeconds = 60;
      this.form.verifySessionKey = this.guid32();
      this.interval = setInterval(() => {
        if (this.waitSeconds > 0) {
          this.waitSeconds--;
        } else {
          this.clearRegisterSendInterval();
        }
      }, 1000);
      service.security.sendMailCode(this.form.verifySessionKey, this.form.email, 1, this.form.account).then(data => {
        this.$mui.toast(data.message, {duration: 'long', type: 'div'});
      }).catch(reason => {
        this.$mui.toast(reason, {duration: 'long', type: 'div'});
        this.waitSeconds = 0;
      });
    },
    resetPassWord() {
      service.security.updatePasswordWithMail(
          this.form.verifySessionKey,
          this.form.code,
          this.form.password,
          this.form.checkPassword,
          this.form.account,
          this.form.email
      ).then(data => {


        this.$mui.toast("更改密码成功", {duration: 'long', type: 'div'});
        // this.back();
        this.hideFindPasswordPage();
      })

    }
  }
})
</script>

<style scoped>
.password-top {
  width: 100%;
  height: 40px;
  position: relative;
  padding: 10px 8px;
}

.password-central {
  width: 100%;
  height: calc(100% - 40px);
  position: relative;
}

.password-content-top {
  width: 100%;
  height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.um-logo {
  width: 150px;
  height: 150px;
  background-image: url("../assets/img/logo.png");
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 50%;
  overflow: hidden;
}

.password-content-central {
  width: 100%;
  height: auto;
  padding-right: 30px;
  padding-left: 30px;
}

.password-content-con {
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  text-align: center;
  width: 100%;
  position: relative;
}

.password-content-con-label {
  width: 15%;
}

.password-content-con-input {
  width: 85%;
  font-size: 15px;
}

.password-content-bottom-button {
  text-align: center;
  width: 100%;
  margin-top: 18px;
}

.password-content-bottom-button button {
  height: 42px;
  width: 80%;
  border-radius: 20px;
}

input[type='button'], input[type='submit'], input[type='reset'], button, .mui-btn {
  border: none;
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

</style>
