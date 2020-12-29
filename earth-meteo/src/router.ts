import Vue from 'vue'
import Router, {Route, RouterOptions} from 'vue-router'
import routers from "@/router/index";
import store from "@/store";
Vue.use(Router);

const router: Router = new Router({
  routes: routers
});

// 跳转路由页面权限控制，暂不需要
router.beforeEach((to, from, next) => {
  next();
});

router.afterEach((to) => {

});

export default router;
