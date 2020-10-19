import {RouteConfig} from "vue-router";
import um from "@/router/um";
import index from '@/views/index.vue';

const routers: Array<RouteConfig> = [
    {
        path: '/',
        name: '',
        meta: {auth: '', title: '主页面'},
        component: index,
        children: um
    },
    {
        path: '*',
        redirect: '/'
    },
];

export default routers;
