export class PointD {
    private _X: number;
    private _Y: number;

    constructor(X: number = 0.0, Y: number = 0.0) {
        this._X = X;
        this._Y = Y;
    }


    get X(): number {
        return this._X;
    }

    set X(value: number) {
        this._X = value;
    }

    get Y(): number {
        return this._Y;
    }

    set Y(value: number) {
        this._Y = value;
    }
}