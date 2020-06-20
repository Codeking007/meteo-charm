import {PointD} from "@/util/meteo/isoline/meteoinfo/global/PointD";

export class PolyLine {
    private _Value: number;
    private _Type: string;
    private _BorderIdx: number;
    private _PointList: Array<PointD>;


    constructor(Value: number, Type: string, BorderIdx: number, PointList: Array<PointD>) {
        this._Value = Value;
        this._Type = Type;
        this._BorderIdx = BorderIdx;
        this._PointList = PointList;
    }


    get Value(): number {
        return this._Value;
    }

    set Value(value: number) {
        this._Value = value;
    }

    get Type(): string {
        return this._Type;
    }

    set Type(value: string) {
        this._Type = value;
    }

    get BorderIdx(): number {
        return this._BorderIdx;
    }

    set BorderIdx(value: number) {
        this._BorderIdx = value;
    }

    get PointList(): Array<PointD> {
        return this._PointList;
    }

    set PointList(value: Array<PointD>) {
        this._PointList = value;
    }
}