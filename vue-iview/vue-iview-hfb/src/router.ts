import Vue from 'vue'
import Router, {Route, RouterOptions} from 'vue-router'
import routers from "@/router/index";
import mutationType, {PagePayload} from "@/store/mutationType";

Vue.use(Router);

const router: Router = new Router({
    routes: routers
});

// 跳转路由页面权限控制，暂不需要
router.beforeEach((to, from, next) => {
    next();
    /*if ((!to.meta) || to.meta.requiresAuth !== false) {
        Security.auth(to.meta ? to.meta.auth : null).then(value => {
            // console.log(from.fullPath+" => "+to.fullPath+" => "+value);
            if (value) {
                next();
            } else {
                // console.log("从router进的")
                next(false)
                /!*next({
                    path: '/login'
                });*!/
            }
        });
    } else {
        next();
    }*/
});

const openNewPage = (vm: Vue, to: Route) => {
    if (vm && vm.$store) {
        let openPage: PagePayload = {
            name: to.name,
            path: to.path,
            title: to.meta.title
        };
        vm.$store.commit(mutationType.openPage, openPage);
    }
};


router.afterEach((to) => {
    openNewPage(router.app, to);
});

export default router;
