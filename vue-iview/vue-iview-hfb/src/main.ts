import Vue from 'vue'
import ViewUI from 'view-design';
import 'view-design/dist/styles/iview.css';

import App from './App.vue'
import router from './router'
import store from './store'
// import Security from "@/security/Security";


Vue.config.productionTip = false
Vue.use(ViewUI);
// Vue.use(Security);
new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app')
