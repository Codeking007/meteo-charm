import * as d3 from 'd3';

export interface ViewInterface {
    width: any;
    height: any
}

/**
 * micro - a grab bag of somewhat useful utility functions and other stuff that requires unit testing
 */
export default class {
    private τ: number = 2 * Math.PI;
    private H: number = 0.0000360;  // 0.0000360°φ ~= 4m
    private DEFAULT_CONFIG: string = "current/wind/surface/level/orthographic";
    private TOPOLOGY: string = this.isMobile() ? "/data/earth-topo-mobile.json?v2" : "/data/earth-topo.json?v2";

    /**
     * @returns {Boolean} true if agent is probably a mobile device. Don't really care if this is accurate.
     */
    isMobile(): boolean {
        return (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent);
    }

    /**
     * @returns {width: (Number), height: (Number)} an object that describes the size of the browser's current view.
     * 浏览器当前大小（宽度、高度）
     */
    view(): ViewInterface {
        let w = window;
        let d = document && document.documentElement;
        let b = document && document.getElementsByTagName("body")[0];
        let x = w.innerWidth || d.clientWidth || b.clientWidth;
        let y = w.innerHeight || d.clientHeight || b.clientHeight;
        return {width: x, height: y};
    }

    /**
     * @returns {Number} returns remainder of floored division, i.e., floor(a / n). Useful for consistent modulo
     *          of negative numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
     */
    // 取余==>mod()
    floorMod(a: number, n: number): number {
        let f = a - n * Math.floor(a / n);
        // HACK: when a is extremely close to an n transition, f can be equal to n. This is bad because f must be
        //       within range [0, n). Check for this corner case. Example: a:=-1e-16, n:=10. What is the proper fix?
        return f === n ? 0 : f;
    }

    /**
     * @returns {Boolean} true if the specified value is not null and not undefined.
     */
    isValue(x: any) {
        return x !== null && x !== undefined;
    }

    /**
     * @returns {Number} the value x clamped to the range [low, high].
     */
    clamp(x: number, low: number, high: number) {
        return Math.max(low, Math.min(x, high));
    }

    /**
     * Returns a promise for a JSON resource (URL) fetched via XHR. If the load fails, the promise rejects with an
     * object describing the reason: {status: http-status-code, message: http-status-text, resource:}.
     */
    loadJson(resource: string) {
        return new Promise((resolve, reject) => {
            d3.json(resource).then((result) => {
                resolve(result);
            })
        });
    }

    /**
     * Removes all children of the specified DOM element.
     */
    removeChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * @returns {Number} distance between two points having the form [x, y].
     */
    distance(a: Array<number>, b: Array<number>) {
        let Δx = b[0] - a[0];
        let Δy = b[1] - a[1];
        return Math.sqrt(Δx * Δx + Δy * Δy);
    }

    /**
     * Returns the distortion introduced by the specified projection at the given point.
     *
     * This method uses finite difference estimates to calculate warping by adding a very small amount (h) to
     * both the longitude and latitude to create two lines. These lines are then projected to pixel space, where
     * they become diagonals of triangles that represent how much the projection warps longitude and latitude at
     * that location.
     *
     * <pre>
     *        (λ, φ+h)                  (xλ, yλ)
     *           .                         .
     *           |               ==>        \
     *           |                           \   __. (xφ, yφ)
     *    (λ, φ) .____. (λ+h, φ)       (x, y) .--
     * </pre>
     *
     * See:
     *     Map Projections: A Working Manual, Snyder, John P: pubs.er.usgs.gov/publication/pp1395
     *     gis.stackexchange.com/questions/5068/how-to-create-an-accurate-tissot-indicatrix
     *     www.jasondavies.com/maps/tissot
     *
     * @returns {Array} array of scaled derivatives [dx/dλ, dy/dλ, dx/dφ, dy/dφ]
     */
    distortion(projection, λ, φ, x, y) {
        let hλ = λ < 0 ? this.H : -this.H;
        let hφ = φ < 0 ? this.H : -this.H;
        let pλ = projection([λ + hλ, φ]);   // 经纬度转换为像素点
        let pφ = projection([λ, φ + hφ]);

        // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1° λ
        // changes depending on φ. Without this, there is a pinching effect at the poles.
        // 子午线比例因子:没有这个在南北极会出现挤压效应
        let k = Math.cos(φ / 360 * this.τ);

        return [
            (pλ[0] - x) / hλ / k,
            (pλ[1] - y) / hλ / k,
            (pφ[0] - x) / hφ,
            (pφ[1] - y) / hφ
        ];
    }

    // region todo:渐变色卡，要改成自己的
    colorInterpolator(start, end) {
        let r = start[0], g = start[1], b = start[2];
        let Δr = end[0] - r, Δg = end[1] - g, Δb = end[2] - b;
        return function (i, a) {
            return [Math.floor(r + i * Δr), Math.floor(g + i * Δg), Math.floor(b + i * Δb), a];
        };
    }

    /**
     * Produces a color style in a rainbow-like trefoil color space. Not quite HSV, but produces a nice
     * spectrum. See http://krazydad.com/tutorials/makecolors.php.
     *
     * @param hue the hue rotation in the range [0, 1]
     * @param a the alpha value in the range [0, 255]
     * @returns {Array} [r, g, b, a]
     */
    sinebowColor(hue, a) {
        // Map hue [0, 1] to radians [0, 5/6τ]. Don't allow a full rotation because that keeps hue == 0 and
        // hue == 1 from mapping to the same color.
        let rad = hue * this.τ * 5 / 6;
        rad *= 0.75;  // increase frequency to 2/3 cycle per rad

        let s = Math.sin(rad);
        let c = Math.cos(rad);
        let r = Math.floor(Math.max(0, -c) * 255);
        let g = Math.floor(Math.max(s, 0) * 255);
        let b = Math.floor(Math.max(c, 0, -s) * 255);
        return [r, g, b, a];
    }

    private BOUNDARY = 0.45;
    private fadeToWhite = this.colorInterpolator(this.sinebowColor(1.0, 0), [255, 255, 255]);

    /**
     * Interpolates a sinebow color where 0 <= i <= j, then fades to white where j < i <= 1.
     *
     * @param i number in the range [0, 1]
     * @param a alpha value in range [0, 255]
     * @returns {Array} [r, g, b, a]
     */
    extendedSinebowColor(i, a) {
        return i <= this.BOUNDARY ?
            this.sinebowColor(i / this.BOUNDARY, a) :
            this.fadeToWhite((i - this.BOUNDARY) / (1 - this.BOUNDARY), a);
    }

    // endregion

    /**
     * @returns {Object} clears and returns the specified Canvas element's 2d context.
     */
    clearCanvas(canvas) {
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        return canvas;
    }

    asColorStyle(r, g, b, a) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
    }

    /**
     * @returns {Array} of wind colors and a method, indexFor, that maps wind magnitude to an index on the color scale.
     */
    windIntensityColorScale(step, maxWind) {
        let result = [];
        for (let j = 85; j <= 255; j += step) {
            result.push(this.asColorStyle(j, j, j, 1.0));
        }
        return result;
    }

    indexFor(m, maxWind, result) {  // map wind speed to a style
        return Math.floor(Math.min(m, maxWind) / maxWind * (result.length - 1));
    };

};
