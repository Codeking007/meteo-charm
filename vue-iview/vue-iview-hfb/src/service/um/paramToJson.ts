import ISearchParam from "./ISearchParam";
import SearchJson from "../../util/http/SearchJson";

export default (param: ISearchParam): SearchJson => {
    const re = new SearchJson();
    re.searchTime = new Date();
    for (let key in param) {
        switch (key) {
            case "dataIndex":
            case "dataSize":
            case "orderBy":
                //@ts-ignore
                re[key] = param[key];
                break;
            default:
                re.addExp(key, param[key]);
                break;
        }
    }
    return re;
}