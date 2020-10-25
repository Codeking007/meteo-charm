import {RouteConfig} from "vue-router";

import home_index from '@/views/home/index.vue';
import home_index1 from '@/views/home/index1.vue';
import home_index2 from '@/views/home/index2.vue';
// import homeChildren from "./home";

const menu: Array<RouteConfig> = [];
menu.push(
    {
        path: 'home',
        name: 'home',
        component: home_index,
        meta: {requiresLogin: false, auth: 'home', title: '首页'},
        // children: homeChildren
    },
    {
        path: 'home1',
        name: 'home1',
        component: home_index1,
        meta: {requiresLogin: false, auth: 'home', title: '首页'},
        // children: homeChildren
    },
    {
        path: 'home2',
        name: 'home2',
        component: home_index2,
        meta: {requiresLogin: false, auth: 'home', title: '首页'},
        // children: homeChildren
    },
);

export default menu;
