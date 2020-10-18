import UmEntity from "../../entity/um/UmEntity";
import http from "../../util/http";
import ISearchParam from "./ISearchParam";
import paramToJson from "./paramToJson";
import UmArray from "./UmArray";

class URL {
    static readonly SELECT: string = "/select.do";

    static readonly INSERT: string = "/insert.do";

    static readonly UPDATE: string = "/update.do";

    static readonly DELETE: string = "/delete.do";

    static readonly LOAD: string = "/load.do";

    static readonly COUNT: string = "/count.do";
}

class UmService<T extends UmEntity> {

    //访问url头信息
    protected urlHead: string;

    constructor(urlHead: string) {
        this.urlHead = urlHead;
    }

    /**
     * 标准查询
     * @param {ISearchParam} param 查询参数
     * @returns {Promise<Array<T extends >>} 异步返回
     */
    public select(param?: ISearchParam): Promise<UmArray<T>> {
        let json = paramToJson(param);
        return http.post<UmArray<T>>(this.urlHead + URL.SELECT, json);
    }


    /**
     * 数量查询
     * @param {ISearchParam} param 查询参数
     * @returns {Promise<Array<T extends >>} 异步返回
     */
    public count(param?: ISearchParam): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            let json = paramToJson(param);
            http.post<number>(this.urlHead + URL.COUNT, json).then((data) => {
                resolve(data);
            }, (reason) => {
                reject(reason);
            });
        });
    }

    /**
     * 标准插入
     * @param {T} entity 插入实体类
     * @returns {Promise<T extends >} 异步返回
     */
    public insert(entity: T): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            http.post<T>(this.urlHead + URL.INSERT, entity).then((data) => {
                resolve(data);
            }, (reason) => {
                reject(reason);
            });
        });
    }

    /**
     * 标准更新
     * @param {T} entity 更新实体类
     * @returns {Promise<T extends >} 异步返回
     */
    public update(entity: T): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            http.post<T>(this.urlHead + URL.UPDATE, entity).then((data) => {
                resolve(data);
            }, (reason) => {
                reject(reason);
            });
        });
    }

    /**
     * 单条数据加载
     * @param {string} key 主键
     * @returns {Promise<T extends >} 异步返回
     */
    public load(key: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            http.post<T>(this.urlHead + URL.LOAD, {key: key}).then((data) => {
                resolve(data);
            }, (reason) => {
                reject(reason);
            });
        });
    }

    /**
     * 单条数据删除
     * @param {string} key 主键
     * @returns {Promise<T extends >} 异步返回
     */
    public delete(key: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            http.post<T>(this.urlHead + URL.DELETE, {key: key}).then((data) => {
                resolve(data);
            }, (reason) => {
                reject(reason);
            });
        });
    }

}

export default UmService;
