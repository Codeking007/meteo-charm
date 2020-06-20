interface IS2CJson{
    //交互状态
    status?:number;

    //状态信息
    statusText?:string;

    //单数据结果
    data?:any;

    //数据总数
    count?:number;

    //起始数
    dataIndex?:number;

    //查询数
    dataSize?:number;

    //排序
    orderBy?:string;

    //查询时间
    searchTime?:Date;
}

export default interface IHttp{
    post<T = any>(url: string, data?: any):Promise<T>;
    postOnly<T = any>(url: string, data?: any):Promise<T>;
    // postForm<T = any>(url: string, data?: any):Promise<T>;
    get<T = any>(url: string, data?: any):Promise<T>;
    // getOtherUrl<T = any>(url: string, data?: any,requestHeader?:number):Promise<T>;
    // meteoPost<T = any>(url: string):Promise<T>;
}