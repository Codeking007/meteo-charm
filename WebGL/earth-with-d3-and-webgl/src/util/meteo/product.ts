import Micro from "@/util/meteo/micro.ts";
import * as d3 from 'd3';

export default class {
    private µ: Micro;
    private header: any;
    private uData: Array<number>;
    private vData: Array<number>;

    private λ0: number; // the grid's origin (e.g., 0.0E, 90.0N)
    private φ0: number;

    private Δλ: number;  // distance between grid points (e.g., 1 deg lon, 1 deg lat)
    private Δφ: number;

    private ni: number;     // number of grid points W-E and N-S (e.g., 360 x 181)
    private nj: number;

    private grid: Array<Array<Array<number>>>;    // 气象图的所有数据==>[[数据索引行][数据索引列][u,v]]

    constructor() {
        this.µ = new Micro();
    }

    buildProduct(currentPath) {
        return new Promise((resolve, reject) => {
            this.µ.loadJson(currentPath).then((file: any) => {
                // builder()
                this.uData = file[0].data;
                this.vData = file[1].data;
                this.header = file[0].header;

                // buildGrid()
                this.buildGrid();

                resolve();
            });
        });
    }

    // region fixme:builder
    bilinearInterpolateVector(x, y, g00, g10, g01, g11) {  // Δx,Δy,g00, g10, g01, g11
        let rx = (1 - x);
        let ry = (1 - y);
        let a = rx * ry, b = x * ry, c = rx * y, d = x * y;
        let u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
        let v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
        return [u, v, Math.sqrt(u * u + v * v)];
    }

    getGridData(i): Array<number> {
        return [this.uData[i], this.vData[i]];
    }

    // endregion

    // region fixme:buildGrid
    /**
     * Builds an interpolator for the specified data in the form of JSON-ified GRIB files. Example:
     *
     *     [
     *       {
     *         "header": {
     *           "refTime": "2013-11-30T18:00:00.000Z",
     *           "parameterCategory": 2,
     *           "parameterNumber": 2,
     *           "surface1Type": 100,
     *           "surface1Value": 100000.0,
     *           "forecastTime": 6,
     *           "scanMode": 0,
     *           "nx": 360,
     *           "ny": 181,
     *           "lo1": 0,
     *           "la1": 90,
     *           "lo2": 359,
     *           "la2": -90,
     *           "dx": 1,
     *           "dy": 1
     *         },
     *         "data": [3.42, 3.31, 3.19, 3.08, 2.96, 2.84, 2.72, 2.6, 2.47, ...]
     *       }
     *     ]
     *
     */
    buildGrid() {
        let header = this.header;
        let λ0 = this.λ0 = header.lo1, φ0 = this.φ0 = header.la1;  // the grid's origin (e.g., 0.0E, 90.0N)
        let Δλ = this.Δλ = header.dx, Δφ = this.Δφ = header.dy;    // distance between grid points (e.g., 1 deg lon, 1 deg lat)
        let ni = this.ni = header.nx, nj = this.nj = header.ny;    // number of grid points W-E and N-S (e.g., 360 x 181)

        // Scan mode 0 assumed. Longitude increases from λ0, and latitude decreases from φ0.
        // http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table3-4.shtml
        let grid = this.grid = [], p = 0;
        let isContinuous = Math.floor(ni * Δλ) >= 360;
        for (let j = 0; j < nj; j++) {  // 数据索引行
            let row = [];
            for (let i = 0; i < ni; i++, p++) { // 数据索引列
                row[i] = this.getGridData(p);
            }
            if (isContinuous) {
                // For wrapped grids, duplicate first column as last column to simplify interpolation logic
                // 为了包裹格点，把第一列的数据复制到最后一列来简化插值方法interpolate()，即让0度和360度是一样数据
                row.push(row[0]);
            }
            grid[j] = row;
        }
    }

    // 根据经纬度得到相应经纬度点的气象数据
    interpolate(λ, φ) { // lon:[90~-90] lat:随意
        let i = this.µ.floorMod(λ - this.λ0, 360) / this.Δλ;  // 数据索引坐标i // calculate longitude index in wrapped range [0, 360)
        let j = (this.φ0 - φ) / this.Δφ;                 // 数据索引坐标j // calculate latitude index in direction +90 to -90

        //         1      2           After converting λ and φ to fractional grid indexes i and j, we find the
        //        fi  i   ci          four points "G" that enclose point (i, j). These points are at the four
        //         | =1.4 |           corners specified by the floor and ceiling of i and j. For example, given
        //      ---G--|---G--- fj 8   i = 1.4 and j = 8.3, the four surrounding grid points are (1, 8), (2, 8),
        //    j ___|_ .   |           (1, 9) and (2, 9).
        //  =8.3   |      |
        //      ---G------G--- cj 9   Note that for wrapped grids, the first column is duplicated as the last
        //         |      |           column, so the index ci can be used without taking a modulo.==>复制最后一列的好处就是在ci=360时去单独取ci=0时的值

        let fi = Math.floor(i), ci = fi + 1;
        let fj = Math.floor(j), cj = fj + 1;

        let row;
        if ((row = this.grid[fj])) {
            let g00 = row[fi];
            let g10 = row[ci];
            if (this.µ.isValue(g00) && this.µ.isValue(g10) && (row = this.grid[cj])) {
                let g01 = row[fi];
                let g11 = row[ci];
                if (this.µ.isValue(g01) && this.µ.isValue(g11)) {
                    // All four points found, so interpolate the value.
                    return this.bilinearInterpolateVector(i - fi, j - fj, g00, g10, g01, g11);  // todo:暂时用双线性插值
                }
            }
        }
        return null;
    }

    forEachPoint(cb) {
        for (let j = 0; j < this.nj; j++) {
            let row = this.grid[j] || [];
            for (let i = 0; i < this.ni; i++) {
                cb(this.µ.floorMod(180 + this.λ0 + i * this.Δλ, 360) - 180, this.φ0 - j * this.Δφ, row[i]);
            }
        }
    }

    // endregion
}