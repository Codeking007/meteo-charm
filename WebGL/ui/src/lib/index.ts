import Vue, {ComponentOptions, PluginFunction, PluginObject, VueConstructor} from "vue";
import UnimetValue from "./bb/index";
import UnimetAsd from "./dd/index";

/*let components = [
    UnimetValue,
    UnimetAsd
];

const install:PluginFunction<any> = (vm:typeof Vue)=>{
    for (let componentsKey in components) {
        Vue.component(componentsKey, components[componentsKey]);
    }
};
export {install,UnimetValue, UnimetAsd};*/

// Add index signature
interface IndexSignature{
    [key:string]: any;
}
let components:IndexSignature = {
    UnimetValue,
    UnimetAsd
};
const install:PluginFunction<any> = (vm:typeof Vue)=>{
    for (let componentsKey in components) {
        vm.component(componentsKey, components[componentsKey]);
    }
};
export default {
    install,
    ...components,
}