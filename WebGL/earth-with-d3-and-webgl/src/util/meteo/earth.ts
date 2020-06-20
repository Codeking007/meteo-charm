import * as d3 from 'd3';
import * as topojson from "topojson";
import lodash from "lodash";
import Micro, {ViewInterface} from "@/util/meteo/micro.ts";
import {
    StandardGlobe,
    Atlantis,
    AzimuthalEquidistant,
    ConicEquidistant,
    Equirectangular,
    Orthographic,
    Stereographic,
    Waterman,
    Winkel3,
    ProjectionInterface,
} from "@/util/meteo/globes";
import Product from "@/util/meteo/product";
// import Shade from "@/util/meteo/gl/shade";
import Shade from "@/util/meteo/shade/grid/3d/index";
import ShadeW9 from "@/util/meteo/shade/w9/3d/index";
// import Mgl from "@/util/meteo/gl/mgl";
import Mgl from "@/util/meteo/mgl/grid/3d/index";
import MglW9 from "@/util/meteo/mgl/w9/3d/index";
import {Feature, Point} from "geojson";
import {GeoPath, GeoPermissibleObjects, ZoomBehavior} from "d3";

/**
 * 地球主操作ts
 */
export default class {
    private µ: Micro;
    private globes: d3.Map<typeof ProjectionInterface>; // fixme:不加d3.map而是map就会自动默认ES6的map，所以加个d3
    private product: Product;
    private shade: Shade;
    private mgl: Mgl;
    // region 球体相关
    private currentResource: string;
    private currentProjectionName: string;
    private uniform_earth: { [key: string]: any };
    private view: ViewInterface;
    private meshValue: { [key: string]: Feature<Point, { [p: string]: any } | null>; };
    private globeValue: StandardGlobe;
    private path: GeoPath<any, GeoPermissibleObjects>;
    private doDraw_throttled: any;
    private signalEnd: any;
    private configuration: { [key: string]: any };
    private op: { startScale: any; startMouse: any; manipulator: { move: (mouse: Array<number>, scale: number) => void; end: () => void }; type: string };
    private zoom: ZoomBehavior<Element, any>;
    // endregion
    // region 气象相关
    private currentPath: string;
    private currentParticles: { [key: string]: any };
    private currentBounds: { yMax: number; x: number; width: number; y: number; xMax: number; height: number };
    private maskImageData: any;     // 当前球体大小范围内的热力imagedata
    private maskData: any;          // 当前球体大小范围内的热力数据，数据是根据像素点索引行y、列x(先按行再按列)存储的颜色值rgba==>maskData[(y * this.view.width + x) * 4~(y * this.view.width + x) * 4+3]==rgba
    private columns: any[];         // 当前球体大小范围内的风uv显示流动值和风uv实际值==>[[像素索引列][像素索引行][带显示效果的u值，带显示效果的v值，实际的uv值]]
    private haveBuiltGrids: boolean;    // 是否加载完气象数据文件
    private runInterpolate: boolean;    // 是否进行插值
    private runMgl: boolean;            // 是否进行流线渲染
    private currentGradient: (v, a) => any[];
    private colorStyles: any;
    private buckets: any;
    private particles: any[];
    private animateHandle: any;
    private shadeW9: ShadeW9;
    private mglW9: MglW9;

