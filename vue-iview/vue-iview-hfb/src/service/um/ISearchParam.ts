/**
 * 查询参数接口
 */
export default interface ISearchParam {
    dataIndex?: number;
    dataSize?: number;
    orderBy?: string;

    [propName: string]: any;
}
