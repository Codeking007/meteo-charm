import IHttp from "./IHttp";
import HttpStatus from "./HttpStatus";

declare let window: any;
declare let plus: any;

let requestHeaders = [
    'application/x-www-form-urlencoded',
    'application/json'
]

/**
 * axios实现的IHttp
 */
export class ProHttp implements IHttp {
    private prefixUrl = "http://120.27.234.5/";
    // private prefixUrl = "http://192.168.0.68:8080";
    private baseURL: String;

    constructor(base: string) {
        this.baseURL = this.prefixUrl + base;
    }

    postOnlyFunction<T = any>(url: string, data?: any): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // loading.addHttp();
            let xhr = new plus.net.XMLHttpRequest();
            xhr.open("POST", this.prefixUrl + url);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
            // console.log(this.prefixUrl + url + " 参数==> " + JSON.stringify(data));
            let noop = function () {
            };
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    // loading.removeHttp();
                    xhr.onreadystatechange = noop;
                    if (xhr.status == 200) {
                        // console.log(this.prefixUrl + url + " status:200");
                        let reData = JSON.parse(xhr.responseText);
                        resolve(reData.data);
                    } else {
                        // console.log(this.prefixUrl + url + " status=" + xhr.status);
                        debugger
                    }
                }
            }
        });
    }

    postOnly<T = any>(url: string, data?: any): Promise<T> {
        // todo:这里判断是否plusready移到了index.ts中了
        // if (window.plus) {
            return this.postOnlyFunction(url, data);
        // } else {
        //     document.addEventListener('plusready', () => {
        //         return this.postOnlyFunction(url, data);
        //     }, false)
        // }
    }

    postFunction<T>(url: string, data?: any): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // loading.addHttp();
            let xhr = new plus.net.XMLHttpRequest();
            xhr.open("POST", this.baseURL + url);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
            // console.log(this.baseURL + url + " 参数==> " + JSON.stringify(data));
            let noop = function () {
            };
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    // loading.removeHttp();
                    xhr.onreadystatechange = noop;
                    if (xhr.status == 200) {
                        // console.log(this.baseURL + url + " status:200");
                        let reData = JSON.parse(xhr.responseText);
                        if (reData.status !== HttpStatus.OK) {
                            reject(reData.statusText);
                        } else {
                            let re = reData.data;
                            //增加total
                            /*if (reData.data && (reData.count || reData.count === 0))
                             reData.data.total = reData.count;*/
                            resolve(reData.data);
                        }
                    } else {
                        // console.log(this.baseURL + url + " status=" + xhr.status);
                        reject("请求失败");
                    }
                }
            }
        })
    }

    post<T>(url: string, data?: any): Promise<T> {
        // if (window.plus) {
            return this.postFunction(url, data);
        // } else {
        //     document.addEventListener('plusready', () => {
        //         return this.postFunction(url, data);
        //     }, false)
        // }
    }

    // todo:没写，复制的
    get<T>(url: string, data?: any): Promise<T> {
        // if (window.plus) {
        return this.postFunction(url, data);
        // } else {
        //     document.addEventListener('plusready', () => {
        //         return this.postFunction(url, data);
        //     }, false)
        // }
    }
}
