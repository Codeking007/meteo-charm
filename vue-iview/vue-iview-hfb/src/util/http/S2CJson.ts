export default interface S2CJson {
    //交互状态
    status: number;

    //状态信息
    statusText?: string;

    //单数据结果
    data?: any;

    //数据总数
    count?: number;

    //起始数
    dataIndex?: number;

    //查询数
    dataSize?: number;

    //排序
    orderBy?: number;

    //查询时间
    searchTime?: Date;


}