/**
 * 后台标准查询类
 */
class SearchJson{

    /**
     * 起始数
     */
    private _dataIndex?:number;

    /**
     * 查询数
     */
    private _dataSize?:number;

    /**
     * 查询表达式
     */
    private _expList?:Array<SearchExpJson>;

    /**
     * 排序
     */
    private _orderBy?:string;

    /**
     * 查询时间
     */
    private _searchTime?:Date;


    get dataIndex(): number|undefined {
        return this._dataIndex;
    }

    set dataIndex(value: number|undefined) {
        this._dataIndex = value;
    }

    get dataSize(): number|undefined {
        return this._dataSize;
    }

    set dataSize(value: number|undefined) {
        this._dataSize = value;
    }

    get expList(): Array<SearchExpJson>|undefined {
        return this._expList;
    }

    set expList(value: Array<SearchExpJson>|undefined) {
        this._expList = value;
    }

    get orderBy(): string|undefined {
        return this._orderBy;
    }

    set orderBy(value: string|undefined) {
        this._orderBy = value;
    }

    get searchTime(): Date|undefined {
        return this._searchTime;
    }

    set searchTime(value: Date|undefined) {
        this._searchTime = value;
    }

    public addExp(key:string,value:any){
        if(!this.expList)
            this.expList = new Array();
        if(value instanceof Date)
            this.expList.push(new SearchExpJson(key,undefined,value));
        else
            this.expList.push(new SearchExpJson(key,value));
    }


}

class SearchExpJson{

    constructor(key: string, stringValue?: string, timeValue?: Date) {
        this._key = key;
        this._stringValue = stringValue;
        this._timeValue = timeValue;
    }

    /**
     * 查询名称
     */
    private _key:string;

    /**
     * 表达式
     */
    private _operator?:string;

    /**
     * String值
     */
    private _stringValue?:string;

    /**
     * Date值
     */
    private _timeValue?:Date;


    get key(): string {
        return this._key;
    }

    set key(value: string) {
        this._key = value;
    }

    get operator(): string|undefined {
        return this._operator;
    }

    set operator(value: string|undefined) {
        this._operator = value;
    }

    get stringValue(): string|undefined {
        return this._stringValue;
    }

    set stringValue(value: string|undefined) {
        this._stringValue = value;
    }

    get timeValue(): Date|undefined {
        return this._timeValue;
    }

    set timeValue(value: Date|undefined) {
        this._timeValue = value;
    }
}

export default SearchJson;
