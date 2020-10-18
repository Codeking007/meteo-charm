import IHttp from "./IHttp";
import {AxiosHttp} from "./AxiosHttp";

const exp: IHttp = new AxiosHttp("/application");
const extendHttp: IHttp = new AxiosHttp("/extend-service");
const meteoHttp: IHttp = new AxiosHttp("/service-self/");

export default exp;
export {extendHttp, meteoHttp};
