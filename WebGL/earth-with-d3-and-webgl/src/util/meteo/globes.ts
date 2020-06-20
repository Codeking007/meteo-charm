/**
 * globes - a set of models of the earth, each having their own kind of projection and onscreen behavior.
 */
import Micro from "@/util/meteo/micro.ts";
import * as d3 from 'd3';
import {GeoProjection} from "d3";
import {ViewInterface} from "@/util/meteo/micro";

export class Globe {
    public µ: Micro;

    constructor() {
        this.µ = new Micro();
    }

    /**
     * @returns {Array} rotation of globe to current position of the user. Aside from asking for geolocation,
     *          which user may reject, there is not much available except timezone. Better than nothing.
     */
    // fixme:通过时区来找当前展示在用户面前的球体位置，而不是geo当前位置
    currentPosition(): [number, number] {
        let λ = this.µ.floorMod(new Date().getTimezoneOffset() / 4, 360);  // 24 hours * 60 min / 4 === 360 degrees
        return [λ, 0];
    }

    isFinite(obj: any) {
        return isFinite(obj) && !isNaN(parseFloat(obj));
    }

    // 确认是否为数值
    ensureNumber(num: any, fallback: number) {
        return this.isFinite(num) || num === Infinity || num === -Infinity ? num : fallback;
    }

    /**
     * @param bounds the projection bounds: [[x0, y0], [x1, y1]]
     * @param view the view bounds {width:, height:}
     * @returns {Object} the projection bounds clamped to the specified view.
     */
    clampedBounds(bounds: Array<Array<number>>, view: ViewInterface) {  // 范围从左上到右下
        let upperLeft = bounds[0];
        let lowerRight = bounds[1];
        let x = Math.max(Math.floor(this.ensureNumber(upperLeft[0], 0)), 0);
        let y = Math.max(Math.floor(this.ensureNumber(upperLeft[1], 0)), 0);
        let xMax = Math.min(Math.ceil(this.ensureNumber(lowerRight[0], view.width)), view.width - 1);
        let yMax = Math.min(Math.ceil(this.ensureNumber(lowerRight[1], view.height)), view.height - 1);
        return {x: x, y: y, xMax: xMax, yMax: yMax, width: xMax - x + 1, height: yMax - y + 1};
    }

}

/**
 * Returns a globe object with standard behavior. At least the newProjection method must be overridden to
 * be functional.
 */
export class StandardGlobe extends Globe {
    constructor() {
        super();
    }

    private _projection!: GeoProjection;

    get projection(): GeoProjection {
        return this._projection;
    }

    set projection(value: GeoProjection) {
        this._projection = value;
    }

    /**
     * @param view the size of the view as {width:, height:}.
     * @returns {Object} a new D3 projection of this globe appropriate for the specified view port.
     */
    newProjection(view?: ViewInterface): GeoProjection {
        // 这个方法必须被继承
        throw new Error("method must be overridden");
    }

    /**
     * @param view the size of the view as {width:, height:}.
     * @returns {{x: Number, y: Number, xMax: Number, yMax: Number, width: Number, height: Number}}
     *          the bounds of the current projection clamped to the specified view.
     */
    bounds(view: ViewInterface) {   // 当前球体相对于给定的view视图的显示范围
        // return this.clampedBounds(d3.geo.path().projection(this.projection).bounds({type: "Sphere"}), view);
        return this.clampedBounds(d3.geoPath().projection(this.projection).bounds({type: "Sphere"}), view);
    }

    projectionBounds() {     // 当前球体的显示范围
        return d3.geoPath().projection(this.projection).bounds({type: "Sphere"});
    }

