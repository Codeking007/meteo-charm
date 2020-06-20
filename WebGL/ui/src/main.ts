import Vue from 'vue'
import iView from 'iview';
import 'iview/dist/styles/iview.css';
import App from './App.vue';
// import UnimetKey from "./lib/index";
// import UnimetValue from "./lib/index"
Vue.config.productionTip = false;
Vue.use(iView);
// Vue.use(UnimetKey);
// Vue.use(UnimetValue);


new Vue({
  render: h => h(App)
}).$mount('#app');
