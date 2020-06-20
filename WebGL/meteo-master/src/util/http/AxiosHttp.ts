import IHttp from "./IHttp";
import axios, {AxiosInstance} from "axios";
import S2CJson from "./S2CJson";
import HttpStatus from "./HttpStatus";

class AxiosStatus {
    /**
     * 状态ok
     * @type {number}
     */
    static OK = 200;
}

/**
 * request过滤
 * @param obj
 * @returns {any}
 */
function transformRequest(obj: any, replacer: (val: any) => any) {
    if (obj)
        if (obj instanceof Array) {
            for (let m = 0; m < obj.length; m++)
                obj[m] = replacer(obj[m]);
        } else
            for (let key in obj) {
                if (key.charAt(0) === "_")
                    continue;
                if (typeof obj[key] === "function")
                    continue;
                if (obj[key] instanceof Array)
                    transformRequest(obj[key], replacer);
                else if (typeof obj[key] === "object" && !(obj[key] instanceof Date))
                    transformRequest(obj[key], replacer);
                else
                    obj[key] = replacer(obj[key]);
            }
    return obj;
}

/**
 * axios实现的IHttp
 */
export class AxiosHttp implements IHttp {

    private http: AxiosInstance;
    private httpMeteo: AxiosInstance;

    constructor(baseURL: string) {
        // axios.defaults.headers.post['Content-Type'] = "application/json;charset=UTF-8";
        this.http = axios.create({
            baseURL: baseURL,
            transformRequest: [(data) => {
                transformRequest(data, val => val instanceof Date ? val.getTime() : val);
                return JSON.stringify(data);
            }],
        });
        this.httpMeteo = axios.create({
            baseURL: baseURL,
        });
    }

    post<T>(url: string, data?: any): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // loading.addHttp();
            this.http.post<S2CJson>(url, data)
                .then(response => {
                    // loading.removeHttp();
                    if (response.status !== AxiosStatus.OK)
                        reject(response.statusText);
                    else if (response.data.status !== HttpStatus.OK)
                        reject(response.data.statusText);
                    else {
                        let re = response.data.data;
                        /*//增加total
                        if (response.data.data && (response.data.count || response.data.count === 0))
                            response.data.data["total"] = response.data.count;*/
                        resolve(response.data.data);
                    }
                })
                .catch(reason => {
                    // loading.removeHttp();
                    reject(reason)
                });
        });
    }

    postOnly<T>(url: string, data?: any): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.httpMeteo.post<S2CJson>(url, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            })
                .then(response => {
                    if (response.status !== AxiosStatus.OK)
                        reject(response.statusText);
                    else {
                        resolve(response.data.data);
                    }
                })
                .catch(reason => {
                    reject(reason)
                });
        });
    }

    get<T>(url: string): Promise<T> {
        return new Promise((resolve, reject) => {
            this.http.get(url)
                .then(response => {
                    if (response.status !== AxiosStatus.OK)
                        reject(response.statusText);
                    else {
                        let re = response.data;
                        resolve(re);
                    }
                })
                .catch(reason => {
                    reject(reason)
                });
        });
    }

}