    /**
     * @param view the size of the view as {width:, height:}.
     * @returns {Number} the projection scale at which the entire globe fits within the specified view.
     */
    fit(view: ViewInterface) {
        let defaultProjection: GeoProjection = this.newProjection(view);
        // let bounds = d3.geo.path().projection(defaultProjection).bounds({type: "Sphere"});
        let bounds = d3.geoPath().projection(defaultProjection).bounds({type: "Sphere"});
        let hScale = (bounds[1][0] - bounds[0][0]) / defaultProjection.scale();
        let vScale = (bounds[1][1] - bounds[0][1]) / defaultProjection.scale();
        return Math.min(view.width / hScale, view.height / vScale) * 0.9;   // 在原先的scale比例上再*0.9
    }

    /**
     * @param view the size of the view as {width:, height:}.
     * @returns {Array} the projection transform at which the globe is centered within the specified view.
     */
    center(view: ViewInterface): [number, number] {
        return [view.width / 2, view.height / 2];
    }

    /**
     * @returns {Array} the range at which this globe can be zoomed.
     */
    scaleExtent(): [number, number] {
        return [25, 3000];
    }

    /**
     * Returns the current orientation of this globe as a string. If the arguments are specified,
     * mutates this globe to match the specified orientation string, usually in the form "lat,lon,scale".
     *
     * @param [o] the orientation string
     * @param [view] the size of the view as {width:, height:}.
     */
    // fixme:第一次进来时是初始化过程，有传参数，其实主要是projection.translate(this.center(view));这句话有用，好让球体居中
    // todo:鼠标移动结束后，第一次进来传的参数是[null,null]，没传参数，主要是获取当前移动状态字符串(即最后一行)，中间那些都没用，好触发configuration.orientation改变
    // todo:移动移动结束后，第二次进来是因为有watch监听到configuration.orientation改变了，传参数进来了，让函数重新旋转缩放居中，但不知道有什么用，也许后面什么操作要让configuration.orientation改变来触发此函数来让球体强制改变
    orientation(o: string, view: ViewInterface): string {
        console.log("globe.ts==>orientation()==>o:" + o + " view:" + view);
        let projection: GeoProjection = this.projection, rotate = projection.rotate();
        if (this.µ.isValue(o)) {
            let parts = o.split(","), λ = +parts[0], φ = +parts[1], scale = +parts[2];
            let extent = this.scaleExtent();
            projection.rotate(this.isFinite(λ) && this.isFinite(φ) ?
                [-λ, -φ, rotate[2]] :
                this.newProjection(view).rotate());
            projection.scale(this.isFinite(scale) ? this.µ.clamp(scale, extent[0], extent[1]) : this.fit(view));
            projection.translate(this.center(view));
            // return this;
            return "this";
        }
        return [(-rotate[0]).toFixed(2), (-rotate[1]).toFixed(2), Math.round(projection.scale())].join(",");
    }

    /**
     * Returns an object that mutates this globe's current projection during a drag/zoom operation.
     * Each drag/zoom event invokes the move() method, and when the move is complete, the end() method
     * is invoked.
     *
     * @param startMouse starting mouse position.
     * @param startScale starting scale.
     */
    // 在鼠标移动过程中，不断刷新球体模型当前projection对象
    // fixme:实际让球体转动的地方就是这里的projection.rotate()和projection.scale()
    manipulator(startMouse: Array<number>, startScale: number) {
        let projection = this.projection;
        let sensitivity = 60 / startScale;  // seems to provide a good drag scaling factor
        let rotation = [projection.rotate()[0] / sensitivity, -projection.rotate()[1] / sensitivity];
        let original = projection.precision();
        projection.precision(original * 10);
        return {
            move: (mouse: Array<number>, scale: number) => {
                console.log("globe.ts==>manipulator.move()==>" + mouse + " " + scale);
                if (mouse) {
                    let xd = mouse[0] - startMouse[0] + rotation[0];
                    let yd = mouse[1] - startMouse[1] + rotation[1];
                    projection.rotate([xd * sensitivity, -yd * sensitivity, projection.rotate()[2]]);
                }
                projection.scale(scale);
            },
            end: () => {
                console.log("globe.ts==>manipulator.end()==>");
                projection.precision(original);
            }
        };
    }

