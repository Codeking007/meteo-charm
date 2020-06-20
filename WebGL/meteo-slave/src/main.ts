import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import UnimetMeteo from 'unimet-meteo';
console.log(UnimetMeteo);

Vue.config.productionTip = false;

Vue.use(UnimetMeteo);
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
