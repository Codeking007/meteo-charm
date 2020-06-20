import {PolyLine} from "@/util/meteo/isoline/meteoinfo/global/PolyLine";
import {PointD} from "@/util/meteo/isoline/meteoinfo/global/PointD";

export class Contour {
    /**
     * Smooth polylines
     *
     * @param aLineList polyline list
     * @return polyline list after smoothing
     */
    public static smoothLines(aLineList: Array<PolyLine>): Array<PolyLine> {
        let newLineList: Array<PolyLine> = new Array<PolyLine>();
        for (let i = 0; i < aLineList.length; i++) {
            let aline: PolyLine = aLineList[i];
            let newPList: Array<PointD> | null = new Array<PointD>(...aline.PointList);
            if (newPList.length <= 1) {
                continue;
            }

            if (newPList.length === 2) {
                let bP: PointD = new PointD();
                let aP: PointD = newPList[0];
                let cP: PointD = newPList[1];
                bP.X = (cP.X - aP.X) / 4.0 + aP.X;
                bP.Y = (cP.Y - aP.Y) / 4.0 + aP.Y;
                newPList.splice(1, 0, bP);
                bP = new PointD();
                bP.X = (cP.X - aP.X) / 4 * 3 + aP.X;
                bP.Y = (cP.Y - aP.Y) / 4 * 3 + aP.Y;
                newPList.splice(2, 0, bP);
            }
            if (newPList.length === 3) {
                let bP: PointD = new PointD();
                let aP: PointD = newPList[0];
                let cP: PointD = newPList[1];
                bP.X = (cP.X - aP.X) / 2 + aP.X;
                bP.Y = (cP.Y - aP.Y) / 2 + aP.Y;
                newPList.splice(1, 0, bP);
            }
            newPList = Contour.BSplineScanning(newPList, newPList.length);
            aline.PointList = newPList;
            newLineList.push(aline);
        }

        return newLineList;
    }

    /**
     * Smooth points
     *
     * @param pointList point list
     * @return smoothed point list
     */
    public static smoothPoints(pointList: Array<PointD>): Array<PointD> {
        return Contour.BSplineScanning(pointList, pointList.length);
    }

    // </editor-fold>
    // <editor-fold desc="Smoothing">
    private static BSplineScanning(pointList: Array<PointD>, sum: number): Array<PointD> {
        let X, Y;
        let newPList: Array<PointD> = new Array<PointD>();

        if (sum < 4) {
            return new Array<PointD>();
        }

        let isClose: boolean = false;
        let aPoint: PointD = pointList[0];
        let bPoint: PointD = pointList[sum - 1];
        if (aPoint.X == bPoint.X && aPoint.Y == bPoint.Y) {
            pointList.splice(0, 1);
            pointList.push(pointList[0]);
            pointList.push(pointList[1]);
            pointList.push(pointList[2]);
            pointList.push(pointList[3]);
            pointList.push(pointList[4]);
            pointList.push(pointList[5]);
            pointList.push(pointList[6]);
            isClose = true;
        }

        sum = pointList.length;
        for (let i = 0; i < sum - 3; i++) {
            for (let t = 0; t <= 1; t += 0.05) {
                let xy: number[] = Contour.BSpline(pointList, t, i);
                X = xy[0];
                Y = xy[1];
                if (isClose) {
                    if (i > 3) {
                        aPoint = new PointD();
                        aPoint.X = X;
                        aPoint.Y = Y;
                        newPList.push(aPoint);
                    }
                } else {
                    aPoint = new PointD();
                    aPoint.X = X;
                    aPoint.Y = Y;
                    newPList.push(aPoint);
                }
            }
        }

        if (isClose) {
            newPList.push(newPList[0]);
        } else {
            newPList.splice(0, 0, pointList[0]);
            newPList.push(pointList[pointList.length - 1]);
        }

        return newPList;
    }

    private static BSpline(pointList: Array<PointD>, t: number, i: number): number[] {
        let f: Array<number> = new Array<number>(4);
        Contour.fb(t, f);
        let X = 0;
        let Y = 0;
        let aPoint: PointD;
        for (let j = 0; j < 4; j++) {
            aPoint = pointList[i + j];
            X = X + f[j] * aPoint.X;
            Y = Y + f[j] * aPoint.Y;
        }

        let xy: Array<number> = new Array<number>(2);
        xy[0] = X;
        xy[1] = Y;

        return xy;
    }

    private static f0(t: number): number {
        return 1.0 / 6.0 * (-t + 1.0) * (-t + 1.0) * (-t + 1.0);
    }

    private static f1(t: number): number {
        return 1.0 / 6.0 * (3.0 * t * t * t - 6.0 * t * t + 4.0);
    }

    private static f2(t: number): number {
        return 1.0 / 6.0 * (-3.0 * t * t * t + 3.0 * t * t + 3.0 * t + 1.0);
    }

    private static f3(t: number): number {
        return 1.0 / 6.0 * t * t * t;
    }

    private static fb(t: number, fs: Array<number>) {
        fs[0] = Contour.f0(t);
        fs[1] = Contour.f1(t);
        fs[2] = Contour.f2(t);
        fs[3] = Contour.f3(t);
    }
}