    /**
     * @returns {Array} the transform to apply, if any, to orient this globe to the specified coordinates.
     */
    locate(coord: Array<number>): Array<number> {
        return new Array<number>();
    }

    /**
     * Draws a polygon on the specified context of this globe's boundary.
     * @param context a Canvas element's 2d context.
     * @returns the context
     */
    // 给 指定的上下文 画个 球体边界的多边形
    defineMask(context: any) {
        // d3.geo.path().projection(this.projection).context(context)({type: "Sphere"});
        d3.geoPath().projection(this.projection).context(context)({type: "Sphere"});
        return context;
    }

    /**
     * Appends the SVG elements that render this globe.
     * @param mapSvg the primary map SVG container.
     * @param foregroundSvg the foreground SVG container.
     */
    defineMap(mapSvg: any, foregroundSvg: any) {
        // let path = d3.geo.path().projection(this.projection);
        let path = d3.geoPath().projection(this.projection);
        let defs = mapSvg.append("defs");
        defs.append("path")
            .attr("id", "sphere")
            .datum({type: "Sphere"})
            .attr("d", path);
        mapSvg.append("use")
            .attr("xlink:href", "#sphere")
            .attr("class", "background-sphere");
        mapSvg.append("path")
            .attr("class", "graticule")
            // .datum(d3.geo.graticule())
            .datum(d3.geoGraticule())
            .attr("d", path);
        mapSvg.append("path")
            .attr("class", "hemisphere")
            // .datum(d3.geo.graticule().minorStep([0, 90]).majorStep([0, 90]))
            .datum(d3.geoGraticule().stepMinor([0, 90]).stepMajor([0, 90]))
            .attr("d", path);
        mapSvg.append("path")
            .attr("class", "coastline");
        mapSvg.append("path")
            .attr("class", "lakes");
        foregroundSvg.append("use")
            .attr("xlink:href", "#sphere")
            .attr("class", "foreground-sphere");
    }

}

export class Atlantis extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection();
    }

    newProjection(): any {
        // return d3.geo.mollweide().rotate([30, -45, 90]).precision(0.1);
        return null;
    }
}

export class AzimuthalEquidistant extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection();
    }

    newProjection() {
        // return d3.geo.azimuthalEquidistant().precision(0.1).rotate([0, -90]).clipAngle(180 - 0.001);
        return d3.geoAzimuthalEquidistant().precision(0.1).rotate([0, -90]).clipAngle(180 - 0.001);
    }
}

export class ConicEquidistant extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection();
    }

    newProjection() {
        // return d3.geo.conicEquidistant().rotate(this.currentPosition()).precision(0.1);
        return d3.geoConicEquidistant().rotate(this.currentPosition()).precision(0.1);
    }

    center(view: ViewInterface): [number, number] {
        return [view.width / 2, view.height / 2 + view.height * 0.065];
    }
}

export class Equirectangular extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection();
    }

    newProjection() {
        // return d3.geo.equirectangular().rotate(this.currentPosition()).precision(0.1);
        return d3.geoEquirectangular().rotate(this.currentPosition()).precision(0.1);
    }
}

