import IHttp from "./IHttp";
import {AxiosHttp} from "./AxiosHttp";
import {ProHttp} from "./ProHttp";
import {FileStreamHttp} from "@/util/http/FileStreamHttp";

let exp: IHttp, extendHttp: IHttp, meteoHttp: IHttp, fileStreamHttp: IHttp, testHttp: IHttp; // todo 手机上运行extendHttp暂未赋
declare let window: any;
if (navigator.platform.indexOf('Win') == 0) {//判断是否在win系统测试
    exp = new AxiosHttp("/");
    extendHttp = new AxiosHttp("/extend-service");
    meteoHttp = new AxiosHttp("/service-self/");
    fileStreamHttp = new FileStreamHttp("/tiles");
    testHttp = new AxiosHttp("/tiles");
} else {      // 手机测试
    if (window.plus) {
        exp = new ProHttp("/");
        extendHttp = new ProHttp("/extend-service");
        meteoHttp = new ProHttp("/service-self/");
        testHttp = new AxiosHttp("/tiles");
    } else {
        document.addEventListener('plusready', () => {
            exp = new ProHttp("/application");
            extendHttp = new ProHttp("/extend-service");
            meteoHttp = new ProHttp("/service-self/");
            testHttp = new AxiosHttp("/tiles");
        }, false)
    }
}
export {exp, extendHttp, meteoHttp,fileStreamHttp,testHttp};
