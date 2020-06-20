import {RouteConfig} from "vue-router";
import Index from '@/views/index.vue';
import um from "@/router/um";
const routers:Array<RouteConfig>= [
    {
        path: '/',
        name: '',
        meta: {auth: '', title: '主页面'},
        component: Index,
        children:um
    },
    {
        path: '*',
        redirect: '/'
    },
];

export default routers;