export class Orthographic extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection();
    }

    newProjection(): GeoProjection {
        // return d3.geo.orthographic().rotate(this.currentPosition() as [number,number]).precision(0.1).clipAngle(90);
        return d3.geoOrthographic().rotate(this.currentPosition()).precision(0.1).clipAngle(90);    // clipAngel(90): 投影时，地球另一面的区块略过不画
    }

    defineMap(mapSvg: any, foregroundSvg: any) {
        console.log("Orthographic.defineMap()");
        // let path = d3.geo.path().projection(this.projection);
        let path = d3.geoPath().projection(this.projection);
        let defs = mapSvg.append("defs");
        let gradientFill = defs.append("radialGradient")
            .attr("id", "orthographic-fill")
            .attr("gradientUnits", "objectBoundingBox")
            .attr("cx", "50%").attr("cy", "49%").attr("r", "50%");
        gradientFill.append("stop").attr("stop-color", "#303030").attr("offset", "69%");
        gradientFill.append("stop").attr("stop-color", "#202020").attr("offset", "91%");
        gradientFill.append("stop").attr("stop-color", "#000005").attr("offset", "96%");
    /*    gradientFill.append("stop").attr("stop-color", "#1cff1f").attr("offset", "30%");
        gradientFill.append("stop").attr("stop-color", "#77ff6f").attr("offset", "60%");
        gradientFill.append("stop").attr("stop-color", "#c7edcc").attr("offset", "96%");*/
        defs.append("path")
            .attr("id", "sphere")
            .datum({type: "Sphere"})
            .attr("d", path);
        mapSvg.append("use")
            .attr("xlink:href", "#sphere")
            .attr("fill", "url(#orthographic-fill)");
        mapSvg.append("path")
            .attr("class", "graticule")
            // .datum(d3.geo.graticule())
            .datum(d3.geoGraticule())
            .attr("d", path);
        mapSvg.append("path")
            .attr("class", "hemisphere")
            // .datum(d3.geo.graticule().minorStep([0, 90]).majorStep([0, 90]))
            .datum(d3.geoGraticule().stepMinor([0, 90]).stepMajor([0, 90]))
            .attr("d", path);
        mapSvg.append("path")
            .attr("class", "coastline");
        mapSvg.append("path")
            .attr("class", "lakes");
        foregroundSvg.append("use")
            .attr("xlink:href", "#sphere")
            .attr("class", "foreground-sphere");
    }

    locate(coord: Array<number>) {
        return [-coord[0], -coord[1], this.projection.rotate()[2]];
    }
}

export class Stereographic extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection(view);
    }

    newProjection(view: ViewInterface) {
        // return d3.geo.stereographic().rotate([-43, -20]).precision(1.0).clipAngle(180 - 0.0001).clipExtent([[0, 0], [view.width, view.height]]);
        return d3.geoStereographic().rotate([-43, -20]).precision(1.0).clipAngle(180 - 0.0001).clipExtent([[0, 0], [view.width, view.height]]);
    }
}

export class Waterman extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection();
    }

    newProjection(): any {
        // return d3.geo.polyhedron.waterman().rotate([20, 0]).precision(0.1);
        return null;
    }

    defineMap(mapSvg: any, foregroundSvg: any) {
        // let path = d3.geo.path().projection(this.projection);
        let path = d3.geoPath().projection(this.projection);
        let defs = mapSvg.append("defs");
        defs.append("path")
            .attr("id", "sphere")
            .datum({type: "Sphere"})
            .attr("d", path);
        defs.append("clipPath")
            .attr("id", "clip")
            .append("use")
            .attr("xlink:href", "#sphere");
        mapSvg.append("use")
            .attr("xlink:href", "#sphere")
            .attr("class", "background-sphere");
        mapSvg.append("path")
            .attr("class", "graticule")
            .attr("clip-path", "url(#clip)")
            // .datum(d3.geo.graticule())
            .datum(d3.geoGraticule())
            .attr("d", path);
        mapSvg.append("path")
            .attr("class", "coastline")
            .attr("clip-path", "url(#clip)");
        mapSvg.append("path")
            .attr("class", "lakes")
            .attr("clip-path", "url(#clip)");
        foregroundSvg.append("use")
            .attr("xlink:href", "#sphere")
            .attr("class", "foreground-sphere");
    }
}

export class Winkel3 extends StandardGlobe {
    constructor(view: ViewInterface) {
        super();
        this.projection = this.newProjection();
    }

    newProjection(): any {
        // return d3.geo.winkel3().precision(0.1);
        return null;
    }
}

export const ProjectionInterface = Atlantis || AzimuthalEquidistant || ConicEquidistant || Equirectangular || Orthographic || Stereographic || Waterman || Winkel3;