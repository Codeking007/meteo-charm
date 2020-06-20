import Vue, {ComponentOptions, PluginFunction, PluginObject, VueConstructor} from "vue";
import MeteoMaster from "@/lib/meteo";

// Add index signature
interface IndexSignature{
    [key:string]: any;
}
let components:IndexSignature = {
    MeteoMaster,
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