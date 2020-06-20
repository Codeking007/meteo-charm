// windy.com的等值线
/*! */
W.define("IsolinesCanvas2D", ["overlays", "rootScope", "utils"], function (e, t, i) {
    return L.CanvasLayer.extend({
        _canvas: null, context: null, ratioScale: 1, onInit: function () {
            this.targetPane = "overlayPane"
        }, onCreateCanvas: function () {
            return this.getCanvas().classList.add("isolines-layer"), this.context = this.getCanvas().getContext("2d"), !0
        }, onCanvasFailed: function () {
            this.context = null
        }, onRemoveCanvas: function () {
            this.context = null
        }, onResizeCanvas: function (e, t) {
            var i = Math.min(window.devicePixelRatio || 1, 2), n = this.getCanvas();
            this.ratioScale = i, n.width = e * i, n.height = t * i, n.style.width = e + "px", n.style.height = t + "px"
        }, onReset: function () {
            this.draw()
        }, epsilon: 1e-4, compareFloats: function (e, t) {
            return Math.abs(e - t) < this.epsilon
        }, dist2D: function (e, t, i, n) {
            var o = i - e, s = n - t;
            return Math.sqrt(o * o + s * s)
        }, isLoop: function (e, t, i, n) {
            return Math.abs(e - i) % 1 < 1e-4 && Math.abs(t - n) % 1 < 1e-4
        }, appendPoints: function (e, t, i, n) {
            var o, s, a, r, l, h, f, d, c, u, v;
            o = t[i + 1], s = t[i];
            var g = 1;
            0 == i ? this.isLoop(o, s, t[n - 1], t[n - 2]) ? (a = t[i + 1] - t[n - 1] + t[n - 3], r = t[i] - t[n - 2] + t[n - 4]) : (a = 2 * o - t[3], r = 2 * s - t[2], g = 0) : (a = t[i - 1], r = t[i - 2]);
            i >= n - 2 ? this.isLoop(t[1], t[0], t[n - 1], t[n - 2]) ? (l = t[i + 1] - t[1] + t[3], h = t[i] - t[0] + t[2]) : (l = 2 * o - t[i - 1], h = 2 * s - t[i - 2], g = 0) : (l = t[i + 3], h = t[i + 2]);
            var p = ((o - a) * (d = h - r) - (s - r) * (f = l - a) > 0 ? -.025 : .025) * g, m = this.dist2D(l, h, a, r);
            m > .02 && (p *= .02 / m);
            var b = d * p, w = -f * p;
            c = (v = .25 / m) * this.dist2D(o, s, a, r), u = v * this.dist2D(l, h, o, s), o += b, s += w, e.push(o - c * f, s - c * d, o, s, o + u * f, s + u * d)
        }, newData: function (e) {  // fixme: e==>等值线数据（./data.json）
            var t, n, o, s, a;
            this.ident = e.params.isolines;
            var r = [];
            for (n = 0; n < e.isoline.length; n++) {
                var l = e.isoline[n], h = [], f = l.bbox;
                // fixme:把经纬度点转换为像素值
                for (s = l.points, o = l.points.length, t = 0; t < o; t += 2) {
                    s[t] = i.latDegToYUnit(s[t]);
                    s[t + 1] = i.lonDegToXUnit(s[t + 1]);
                }
                for (t = 0; t < o; t += 2) {
                    this.appendPoints(h, s, t, o);
                }
                var d = [i.lonDegToXUnit(f[3]), i.latDegToYUnit(f[0]), i.lonDegToXUnit(f[1]), i.latDegToYUnit(f[2])];   // fixme:左上右下角的像素值
                r.push({data: h, value: l.value, data0: s, bb: d, rgba: e.colorFn(l.value)})
            }
            for (this.curves = r, this.hilo = [], a = e.low.value, s = e.low.points, o = a.length, t = 0; t < o; t++) this.hilo.push(a[t], i.lonDegToXUnit(s[t + t + 1]), i.latDegToYUnit(s[t + t]));
            for (this.highStartOffset = 3 * o, a = e.high.value, s = e.high.points, o = a.length, t = 0; t < o; t++) this.hilo.push(a[t], i.lonDegToXUnit(s[t + t + 1]), i.latDegToYUnit(s[t + t]));
            this.data = e, this.draw()
        }, draw: function () {
            if (this.curves && this.context) {
                var n = this.context;
                n.save();
                for (var o, s, a = t.map, r = [i.lonDegToXUnit(a.west), i.latDegToYUnit(a.north), i.lonDegToXUnit(a.east), i.latDegToYUnit(a.south)]; r[0] < 0;) {
                    r[0] += 1;
                    r[2] += 1;
                }
                for (; r[0] > 1;) {
                    r[0] -= 1;
                    r[2] -= 1;
                }
                var l = this.getCanvas().width, h = this.getCanvas().height, f = l / (r[2] - r[0]),
                    d = h / (r[3] - r[1]), c = -f * r[0], u = -d * r[1],
                    v = 1 + Math.max(0, Math.min(.14 * (a.zoom - 3), 1)), g = v * this.ratioScale,
                    p = e[this.ident].convertNumber;
                n.clearRect(0, 0, l, h), n.lineWidth = v, n.font = 2 + 6 * g + "px sans-serif";
                var m, b, w, x, T, C, D, y, U = .05 * (l + h), z = U, S = U, M = l - U, F = h - U, L = function (e) {
                    n.beginPath(), n.moveTo(m[2] * f + e, m[3] * d + u);
                    for (var t = 4; t < b; t += 6) {
                        var i = m[t + 4] * f + e, o = m[t + 5] * d + u, s = m[t + 2] * f + e, a = m[t + 3] * d + u;
                        if (n.bezierCurveTo(m[t] * f + e, m[t + 1] * d + u, s, a, i, o), w && T < 0 && i > z && i < M && o > S && o < F) {
                            var r = i - s, l = o - a;
                            r * r > 4 * l * l && (T = t + 4, x = i, C = o, D = r, y = l)
                        }
                    }
                    n.stroke()
                };
                for (s = 0; s < this.curves.length; s++) {
                    var P = this.curves[s];
                    m = P.data, b = P.data.length, T = -1, w = a.zoom > 3 && b > 48 && (a.zoom > 4 || P.value % 400);
                    for (var X = [], Y = 0; Y < 4; Y += 2) X.push(P.bb[Y] * f + c, P.bb[Y + 1] * d + u);
                    var k = "rgba( " + P.rgba[0] + ", " + P.rgba[1] + ", " + P.rgba[2] + ",";
                    if (n.strokeStyle = k + "0.8)", n.fillStyle = k + "0.9)", X[1] < h && X[3] > 0 && (X[0] < l && X[2] > 0 && L(c), X[0] + f < l && X[2] + f > 0 && L(c + f), X[0] - f < l && X[2] - f > 0 && L(c - f)), T > 0) {
                        n.save();
                        var R = Math.atan(y / D);
                        n.translate(x, C), n.rotate(R);
                        var I = p(P.value), W = 4 * g, O = Math.max(.9 * n.measureText(I).width, 2 * W), A = .5 * O;
                        n.beginPath(), n.moveTo(-A, W), n.lineTo(A, W), n.bezierCurveTo(O, W, O, -W, A, -W), n.lineTo(-A, -W), n.bezierCurveTo(-O, -W, -O, W, -A, W), n.fill(), n.fillStyle = "black", n.textAlign = "center", n.fillText(I, 0, 1 + 2 * g), n.restore()
                    }
                }
                n.textAlign = "center", n.fillStyle = "#FFFF", n.font = "20px sans-serif", n.shadowColor = "#000F", n.shadowBlur = 3, n.shadowOffsetX = 1, n.shadowOffsetY = 1, b = this.hilo.length;
                var q = "L", B = Math.round(16 * g - 4) + "px sans-serif", E = Math.round(1 + 8 * g) + "px sans-serif",
                    j = 5 * g;
                for (o = 0; o < b; o += 3) {
                    o == this.highStartOffset && (q = "H");
                    var G = this.hilo[o + 1] * f + c, H = this.hilo[o + 2] * d + u;
                    if (G < 0 && (G += f), G < l && G > 0 && H > 0 && H < h) {
                        var N = this.hilo[o], _ = this.data.colorFn(N);
                        n.fillStyle = "rgb( " + _[0] + ", " + _[1] + ", " + _[2] + ")", n.font = B, n.fillText(q, G, H - j), n.font = E, n.fillText(p(this.hilo[o]), G, H + j)
                    }
                }
                n.restore()
            }
        }
    })
}),
    /*! */
    W.tag("isolines", "", ".labels-high-lows,.labels-isoline{position:relative;pointer-events:none}.labels-high-lows div,.labels-isoline div{position:absolute;white-space:nowrap;letter-spacing:.08em}.labels-high-lows{z-index:11;pointer-events:auto}.labels-high-lows div{font-size:10px;line-height:1;margin:0;padding:0;text-shadow:0 0 4px black;width:40px;margin-top:-12.5px;margin-left:-20px;text-align:center}.labels-high-lows div span{font-size:15px;display:block}.labels-isoline{z-index:10}.labels-isoline div{font-size:7px;background-color:#aaffff;color:#6b6b6b;padding:.15em .3em;border-radius:1.2em;margin-top:-0.7em;line-height:1;transform-origin:left}", "", function (e) {
        var t = W.require;
        t("isolines"), t("IsolinesCanvas2D")
    }),
    /*! */
    W.define("isolines", ["rootScope", "broadcast", "map", "http", "render", "Color", "IsolinesCanvas2D", "products", "store"], function (e, t, i, n, o, s, a, r, l) {
        var h, f = new a, d = "", c = 0, u = [170, 255, 255, 255], v = s.instance({
            ident: "pressureIsolines",
            steps: 50,
            default: [[99e3, [215, 250, 255, 255]], [100900, [187, 213, 255, 255]], [101500, [202, 255, 197, 255]], [101900, [253, 255, 185, 255]], [102200, [255, 235, 193, 255]], [102500, [255, 210, 201, 255]], [103e3, [255, 206, 236, 255]]]
        });

        function g() {
            h && (d = null, p(h))
        }

        function p(t) {
            h = t;
            var i, s, a = t.isolines,
                g = ("pressure" === a || "temp" === a) && /^ecmwf-hres|^gfs|^icon-eu|^nam/.test(t.directory) || "gh" === a && /^ecmwf-hres|^gfs|^icon-eu/.test(t.directory) ? t.directory : "ecmwf" === l.get("prefferedProduct") ? "ecmwf-hres" : "gfs";
            if (t.directory !== g) {
                var p = r.ecmwf.calendar;
                i = p.ts2path(l.get("timestamp")), s = p.refTime
            } else i = t.path, s = t.refTime;
            var m = e.server + "/" + g + "/" + i + "/siw0/0/0/" + t.isolines + "-" + t.level + ".json?reftime=" + s;
            m !== d ? (c++, n.get(m).then(function (e, t, i) {
                var n = i.data;
                if (!n || c !== e) return;
                n.params = h, n.colorFn = "pressure" === h.isolines ? v.RGBA.bind(v) : function () {
                    return u
                }, f.newData(n), o.emit("rendered", "isolines")
            }.bind(null, c, t)).catch(window.wError.bind(null, "isolines", "Error loading/rendering isolines")), d = m) : o.emit("rendered", "isolines")
        }

        return v.getColor(), {
            redraw: function () {
                return o.emit("rendered", "isolines")
            }, onopen: function (e) {
                f.addTo(i), document.body.classList.add("onisolines"), p(e), t.on("metricChanged", g)
            }, paramsChanged: p, onclose: function () {
                i.removeLayer(f), t.off("metricChanged", g), d = null, document.body.classList.remove("onisolines")
            }
        }
    });