    // endregion
    constructor() {
        this.µ = new Micro();
        this.globes = d3.map({
            orthographic: Orthographic,
        });
        this.product = new Product();
        this.view = this.µ.view();
        this.currentResource = "./data/earth-topo.json?v2";
        this.currentProjectionName = "orthographic";
        this.uniform_earth = {
            second: 1000,
            minute: 60 * 1000,
            hour: 60 * 60 * 1000,
            max_task_time: 100,
            min_sleep_time: 25,
            min_move: 4,
            move_end_wait: 1000,
            overlay_alpha: Math.floor(0.4 * 255),
            intensity_scale_step: 10,
            max_particle_age: 100,
            particle_line_width: 1.0,
            particle_multiplier: 7,
            particle_reduction: 0.75,
            frame_rate: 40,
            null_wind_vector: [NaN, NaN, null],
            hole_vector: [NaN, NaN, null],
            transparent_black: [0, 0, 0, 0]
        };
        this.configuration = {orientation: "", source: null,};
        // Throttled draw method helps with slow devices that would get overwhelmed by too many redraw events.
        this.doDraw_throttled = lodash.throttle(() => {
            this.doDraw();
        }, 0, {leading: false});
        // wait for a bit to decide if user has stopped moving the globe
        this.signalEnd = lodash.debounce(() => {
            if (!this.op || this.op.type !== "drag" && this.op.type !== "zoom") {
                this.configuration.source = "moveEnd";
                this.moveEnd();
            }
        }, this.uniform_earth.move_end_wait);

        this.currentPath = "/data/weather/current/current-wind-surface-level-gfs-1.0.json";
        this.currentParticles = {velocityScale: 1 / 60000, maxIntensity: 17};
        this.currentGradient = (v, a) => {
            return this.µ.extendedSinebowColor(Math.min(v, 100) / 100, a);
        };
        this.colorStyles = null;
        this.buckets = null;
        this.particles = [];
        this.animateHandle = null;
    }

    // 初始化地图和地球
    initMeshAndGlobe() {
        return new Promise((resolve, reject) => {
            Promise.all([this.buildMesh(this.currentResource), this.buildGlobe(this.currentProjectionName)]).then(() => {
                const c = [[48000, [0, 0, 255, 1]], [92000, [152, 189, 197, 1]], [96000, [142, 179, 187, 1]], [100000, [71, 168, 167, 1]], [101000, [51, 98, 139, 1]], [102000, [157, 151, 60, 1]], [103000, [97, 61, 81, 1]], [105000, [95, 60, 81, 1]]];
                /*this.shade = new Shade(this.globeValue, this.view);
                this.shade.setColor(c);
                this.shade.load("./at0_25.png", false).then((meteo) => {
                    this.shade.loadMeteo(meteo, {computeAsVector: [false, false]}, null);
                });*/
                const color = [[0,[37, 74, 255, 1]],[4,[0,99,254, 1]],[7,[0,198,254, 1]],[10,[36,193,147, 1]],[13,[0,229,1, 1]],[17,[0,249,0, 1]],
                    [20,[252,225,0, 1]],[23,[254, 174, 0, 1]],[27,[220,74,28, 1]],[30,[180,0,49, 1]],[33,[253,0,149, 1]],[35,[255,0,0, 1]]];
                this.mgl=new Mgl(this.globeValue, this.view);
                this.mgl.setColor(color);
                this.mgl.load("./wuv_19070114.png").then((meteo)=>{
                    // this.mgl.loadMeteo(meteo, {params: {fadeOpacity:0.996,speedFactor:1 / 600,dropRate:0.003,dropRateBump:0.01,particlesRadix:80}}, null);
                    this.mgl.loadMeteo(meteo, {params: {fadeOpacity:0.96,speedFactor:1 / 3000,dropRate:0.003,dropRateBump:0.01,particlesRadix:160}}, null);
                });
                const c_tmp = [[213.3, [11, 41, 159, 1]], [239.1, [49, 125, 240, 1]], [264.9, [57, 198, 233, 1]], [290.8, [233, 233, 57, 1]], [316.6, [248, 83, 42, 1]], [342.4, [255, 34, 34, 1]], [342.4, [255, 34, 34, 1]]];
                /*this.shadeW9 = new ShadeW9(this.globeValue, this.view);
                this.shadeW9.setColor(c_tmp);
                this.shadeW9.load("./w9_tmp_19110707.png", false).then((meteo) => {
                    this.shadeW9.loadMeteo(meteo, {computeAsVector: [false, false]}, null);
                });*/

                this.mglW9=new MglW9(this.globeValue, this.view);
                this.mglW9.setColor(color);
                this.mglW9.load("./w9_wuv_19070114.png").then((meteo)=>{
                    // this.mgl.loadMeteo(meteo, {params: {fadeOpacity:0.996,speedFactor:1 / 600,dropRate:0.003,dropRateBump:0.01,particlesRadix:80}}, null);
                    this.mglW9.loadMeteo(meteo, {params: {fadeOpacity:0.94,speedFactor:1 / 3000,dropRate:0.003,dropRateBump:0.01,particlesRadix:80}}, null);
                });
                this.buildRenderer();
                resolve();
            });
        });
    }

