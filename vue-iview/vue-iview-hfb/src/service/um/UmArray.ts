export default class UmArray<T> extends Array<T> {
    private _total?: number;

    get total(): number {
        return this._total;
    }

    set total(value: number) {
        this._total = value;
    }
}