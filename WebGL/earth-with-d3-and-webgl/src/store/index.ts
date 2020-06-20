import Vue from 'vue';
import Vuex from 'vuex';
import um from './module/um';

Vue.use(Vuex);

export default {
    modules: {
        um,
    }
};
