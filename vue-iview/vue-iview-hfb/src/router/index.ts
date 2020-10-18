import {RouteConfig} from "vue-router";
import um from "@/router/um";
import Index from '@/views/index.vue';
import login from "@/views/login.vue";
import register from "@/views/register.vue";
import password from "@/views/password.vue";

const routers: Array<RouteConfig> = [
    {
        path: '/login',
        name: 'login',
        meta: {requiresLogin: false, requiresAuth: false, auth: 'login', title: '登录页面'},
        component: login
    },
    {
        path: '/register',
        name: 'register',
        meta: {requiresLogin: false, requiresAuth: false, auth: 'register', title: '注册页面'},
        component: register
    },
    {
        path: "/passwordWithMail",
        name: "passwordWithMail",
        meta: {requiresLogin: false, requiresAuth: false, auth: 'passwordWithMail', title: '找回密码'},
        component: password
    },
    {
        path: '/',
        name: '',
        meta: {auth: '', title: '主页面'},
        component: Index,
        children: um
    },
    {
        path: '*',
        redirect: '/'
    },
];

export default routers;
