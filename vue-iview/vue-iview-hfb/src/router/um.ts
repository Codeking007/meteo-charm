import {RouteConfig} from "vue-router";

import home_index from '@/views/home/index.vue';
import homeChildren from "./home";

const menu: Array<RouteConfig> = [];
menu.push(
    {
        path: 'home',
        name: 'home',
        component: home_index,
        meta: {requiresLogin: false, auth: 'home', title: '首页'},
        children: homeChildren
    },
    {
        path: '',
        name: 'emptyHome',
        meta: {requiresAuth: false, auth: 'emptyHome', title: '空首页'},
        // component: empty_home,
        redirect: '/home'
    },
);

export default menu;
