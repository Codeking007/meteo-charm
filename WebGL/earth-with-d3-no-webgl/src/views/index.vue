<template>
    <div class="app-main" id="display">
        <!--地图模型，用于移动时显示-->
        <svg id="map" class="fill-screen" xmlns="http://www.w3.org/2000/svg" version="1.1"></svg>
        <!--覆盖球体边缘的锯齿-->
        <svg id="foreground" class="fill-screen" xmlns="http://www.w3.org/2000/svg" version="1.1"
             style="z-index: 1;"></svg>
        <!--流线-->
        <canvas id="animation" class="fill-screen"></canvas>
        <!--热力图、grid格点-->
        <canvas id="overlay" class="fill-screen"></canvas>
        <!--maskCanvas-->
        <canvas id="maskCanvas" class="invisible"></canvas>
    </div>
</template>
<script lang="ts">
    import Vue from 'vue';
    import Micro from "@/util/micro";
    import Product from "@/util/product";
    import {
        Atlantis,
        AzimuthalEquidistant,
        ConicEquidistant,
        Equirectangular,
        Orthographic,
        Stereographic,
        Waterman,
        Winkel3
    } from "@/util/globes";
    import lodash from "lodash";
    import * as d3 from 'd3';
    import * as topojson from "topojson";

    let µ = new Micro();
    let globes = d3.map({
        orthographic: Orthographic,
    });
    let product = new Product();
    export default Vue.extend({
        name: 'main-app',
        components: {},
        data() {
            return {
                // region 球体相关
                uniform_earth: {
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
                    transparent_black: [0, 0, 0, 0],
                    remaining: "▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫",
                    completed: "▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪"
                },
                view: µ.view(),
                currentResource: "/data/earth-topo.json?v2",
                currentProjectionName: "orthographic",
                meshValue: null,
                globeValue: null,
                inputController: null,
                doDraw_throttled: null,
                path: null,
                zoom: null,
                configuration: {orientation: "", source: null,},
                signalEnd: null,
                // endregion
                // region 气象相关
                currentPath: "/data/weather/current/current-wind-surface-level-gfs-1.0.json",
                currentParticles: {velocityScale: 1 / 60000, maxIntensity: 17},
                currentGradient: (v, a) => {
                    return µ.extendedSinebowColor(Math.min(v, 100) / 100, a);
                },
                currentBounds: null,
                maskImageData: null,     // 当前球体大小范围内的热力imagedata
                maskData: null,          // 当前球体大小范围内的热力数据，数据是根据像素点索引行y、列x(先按行再按列)存储的颜色值rgba==>maskData[(y * this.view.width + x) * 4~(y * this.view.width + x) * 4+3]==rgba
                columns: [],             // 当前球体大小范围内的风uv显示流动值和风uv实际值==>[[像素索引列][像素索引行][带显示效果的u值，带显示效果的v值，实际的uv值]]
                haveBuiltGrids: false,   // 是否加载完气象数据文件
                runInterpolate: true,    // 是否进行插值
                runShade: true,          // 是否进行热力渲染
                runMgl: true,            // 是否进行流线渲染
                showGridPoints: false,
                colorStyles: null,
                buckets: null,
                particles: [],
                animateHandle: null,
                // endregion
            };
        },
        watch: {
            "configuration.orientation"(val) {
                console.log("watch:configuration.orientation==>" + val);
                this.reorient();
            },
        },
        computed: {},
        mounted() {
            console.profile("this.init()性能分析");
            this.init();
            console.profileEnd();
        },
        methods: {
            init() {
                console.group("this.init()");
                d3.selectAll(".fill-screen").attr("width", this.view.width).attr("height", this.view.height);
                Promise.all([this.buildMesh(this.currentResource), this.buildGlobe(this.currentProjectionName)]).then(() => {
                    this.buildRenderer(this.meshValue, this.globeValue);
                    console.groupEnd();
                    this.buildGrids();
                })
            },
            /*@param resource the GeoJSON resource's URL
            @returns {Object} a promise for GeoJSON topology features: {boundaryLo:, boundaryHi:}*/
            buildMesh(resource) {
                return new Promise((resolve, reject) => {
                    console.log("buildMesh(resource)==> resource:" + resource);
                    µ.loadJson(resource).then((topo: any) => {
                        console.time("building meshes");
                        let o: any = topo["objects"];
                        let coastLo = topojson.feature(topo, µ.isMobile() ? o["coastline_tiny"] : o["coastline_110m"]);
                        let coastHi = topojson.feature(topo, µ.isMobile() ? o["coastline_110m"] : o["coastline_50m"]);
                        let lakesLo = topojson.feature(topo, µ.isMobile() ? o["lakes_tiny"] : o["lakes_110m"]);
                        let lakesHi = topojson.feature(topo, µ.isMobile() ? o["lakes_110m"] : o["lakes_50m"]);
                        console.timeEnd("building meshes");
                        this.meshValue = {
                            coastLo: coastLo,
                            coastHi: coastHi,
                            lakesLo: lakesLo,
                            lakesHi: lakesHi
                        };
                        resolve();
                    });
                });
            },
            /*@param {String} projectionName the desired projection's name.
            @returns {Object} a promise for a globe object.*/
            buildGlobe(projectionName) {
                return new Promise((resolve, reject) => {
                    console.log("buildGlobe(projectionName)==> projectionName:" + projectionName);
                    let builder = globes.get(projectionName);
                    if (builder) {
                        // this.globeValue = new builder(this.view);
                        this.globeValue = new builder(this.view);
                    }
                    resolve();
                });
            },
            buildRenderer(mesh, globe) {
                console.log("this.buildRenderer()");
                if (!mesh || !globe) return null;

                // First clear map and foreground svg contents.
                µ.removeChildren(d3.select("#map").node());
                µ.removeChildren(d3.select("#foreground").node());
                // Create new map svg elements.
                globe.defineMap(d3.select("#map"), d3.select("#foreground"));

                // this.path = d3.geo.path().projection(globe.projection).pointRadius(7);
                this.path = d3.geoPath().projection(globe.projection).pointRadius(7);

                d3.selectAll("path").attr("d", this.path);  // do an initial draw -- fixes issue with safari

                // Throttled draw method helps with slow devices that would get overwhelmed by too many redraw events.
                let REDRAW_WAIT = 5;  // milliseconds
                this.doDraw_throttled = (lodash as any).throttle(() => {
                    this.doDraw();
                }, REDRAW_WAIT, {leading: false});

                // Finally, inject the globe model into the input controller. Do it on the next event turn to ensure
                // renderer is fully set up before events start flowing.
//                this.inputController.globe(globe);
                this.inputController = this.buildInputController();             // interprets drag/zoom operations

                return "ready";
            },
            doDraw() {
                console.log("this.doDraw()");
                this.runInterpolate = false;
                // fixme:这个必须是最后一句话，才能画出来所有改变的结果，相当于WebGL的drawArrays()方法
                d3.selectAll("path").attr("d", this.path);
//                    this.doDraw_throttled = (lodash as any).throttle(doDraw, REDRAW_WAIT, {leading: false});
            },
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
                let op = null;
                let zoom = this.zoom = d3/*.behavior*/.zoom()
                    .on("start", () => {
                        console.group("移动球体zoom");
                        console.log(this.globeValue.projection.translate());
                        console.log("start==>" + this.globeValue.projection.scale());
                        console.log(this.globeValue.projection.rotate());
                        // debugger
                        // fixme:要测试源码要先旋转下地球，这样进入看到的代码才是全的。没旋转的话会漏掉一部分源码
                        // let asd1=this.globeValue.projection.invert([120,30]);
                        let asd = this.globeValue.projection([120, 30]);
                        // debugger
                        op = op || this.newOp(d3.mouse(document.getElementById("display")), this.globeValue.projection.scale());  // a new operation begins
                    })
                    .on("zoom", () => {
                        console.log("zoom==>" + d3.event.transform.k);
                        let currentMouse = d3.mouse(document.getElementById("display")),
                            currentScale = d3.event.transform.k;
                        // op = op || this.newOp(currentMouse, 1);  // Fix bug on some browsers where zoomstart fires out of order.
                        if (op.type === "click" || op.type === "spurious") {
                            let distanceMoved = µ.distance(currentMouse, op.startMouse);
                            if (currentScale === op.startScale && distanceMoved < this.uniform_earth.MIN_MOVE) {
                                // to reduce annoyance, ignore op if mouse has barely moved and no zoom is occurring
                                op.type = distanceMoved > 0 ? "click" : "spurious";
                                return;
                            }
                            this.moveStart();
                            op.type = "drag";
                        }
                        if (currentScale != op.startScale) {
                            op.type = "zoom";  // whenever a scale change is detected, (stickily) switch to a zoom operation
                        }

                        // when zooming, ignore whatever the mouse is doing--really cleans up behavior on touch devices
                        op.manipulator.move(op.type === "zoom" ? null : currentMouse, currentScale);
                        this.move();
                    })
                    .on("end", () => {
                        console.log("end==>");
                        op.manipulator.end();
                        if (op.type === "click") {
                            this.drawLocationMark();
                        } else if (op.type !== "spurious") {  // “伪造的”
                            this.signalEnd();
                        }
                        op = null;  // the drag/zoom/click operation is over
                        console.groupEnd();
                    });

                this.signalEnd = (lodash as any).debounce(() => {
                    console.log("this.signalEnd1()");
                    if (!op || op.type !== "drag" && op.type !== "zoom") {
                        console.log("this.signalEnd2()");
                        this.configuration.orientation = globe.orientation(null, null);
                        this.configuration.source = "moveEnd";
                        this.moveEnd();
                    }
                }, this.uniform_earth.move_end_wait);  // wait for a bit to decide if user has stopped moving the globe

                d3.select("#display").call(zoom);   /* 拖动事件在 #display 元素上发生 */

                zoom.scaleExtent(globe.scaleExtent());
                this.reorient();
            },
            /**
             * @returns {Object} an object to represent the state for one move operation.
             */
            newOp(startMouse, startScale) {
                console.log("this.newOp()");
                return {
                    type: "click",  // initially assumed to be a click operation
                    startMouse: startMouse,
                    startScale: startScale,
                    manipulator: this.globeValue.manipulator(startMouse, startScale)
                };
            },
            reorient() {
                console.group("this.reorient()");
                let options = arguments[3] || {};
                if (!this.globeValue || options.source === "moveEnd") {
                    // reorientation occurred because the user just finished a move operation, so globe is already
                    // oriented correctly.
                    return;
                }
                this.moveStart();
                this.globeValue.orientation(this.configuration.orientation, this.view);
                d3.zoom().scaleTo(d3.select("#display"), this.globeValue.projection.scale());
                this.moveEnd();
                console.groupEnd();
            },
            // Attach to map rendering events on input controller.
            moveStart() {
                console.log("this.moveStart()");
                // 显示粗略地图
                d3.select(".coastline").datum(this.meshValue.coastLo);
                d3.select(".lakes").datum(this.meshValue.lakesLo);
                this.runInterpolate = false;
                this.runShade = false;
                this.drawOverlay();
                this.stopCurrentAnimation(true);
            },
            move() {
                console.log("this.move()");
                this.doDraw_throttled();
            },
            moveEnd() {
                console.log("this.moveEnd()");
                // 显示详细地图
                d3.select(".coastline").datum(this.meshValue.coastHi);
                d3.select(".lakes").datum(this.meshValue.lakesHi);
                d3.selectAll("path").attr("d", this.path);
                this.runInterpolate = true;
                if (this.haveBuiltGrids) {
                    this.interpolateField();
                }
            },
            drawLocationMark() {
//                dispatch.trigger("click", op.startMouse, globe.projection.invert(op.startMouse) || []);
            },
            // endregion
            // region fixme:grids
            // 换气象类型时触发
            buildGrids() {
                this.haveBuiltGrids = false;
                this.stopCurrentAnimation(false);
                product.buildProduct(this.currentPath).then((data) => {
                    this.haveBuiltGrids = true;
                    this.interpolateField();
                });
            },
            // (1)初始化气象类型触发
            // (2)在已经有气象类型后,鼠标移动时触发
            interpolateField() {
                this.stopCurrentAnimation(false);
                // fixme:(1)创建一个跟当前球体相同大小的canvas
                this.createMask();
                // fixme:(2)整理数据：给当前球体大小范围内的地方存储风uv流动值和风uv实际值到columns中，并给该实际值所对应的颜色存到maskData中
                this.currentBounds = this.globeValue.bounds(this.view);
                // How fast particles move on the screen (arbitrary value chosen for aesthetics).
                // 粒子在屏幕上移动多快(为了美观而选的任意值)
                let velocityScale = this.currentBounds.height * this.currentParticles.velocityScale;

                this.columns = [];   // 当前能看见的视图的风数据,数组大小还是屏幕大小，只是给球体范围内的像素点找到气象数据
                // fixme:间距调成每个x值都插值，不是demo的每两个x值进行插值，到时候WebGL也是每个x值插值
                for (let x = this.currentBounds.x; x < this.currentBounds.xMax; x += 1) {
                    if (!this.runInterpolate) {
                        return;
                    }
                    this.interpolateColumn(x, velocityScale);
                }
                // fixme:(3)createField()
                // fixme:(4)画热力图
                this.runShade = true;
                this.drawOverlay();
                // fixme:(5)画流线
                this.runMgl = true;
                this.drawMgl();
            },
            // region fixme:mask==>起到中介作用：创建一个跟当前球体相同大小的canvas
            // (1)并给它fill上某种不透明颜色，这样就知道现在球体的显示范围和区间是多大了
            // (2)然后就可以存储当前显示范围和区间的热力图颜色数据，然后通过这个数据铺到显示的canvas中
            createMask() {
                console.time("render mask");
                // 分离的canvas
                // Create a detached canvas, ask the model to define the mask polygon, then fill with an opaque color.
                let width = this.view.width, height = this.view.height;
                // fixme:这里不应该一直创建createElement，应该重复利用
                // todo:把这个canvas存到data里能更好些？感觉放到template会增加压力
                let canvas: any = d3.select("#maskCanvas").attr("width", width).attr("height", height).node();
                // let canvas = d3.select(document.createElement("canvas")).attr("width", width).attr("height", height).node();
                let context = this.globeValue.defineMask(canvas.getContext("2d"));  // 知道球体边界就可以给它填充颜色了
                context.fillStyle = "rgb(255,0,0)";
                context.fill();
                // (d3.select("#display").node() as any).appendChild(canvas);  // make mask visible for debugging

                this.maskImageData = context.getImageData(0, 0, width, height);
                this.maskData = this.maskImageData.data;  // layout: [r, g, b, a, r, g, b, a, ...]
                console.timeEnd("render mask");
            },
            // 像素点是否在现在球体的显示范围和区间内
            isVisible(x, y) {
                let i = (y * this.view.width + x) * 4;
                return this.maskData[i + 3] > 0;  // non-zero alpha means pixel is visible
            },
            // 给当前视图的像素点设置颜色值
            set(x, y, rgba) {
                let i = (y * this.view.width + x) * 4;
                this.maskData[i] = rgba[0];
                this.maskData[i + 1] = rgba[1];
                this.maskData[i + 2] = rgba[2];
                this.maskData[i + 3] = rgba[3];
                /*this.maskData[i] = 199;
                this.maskData[i + 1] = 237;
                this.maskData[i + 2] = 204;
                this.maskData[i + 3] = 205;*/
                return this;
            },
            // endregion
            // region fixme:给当前球体大小范围内的地方存储风uv流动值和风uv实际值到columns中，并给该实际值所对应的颜色存到maskData中
            interpolateColumn(x, velocityScale) {     // 全屏屏幕像素点在第几列
                let column = [];
                let point = [];
                // fixme:间距调成每个y值都插值，不是demo的每两个y值进行插值，到时候WebGL也是每个y值插值
                for (let y = this.currentBounds.y; y <= this.currentBounds.yMax; y += 1) {
                    if (this.isVisible(x, y)) {
                        point[0] = x;
                        point[1] = y;
                        // fixme:得d3.js版本5.9.2的projection.invert(point)对任何像素点都能算出值，不像低版本那样不在范围内的会返回NaN
                        // todo:所以会导致下面的流程全都会跑一遍，热力图和流线就出问题了
                        let coord = this.globeValue.projection.invert(point);   // 像素点转换成经纬度
                        let color = this.uniform_earth.transparent_black;       // 如果不存颜色的话就是黑色，跟屏幕背景色对应
                        let wind = null;
                        if (coord) {
                            let λ = coord[0], φ = coord[1];
                            if (isFinite(λ)) {
                                wind = product.interpolate(λ, φ);       // 根据经纬度得到相应经纬度点的气象数据
                                let scalar = null;
                                if (wind) {
                                    // 得到在不同投影下的uv值，因为不同投影下，u和v是会改变的，只是uv合起来的风速不变
                                    // 但这里得到的wind[0]和wind[1]都是为了显示效果而乘scale系数的值，但wind[2]还是实际uv值风大小
                                    wind = this.distort(this.globeValue.projection, λ, φ, x, y, velocityScale, wind);
                                    scalar = wind[2];   // 风的大小
                                }
                                // todo:这里获取色卡值方法要改，先用它的
                                if (µ.isValue(scalar)) {
                                    color = this.currentGradient(scalar, this.uniform_earth.overlay_alpha);
                                }
                            }
                        }
                        column[y] = wind || this.uniform_earth.hole_vector;    // 这时的风uv是带显示效果移动比例的，如果没气象数据就返回[NaN, NaN, null]
                        this.set(x, y, color);
                    }
                }
                this.columns[x] = column;
            },
            /**
             * Calculate distortion of the wind vector caused by the shape of the projection at point (x, y). The wind
             * vector is modified in place and returned by this function.
             */
            // 计算由于投影方式不同导致不同点的风u、v值扭曲改变，主要导致方向跟着变了，实际风速=Math.sqrt(u,v)并不改变，只是为了显示效果好而乘了个系数scale
            distort(projection, λ, φ, x, y, scale, wind) {
                let u = wind[0] * scale;
                let v = wind[1] * scale;
                debugger
                let d = µ.distortion(projection, λ, φ, x, y);

                let mind = 0;
                let maxd = 100;
                /*if((Math.abs(d[0])>=mind&&Math.abs(d[1])>=mind&&Math.abs(d[2])>=mind&&Math.abs(d[3])>=mind&&
                    Math.abs(d[0])<=maxd&&Math.abs(d[1])<=maxd&&Math.abs(d[2])<=maxd&&Math.abs(d[3])<=maxd)){
                    console.log(λ,φ,x, y,d)
                }*/

                // Scale distortion vectors by u and v, then add.
                let scaleWind = [];
                scaleWind[0] = d[0] * u + d[2] * v;
                scaleWind[1] = d[1] * u + d[3] * v;
                // fixme:因为zoom越大投影算出来的速度越大，即单位时间内移动的距离越大，所以移动距离的最大限定要跟zoom层的大小有关，这里是zoom/100，这样就可以解决由于高版本d3的projection.invert()对任何像素点都能算出经纬度所导致计算边界点distort扭转距离过大导致错误的情况
                // if(Math.abs(scaleWind[0])<=this.globeValue.projection.scale()/100&&Math.abs(scaleWind[1])<=this.globeValue.projection.scale()/100){
                if (Math.abs(d[0]) >= mind && Math.abs(d[1]) >= mind && Math.abs(d[2]) >= mind && Math.abs(d[3]) >= mind &&
                    Math.abs(d[0]) <= maxd && Math.abs(d[1]) <= maxd && Math.abs(d[2]) <= maxd && Math.abs(d[3]) <= maxd) {
                    /*if(Math.hypot(u,v)>10){
                        console.log("原始"+Math.hypot(u,v));
                    }*/
                    wind[0] = scaleWind[0];
                    wind[1] = scaleWind[1];
                    /*if(Math.hypot(u,v)>10){
                        console.log("扭转"+Math.hypot(wind[0],wind[1]));
                    }*/

                } else {
                    wind[0] = 0;
                    wind[1] = 0;
                }
                return wind;
            },
            // endregion
            // region fixme:createField
            /**
             * @returns {Array} wind vector [u, v, magnitude] at the point (x, y), or [NaN, NaN, null] if wind
             *          is undefined at that point.
             */
            field(x, y) {
                // todo:改写了，适应流线不会乱跳，因为projection.invert()版本问题
                let column = this.columns[Math.round(x)];
                return column && column[Math.round(y)] || this.uniform_earth.null_wind_vector;
            },
            /**
             * @returns {boolean} true if the field is valid at the point (x, y)
             */
            // 像素点是否在球体内
            isDefined(x, y) {
                return this.field(x, y)[2] !== null;
            },
            /**
             * @returns {boolean} true if the point (x, y) lies inside the outer boundary of the vector field, even if
             *          the vector field has a hole (is undefined) at that point, such as at an island in a field of
             *          ocean currents.
             */
            // 像素点的气象值是否是有效值
            isInsideBoundary(x, y) {
                return this.field(x, y) !== this.uniform_earth.null_wind_vector;
            },
            // Frees the massive "columns" array for GC. Without this, the array is leaked (in Chrome) each time a new
            // field is interpolated because the field closure's context is leaked, for reasons that defy explanation.
            release() {
                this.columns = [];

            },
            // 随机给粒子一个在球体内并且像素点有值的随机像素点
            randomize(o) {  // todo: this method is terrible
                let x, y;
                let safetyNet = 0;
                do {
                    x = Math.round(this.random(this.currentBounds.x, this.currentBounds.xMax));
                    y = Math.round(this.random(this.currentBounds.y, this.currentBounds.yMax));
                } while (!this.isDefined(x, y) && safetyNet++ < 30);
                o.x = x;
                o.y = y;
                return o;
            },
            // Return a random integer between min and max (inclusive).
            random(min, max) {
                if (max == null) {
                    max = min;
                    min = 0;
                }
                return min + Math.floor(Math.random() * (max - min + 1));
            },
            // endregion
            // region fixme:画流线
            stopCurrentAnimation(alsoClearCanvas) {
                this.runMgl = false;
                if (alsoClearCanvas) {
                    µ.clearCanvas(d3.select("#animation").node());
                }
            },
            drawMgl() {
                // todo:这一步感觉没必要再重新求范围了
                // let bounds = this.globeValue.bounds(this.view);

                // maxIntensity is the velocity at which particle color intensity is maximum
                // maxIntensity：色卡颜色中最大的那个所对应的数值
                // colorStyles的索引越大，颜色就越白
                this.colorStyles = µ.windIntensityColorScale(this.uniform_earth.intensity_scale_step, this.currentParticles.maxIntensity);
                this.buckets = this.colorStyles.map(() => { // 把要显示的不同强度的粒子放在对应buckets的索引中，buckets的索引和colorStyles的索引一样，所以强度越大颜色越白
                    return [];
                });
                let particleCount = Math.round(this.currentBounds.width * this.uniform_earth.particle_multiplier);  // 粒子数量
                if (µ.isMobile()) {
                    particleCount *= this.uniform_earth.particle_reduction;
                }


                this.particles = [];
                // 初始化随机点，带有像素点的x、y值，还有像素点的年龄
                for (let i = 0; i < particleCount; i++) {
                    this.particles.push(this.randomize({age: this.random(0, this.uniform_earth.max_particle_age)}));
                }

                /*let fadeFillStyle = "rgba(0, 0, 0, 0.97)";  // FF Mac alpha behaves oddly
                let g = (d3.select("#animation").node() as any).getContext("2d");
                g.lineWidth = this.uniform_earth.particle_line_width;  // 动画的线宽
                g.fillStyle = fadeFillStyle;    // 渐入渐出的颜色
                let self = this;
                (function frame() {
                    try {
                        if (!self.runMgl) {
                            self.release();
                            return;
                        }
                        self.evolve();
                        self.draw(g);
                        setTimeout(frame, self.uniform_earth.frame_rate);
                    } catch (e) {
                        console.error(e);
                    }
                })();*/
                this.play();
            },
            play() {
                let fadeFillStyle = "rgba(0, 0, 0, 0.97)";  // FF Mac alpha behaves oddly
                let g = (d3.select("#animation").node() as any).getContext("2d");
                g.lineWidth = this.uniform_earth.particle_line_width;  // 动画的线宽
                g.fillStyle = fadeFillStyle;    // 渐入渐出的颜色

                const _this = this;
                if (this.animateHandle) {
                    return;
                }
                frame();

                function frame() {
                    if (!_this.runMgl) {
                        _this.release();
                        if (_this.animateHandle) {
                            cancelAnimationFrame(_this.animateHandle);
                            delete _this.animateHandle;
                        }
                        return;
                    }
                    _this.evolve();
                    _this.draw(g);
                    _this.animateHandle = requestAnimationFrame(frame);
                }
            },
            evolve() {
                this.buckets.forEach((bucket) => {
                    bucket.length = 0;
                });
                this.particles.forEach((particle) => {
                    if (particle.age > this.uniform_earth.max_particle_age) {  // 如果年龄超100了就重新生成粒子
                        this.randomize(particle).age = 0;
                    }
                    let x = particle.x;
                    let y = particle.y;
                    let v = this.field(x, y);  // vector at current position
                    let m = v[2];
                    if (m === null) {   // 如果没有值就是已经不再球体内了，就让它直接消失重新生成粒子
                        particle.age = this.uniform_earth.max_particle_age;  // particle has escaped the grid, never to return...
                    } else {
                        let xt = x + v[0];
                        let yt = y + v[1];
                        if (this.isDefined(xt, yt)) {  // 如果要到的那个像素点也在球体内，就加到buckets里
                            // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
                            particle.xt = xt;
                            particle.yt = yt;
                            this.buckets[µ.indexFor(m, this.currentParticles.maxIntensity, this.colorStyles)].push(particle);
                        } else {                        // 如果要到的那个像素点没在球体内，即不在可见范围内时，就让它变为起点，等下次再进来时，就走if (m === null)的方法了，就消失重新生成粒子了
                            // Particle isn't visible, but it still moves through the field.
                            particle.x = xt;
                            particle.y = yt;
                        }
                    }
                    particle.age += 1;
                });
            },
            draw(g) {
                // Fade existing particle trails.
                let prev = g.globalCompositeOperation;
                g.globalCompositeOperation = "destination-in";  // todo:为什么设置这个？在源图像中显示目标图像。只有源图像内的目标图像部分会被显示，源图像是透明的。
                g.fillRect(this.currentBounds.x, this.currentBounds.y, this.currentBounds.width, this.currentBounds.height);
                g.globalCompositeOperation = prev;

                // Draw new particle trails.
                this.buckets.forEach((bucket, i) => {
                    if (bucket.length > 0) {
                        g.beginPath();
                        g.strokeStyle = this.colorStyles[i];
                        bucket.forEach((particle) => {
                            g.moveTo(particle.x, particle.y);
                            g.lineTo(particle.xt, particle.yt);
                            particle.x = particle.xt;
                            particle.y = particle.yt;
                        });
                        g.stroke();
                    }
                });
            },
            // endregion
            // 画格点
            drawGridPoints(ctx) {
                if (!this.showGridPoints) return;

                ctx.fillStyle = "rgba(255, 255, 255, 1)";
                // Use the clipping behavior of a projection stream to quickly draw visible points.
                // 在进入point(x, y)方法前会先把参数进行globe.projection(x, y)方法将经纬度转换像素点
                // fixme:但好像这个projection会自动识别(通过console.count计数看的)，如果不在屏幕中显示的话就不会调用里面的方法，如point()方法
                let stream = this.globeValue.projection.stream({
                    point: (x, y) => {
                        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
                    }
                });
                product.forEachPoint((λ, φ, d) => {
                    if (µ.isValue(d)) {
                        stream.point(λ, φ);
                    }
                });
            },
            // 画热力图+格点+色卡及色卡数值提示
            drawOverlay() {
                let ctx = (d3.select("#overlay").node() as any).getContext("2d");

                µ.clearCanvas(d3.select("#overlay").node());
                if (this.runShade) {
                    // 画热力图
                    ctx.putImageData(this.maskImageData, 0, 0);
                }
                // 画格点
                this.drawGridPoints(ctx);
            },
            // endregion
        },
        activated() {

        },
    });
</script>
<style scoped lang="less">

</style>