    /*@param resource the GeoJSON resource's URL
           @returns {Object} a promise for GeoJSON topology features: {boundaryLo:, boundaryHi:}*/
    buildMesh(resource) {
        return new Promise((resolve, reject) => {
            this.µ.loadJson(resource).then((topo: any) => {
                let o: any = topo["objects"];
                let coastLo = topojson.feature(topo, o["coastline_110m"]);
                let coastHi = topojson.feature(topo, o["coastline_50m"]);
                let lakesLo = topojson.feature(topo, o["lakes_110m"]);
                let lakesHi = topojson.feature(topo, o["lakes_50m"]);
                this.meshValue = {
                    coastLo: coastLo,
                    coastHi: coastHi,
                    lakesLo: lakesLo,
                    lakesHi: lakesHi
                };
                resolve();
            });
        });
    }

    /*@param {String} projectionName the desired projection's name.
    @returns {Object} a promise for a globe object.*/
    buildGlobe(projectionName) {
        return new Promise((resolve, reject) => {
            let builder = this.globes.get(projectionName);
            if (builder) {
                // this.globeValue = new builder(this.view);
                this.globeValue = new builder(this.view);
            }
            resolve();
        });
    }

    buildRenderer() {
        if (!this.meshValue || !this.globeValue) return null;

        // First clear map and foreground svg contents.
        this.µ.removeChildren(d3.select("#map").node());
        this.µ.removeChildren(d3.select("#foreground").node());
        // Create new map svg elements.
        this.globeValue.defineMap(d3.select("#map"), d3.select("#foreground"));

        this.path = d3.geoPath().projection(this.globeValue.projection).pointRadius(7);

        d3.selectAll("path").attr("d", this.path);  // do an initial draw -- fixes issue with safari

        // Finally, inject the globe model into the input controller. Do it on the next event turn to ensure
        // renderer is fully set up before events start flowing.
        this.buildInputController();             // interprets drag/zoom operations
    }

