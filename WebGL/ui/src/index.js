import Vue from "vue";
import UnimetKey from "./lib/aa/index";
import UnimetAbc from "./lib/cc/index";
// fixme:1
Vue.component(UnimetKey.name, UnimetKey);
Vue.component(UnimetAbc.name, UnimetAbc);
export {UnimetKey,UnimetAbc};
// todo:1
/*const Components = {
    UnimetKey,
    UnimetAbc
};

Object.keys(Components).forEach(name => {
    Vue.component(name, Components[name]);
});

export default Components;*/