    // region fixme:inputController
    /**
     * The input controller is an object that translates move operations (drag and/or zoom) into mutations of the
     * current globe's projection, and emits events so other page components can react to these move operations.
     *
     * D3's built-in Zoom behavior is used to bind to the document's drag/zoom events, and the input controller
     * interprets D3's events as move operations on the globe. This method is complicated due to the complex
     * event behavior that occurs during drag and zoom.
     *
     * D3 move operations usually occur as "zoomstart" -> ("zoom")* -> "zoomend" event chain. During "zoom" events
     * the scale and mouse may change, implying a zoom or drag operation accordingly. These operations are quite
     * noisy. What should otherwise be one smooth continuous zoom is usually comprised of several "zoomstart" ->
     * "zoom" -> "zoomend" event chains. A debouncer is used to eliminate the noise by waiting a short period of
     * time to ensure the user has finished the move operation.
     *
     * The "zoom" events may not occur; a simple click operation occurs as: "zoomstart" -> "zoomend". There is
     * additional logic for other corner cases, such as spurious drags which move the globe just a few pixels
     * (most likely unintentional), and the tendency for some touch devices to issue events out of order:
     * "zoom" -> "zoomstart" -> "zoomend".
     *
     * This object emits clean "moveStart" -> ("move")* -> "moveEnd" events for move operations, and "click" events
     * for normal clicks. Spurious moves emit no events.
     */
    buildInputController() {
        let globe = this.globeValue;
        this.op = null;
        let zoom = this.zoom = d3.zoom()
            .on("start", () => {
                this.op = this.op || this.newOp(d3.mouse(document.getElementById("display")), this.globeValue.projection.scale());  // a new operation begins
            })
            .on("zoom", () => {
                let currentMouse = d3.mouse(document.getElementById("display")),
                    currentScale = d3.event.transform.k;
                // op = op || this.newOp(currentMouse, 1);  // Fix bug on some browsers where zoomstart fires out of order.
                if (this.op.type === "click" || this.op.type === "spurious") {
                    let distanceMoved = this.µ.distance(currentMouse, this.op.startMouse);
                    if (currentScale === this.op.startScale && distanceMoved < this.uniform_earth.MIN_MOVE) {
                        // to reduce annoyance, ignore op if mouse has barely moved and no zoom is occurring
                        this.op.type = distanceMoved > 0 ? "click" : "spurious";
                        return;
                    }
                    this.moveStart();
                    this.op.type = "drag";
                }
                if (currentScale != this.op.startScale) {
                    this.op.type = "zoom";  // whenever a scale change is detected, (stickily) switch to a zoom operation
                }

                // when zooming, ignore whatever the mouse is doing--really cleans up behavior on touch devices
                this.op.manipulator.move(this.op.type === "zoom" ? null : currentMouse, currentScale);
                this.move();
            })
            .on("end", () => {
                this.op.manipulator.end();
                if (this.op.type === "click") {

                } else if (this.op.type !== "spurious") {  // “伪造的”
                    this.signalEnd();
                }
                this.op = null;  // the drag/zoom/click operation is over
            });
        d3.select("#display").call(zoom);   /* 拖动事件在 #display 元素上发生 */

        zoom.scaleExtent(globe.scaleExtent());
        this.reorient();
    }

    /**
     * @returns {Object} an object to represent the state for one move operation.
     */
    newOp(startMouse, startScale) {
        return {
            type: "click",  // initially assumed to be a click operation
            startMouse: startMouse,
            startScale: startScale,
            manipulator: this.globeValue.manipulator(startMouse, startScale)
        };
    }

    reorient() {
        this.moveStart();
        this.globeValue.orientation(this.configuration.orientation, this.view);
        d3.zoom().scaleTo(d3.select("#display"), this.globeValue.projection.scale());
        this.moveEnd();
    }

    // Attach to map rendering events on input controller.
    moveStart() {
        // 显示粗略地图
        d3.select(".coastline").datum(this.meshValue.coastLo);
        d3.select(".lakes").datum(this.meshValue.lakesLo);
        this.runInterpolate = false;
    }

    move() {
        this.doDraw_throttled();
    }

    moveEnd() {
        // 显示详细地图
        d3.select(".coastline").datum(this.meshValue.coastHi);
        d3.select(".lakes").datum(this.meshValue.lakesHi);
        // fixme:这个必须是最后一句话，才能画出来所有改变的结果，相当于WebGL的drawArrays()方法
        d3.selectAll("path").attr("d", this.path);
        this.runInterpolate = true;
        if (this.haveBuiltGrids) {
            // this.interpolateField();
        }
        // this.shade.show();
        this.mgl.play(true);
        // this.shadeW9.show();
        this.mglW9.play(true);
    }

    doDraw() {
        this.runInterpolate = false;
        // fixme:这个必须是最后一句话，才能画出来所有改变的结果，相当于WebGL的drawArrays()方法
        d3.selectAll("path").attr("d", this.path);
        // this.shade.show();
        this.mgl.stop();
        // this.shadeW9.show();
        this.mglW9.stop();
    }
    // endregion
}
