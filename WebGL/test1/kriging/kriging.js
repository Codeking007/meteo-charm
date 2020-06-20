/**
 *
 * kriging.js
 *
 * Copyright 2012
 */


/* Extend the Array class */
Array.prototype.mean = function () {
    let sum = 0;
    for (let i = 0; i < this.length; i++) {
        sum += this[i];
    }
    return sum / this.length;
    /*var a = [10, 20, 30];
    var total = a.reduce(function (first, second) {
        return first + second;
    }, 0);*/
}

/**
 * Ported R functions
 */
/* Repeat a value 初始化数组为某一特定值*/
let R_rep = function (x, times) {
    let i = new Array(times);
    for (let j = 0; j < i.length; j++) {
        i[j] = x;
    }
    return i;
}

/* Matrix transpose 矩阵转置*/
let R_t = function (x) {
    /* Must be a 2-dimensional matrix */
    let n = x.length;
    let m = x[0].length;

    let y = new Array(m);
    for (let i = 0; i < m; i++) {
        y[i] = new Array(n);
        for (let j = 0; j < n; j++) {
            y[i][j] = x[j][i];
        }
    }
    return y;
}

/* Determinant 行列式*/
let R_det = function (x, n) {
    let det = 0;
    let m = new Array(n - 1);
    for (let i = 0; i < (n - 1); i++) {
        m[i] = new Array(n - 1);
    }

    if (n < 1) return;
    else {
        if (n === 1) {
            det = x[0][0];
        } else {
            if (n === 2) det = x[0][0] * x[1][1] - x[1][0] * x[0][1];
            else {
                det = 0;
                for (let i = 0; i < n; i++) {
                    for (let j = 1; j < n; j++) {
                        let k = 0;
                        for (let l = 0; l < n; l++) {
                            if (l === i) {
                                continue;
                            }
                            m[j - 1][k] = x[j][l];
                            k++;
                        }
                    }
                    det += Math.pow(-1, i + 2) * x[0][i] * R_det(m, n - 1);
                }
            }
        }
        return det;
    }
}

/* Non-R function -- essential for R_solve_ */
let cofactor = function (x, n) {
    let det;
    let c = new Array(n - 1);
    let y = new Array(n);

    for (let i = 0; i < n; i++) y[i] = new Array(n);
    for (let i = 0; i < (n - 1); i++) c[i] = new Array(n - 1);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let k = 0;
            for (let l = 0; l < n; l++) {
                if (l === j) {
                    continue;
                }
                let m = 0;
                for (let o = 0; o < n; o++) {
                    if (o === i) {
                        continue;
                    }
                    c[k][m] = x[l][o];
                    m++;
                }
                k++;
            }
            det = R_det(c, n - 1);
            y[j][i] = Math.pow(-1, j + i + 2) * det;
        }
    }
    return y;
}

/* Matrix inversion -- Gauss-jordan elimination 逆矩阵--高斯 - 约旦法*/
let R_solve = function (a) {
    let n = a.length;
    let m = n;
    let b = new Array(n);
    let indxc = new Array(n);
    let indxr = new Array(n);
    let ipiv = new Array(n);

    let icol, irow;
    let big, dum, pivinv, temp;

    for (let i = 0; i < n; i++) {
        b[i] = new Array(n);
        for (let j = 0; j < n; j++) {
            if (i === j) {
                b[i][j] = 1;
            } else {
                b[i][j] = 0;
            }
        }
    }
    for (let j = 0; j < n; j++) {
        ipiv[j] = 0;
    }
    for (let i = 0; i < n; i++) {
        // 1、全选主元
        // 从第 k 行、第 k 列开始的右下角子阵中选取绝对值最大的元素，并记住次元素所在的行号和列号，在通过行交换和列交换将它交换到主元素位置上。这一步称为全选主元。
        big = 0;
        for (let j = 0; j < n; j++) {
            if (ipiv[j] !== 1) {
                for (let k = 0; k < n; k++) {
                    if (ipiv[k] === 0) {
                        if (Math.abs(a[j][k]) >= big) {
                            big = Math.abs(a[j][k]);
                            irow = j;
                            icol = k;
                        }
                    }
                }
            }
        }
        ++(ipiv[icol]);

        if (irow !== icol) {
            for (let l = 0; l < n; l++) {
                temp = a[irow][l];
                a[irow][l] = a[icol][l];
                a[icol][l] = temp;
            }
            for (let l = 0; l < m; l++) {
                temp = b[irow][l];
                b[irow][l] = b[icol][l];
                b[icol][l] = temp;
            }
        }

        indxr[i] = irow;
        indxc[i] = icol;

        // 2、m(k, k) = 1 / m(k, k)
        if (a[icol][icol] === 0) { /* Singular matrix */
            return false;
        }
        pivinv = 1 / a[icol][icol];

        // 3、m(k, j) = m(k, j) * m(k, k)，j = 0, 1, ..., n-1；j != k
        a[icol][icol] = 1;
        for (let l = 0; l < n; l++) {
            a[icol][l] *= pivinv;
        }
        for (let l = 0; l < m; l++) {
            b[icol][l] *= pivinv;
        }

        // 4、m(i, j) = m(i, j) - m(i, k) * m(k, j)，i, j = 0, 1, ..., n-1；i, j != k
        for (let ll = 0; ll < n; ll++) {
            if (ll !== icol) {
                dum = a[ll][icol];
                a[ll][icol] = 0;
                for (let l = 0; l < n; l++) {
                    a[ll][l] -= a[icol][l] * dum;
                }
                for (let l = 0; l < m; l++) {
                    b[ll][l] -= b[icol][l] * dum;
                }
            }
        }
    }

    // 5、m(i, k) = -m(i, k) * m(k, k)，i = 0, 1, ..., n-1；i != k
    for (let l = (n - 1); l >= 0; l--) {
        if (indxr[l] !== indxc[l]) {
            for (let k = 0; k < n; k++) {
                temp = a[k][indxr[l]];
                a[k][indxr[l]] = a[k][indxc[l]];
                a[k][indxc[l]] = temp;
            }
        }
    }
    return a;
}

let R_solve_cramers_rule = function (x) {
    /* Solve to determine the adjunct matrix */
    let adj = R_t(cofactor(x, x.length));
    let inv_det_a = 1 / R_det(x, x.length);
    let y = new Array(x.length);

    for (let i = 0; i < x.length; i++) {
        y[i] = new Array(x.length);
        for (let j = 0; j < x.length; j++) {
            y[i][j] = inv_det_a * adj[i][j];
        }
    }

    return y;
}

/* Fit a linear model */
let R_lm = function (y, x) {
    let n = y.length;

    /* Add an intercept term to the design matrix */
    x = [R_rep(1, n), x];
    y = [y];

    /* OLS estimate */
    return matrixmult(matrixmult(R_solve(matrixmult(R_t(x), x)), R_t(x)), y);
}

/* Cluster analysis */
let R_kmeans = function (x, y, centers) {

}

/**
 * Matrix multiplication 矩阵相乘
 */
let matrixmult = function (y, x) {
    let n = x.length;
    let m = x[0].length;
    if (m !== y.length) return false;
    let p = y[0].length;
    let z = new Array(n);

    for (let i = 0; i < n; i++) {
        z[i] = new Array(p);
        for (let j = 0; j < p; j++) {
            z[i][j] = 0;
            for (let k = 0; k < m; k++) {
                z[i][j] += x[i][k] * y[k][j];
            }
        }
    }
    return z;
}

/* Point-in-polygon 点是否在多边形内*/
let pip = function (X, Y, x, y) {
    let c = false;
    for (let i = 0, j = X.length - 1; i < X.length; j = i++) {
        if (((Y[i] > y) !== (Y[j] > y)) && (x < (X[j] - X[i]) * (y - Y[i]) / (Y[j] - Y[i]) + X[i])) {
            c = !c;
        }
    }
    return c;
}


/**
 * Defines the kriging class
 *
 */
function kriging(id, pixelsize, meteo) {
    /* Output testing */
    let o = document.getElementById("output");

    /* Global vars */
    let canvaspad = 50;
    let yxratio = 1;

    /* Canvas element */
    let canvasobj = document.getElementById(id);
    this.canvas = document.getElementById(id);
    this.canvas.ctx = this.canvas.getContext("2d");

    /* New objects */
    this.canvas.model = new Object();

    /* Kriging method
     * Usage: kriging(longitude, latitude, response, polygons)
     */
    this.krig = function (x, y, response, polygons) {
        /* Bring the polygons and frame properties into the DOM */
        this.canvas.model.x = x;
        this.canvas.model.y = y;
        this.canvas.model.response = response;
        this.canvas.model.response_min = Math.min(...response);
        this.canvas.model.response_max = Math.max(...response);
        this.canvas.model.response_range = Math.max(...response) - Math.min(...response);
        /*this.canvas.model.response_min = meteo.minAndMax[0][0];
        this.canvas.model.response_max = meteo.minAndMax[0][1];
        this.canvas.model.response_range = meteo.minAndMax[0][1] - meteo.minAndMax[0][0];*/
        this.canvas.polygons = polygons;

        /**
         * Calculate the euclidean distance matrix for the coordinates
         * and the outcome variable 欧几里得计算坐标点间距离和值，存到矩阵中
         */
        console.time("d_n");
        this.canvas.model.n = response.length;
        let D = new Array(this.canvas.model.n);     // 两两计算距离
        let V = new Array(this.canvas.model.n);     // 两两计算差值
        for (let i = 0; i < this.canvas.model.n; i++) {
            D[i] = new Array(this.canvas.model.n);
            V[i] = new Array(this.canvas.model.n);
            for (let j = 0; j < this.canvas.model.n; j++) {
                D[i][j] = Math.hypot(x[i] - x[j], y[i] - y[j]);
                V[i][j] = Math.abs(response[i] - response[j]);
            }
        }
        console.timeEnd("d_n");
        /* Fit the observations to the variogram */
        // 如果有100个点，每个点都与其他的99个点计算半方差，但是这样会产生大量的数据，而且这些数据中有一部分是重复的。这样执行拟合的效率也会很低。
        // 按照帮助文档的说法，我们要精简得到的结果。比如：0~10之间的点求一个均值，10~20，20~30…
        let lags = 10;      // 分成10份
        this.canvas.model.semivariance = new Array();
        this.canvas.model.distance = new Array();
        let cutoff = Math.hypot(Math.max(...x) - Math.min(...x), Math.max(...y) - Math.min(...y)) / 3;
        for (let i = 0; i < lags; i++) {    // 精简结果，弄成lags=10组距离和半方差的坐标
            let sum_z = 0;
            let n_h = 0;
            for (let j = 0; j < this.canvas.model.n; j++) {
                for (let k = j + 1; k < this.canvas.model.n; k++) {     // 这样就可以去掉重复距离的点，并且对角线上距离为0的点也不算进去
                    if (D[j][k] <= ((i + 1) * cutoff / lags)) {     // todo：不是太懂，为什么不是D[j][k] <= ((i + 1) * cutoff / lags)&&D[j][k] >= (i * cutoff / lags)？？？？但是依稀记得他这么算好像也是一种统计方法
                        sum_z += Math.pow(V[j][k], 2);
                        n_h++;
                    }
                }
            }
            if (!isNaN(sum_z / n_h)) {
                this.canvas.model.semivariance.push(sum_z / n_h);
                this.canvas.model.distance.push((i + 1) * cutoff / lags);
            }
        }

        /* Check for enough points in the lag model */
        if (this.canvas.model.semivariance.length < 3) {
            /* ERROR -- quit app */
        }

        /* Estimate the model parameters */
        //todo：这里用的是理论模型参数，以后得改
        let coef = R_lm(this.canvas.model.semivariance, this.canvas.model.distance);
        this.canvas.model.nugget = 0; //coef[0][0]; /* Intercept */     // 块金
        this.canvas.model.range = Math.max(...this.canvas.model.distance);  // 变程
        this.canvas.model.sill = Math.max(...this.canvas.model.semivariance);//coef[0][1] * this.canvas.model.range;   // fixme:基台，不是偏基台值，这里原先写错了，写的偏基台值
        /**
         * Calculate the inverted (n+1) x (n+1) matrix
         * Used to calculate weights
         */
        let X = new Array(this.canvas.model.n + 1);
        for (let i = 0; i <= this.canvas.model.n; i++) {
            X[i] = new Array(this.canvas.model.n + 1);
            for (let j = 0; j <= this.canvas.model.n; j++) {
                if (i === this.canvas.model.n && j !== this.canvas.model.n) {
                    X[i][j] = 1;
                } else {
                    if (i !== this.canvas.model.n && j === this.canvas.model.n) {
                        X[i][j] = 1;
                    } else {
                        if (i === this.canvas.model.n && j === this.canvas.model.n) {
                            X[i][j] = 0;
                        } else {
                            X[i][j] = this.canvas.model.spherical(D[i][j]);
                        }
                    }
                }
            }
        }

        /* Invert the matrix */
        this.canvas.model.X_inv = R_solve(X);
    }

    /* Variogram models */
    // todo:跟kriging.js不一样，改？？？
    this.canvas.model.exponential = function (h) {
        if (h === 0) {
            return 0;
        } else {
            return this.nugget + (this.sill - this.nugget) * (1 - Math.exp((-3 * Math.abs(h)) / this.range));
        }
    }

    this.canvas.model.spherical = function (h) {
        if (h > this.range) {
            return this.sill;
        }
        if (h <= this.range && h > 0) {
            return this.nugget + (this.sill - this.nugget) * ((3 * h) / (2 * this.range) - Math.pow(h, 3) / (2 * Math.pow(this.range, 3)));
        } else {
            return 0;
        }
    }

    /* Model prediction method */
    this.canvas.model.pred = function (x, y) {
        let L = R_rep(1, this.n + 1);
        for (let i = 0; i < this.n; i++) {
            // todo:这里用的是球面模型，如果以后要用其他模型，这里也得该改
            L[i] = this.spherical(Math.hypot(this.x[i] - x, this.y[i] - y));
        }
        let R = matrixmult(this.X_inv, [L])[0];
        R.pop();
        return matrixmult(R_t([R]), [this.response])[0][0];
    }

    /**
     * Set up the map properties, event handlers and initialize the map.
     */
    this.map = function (center, zoom) {
        /* Set up the canvas frame */
        this.canvas.height = window.innerHeight - this.canvas.offsetTop - 20;
        this.canvas.width = window.innerWidth - this.canvas.offsetLeft - 20;
        this.canvas.style.border = "";

        /**
         * Loop through the polygons to determine the limits based on the
         * area of each of the polygons.
         * AND
         * Create an Array containing the center coordinates for each polygon
         * to be used during the sorting algorithm.
         */
        this.canvas.polygoncenters = new Array(this.canvas.polygons.length);
        this.canvas.polygonsorted = new Array(this.canvas.polygons.length);

        for (let i = 0; i < this.canvas.polygons.length; i++) {
            if (i === 0) {
                this.canvas.xlim = [Math.min(...this.canvas.polygons[i][0]), Math.max(...this.canvas.polygons[i][0])];
            } else {
                if (Math.min(...this.canvas.polygons[i][0]) < this.canvas.xlim[0]) {
                    this.canvas.xlim[0] = Math.min(...this.canvas.polygons[i][0]);
                }
                if (Math.max(...this.canvas.polygons[i][0]) > this.canvas.xlim[1]) {
                    this.canvas.xlim[1] = Math.max(...this.canvas.polygons[i][0]);
                }
            }
            this.canvas.polygoncenters[i] = [this.canvas.polygons[i][0].mean(), this.canvas.polygons[i][1].mean()];
            this.canvas.polygonsorted[i] = 0;
        }


        /**
         * Calculate the ratio and pixel size for conversion
         * between units.
         */
        this.canvas.xratio = (this.canvas.xlim[1] - this.canvas.xlim[0]) / this.canvas.width;
        this.canvas.yratio = this.canvas.xratio * yxratio;

        this.canvas.xlim = [center[0] - 0.5 * this.canvas.width * this.canvas.xratio, center[0] + 0.5 * this.canvas.width * this.canvas.xratio];
        this.canvas.ylim = [center[1] - 0.5 * this.canvas.height * this.canvas.yratio, center[1] + 0.5 * this.canvas.height * this.canvas.yratio];

        this.canvas.xpixel = pixelsize * this.canvas.xratio;
        this.canvas.ypixel = pixelsize * this.canvas.yratio;

        /* Start the map */
        this.canvas.zoom(zoom, yxratio, pixelsize);
    }


    /**
     * Navigation
     */
    this.canvas.zoom = function (zoom, yxratio, pixelsize) {
        /* Re-size the limits */
        let newlen = [zoom * (this.xlim[1] - this.xlim[0]) / 2, zoom * (this.ylim[1] - this.ylim[0]) / 2];
        let center = [(this.xlim[1] - this.xlim[0]) / 2 + this.xlim[0], (this.ylim[1] - this.ylim[0]) / 2 + this.ylim[0]];

        /* Reset the properties */
        this.xlim = [center[0] - newlen[0], center[0] + newlen[0]];
        this.ylim = [center[1] - newlen[1], center[1] + newlen[1]];
        this.xratio = (this.xlim[1] - this.xlim[0]) / this.width;
        this.yratio = this.xratio * yxratio;
        this.xpixel = pixelsize * this.xratio;
        this.ypixel = pixelsize * this.yratio;

        /* Render the map */
        this.render();
    }


    /**
     * Methods for drawing onto the canvas
     */

    /* Color spectrums */
    this.canvas.colorspectrum = new Object();
    this.canvas.colorspectrum.heatcolors = ["#FF0000", "#FF0700", "#FF0E00", "#FF1500", "#FF1C00", "#FF2200", "#FF2900", "#FF3000", "#FF3700", "#FF3E00", "#FF4500", "#FF4C00", "#FF5300", "#FF5A00", "#FF6000", "#FF6700", "#FF6E00", "#FF7500", "#FF7C00", "#FF8300", "#FF8A00", "#FF9100", "#FF9800", "#FF9F00", "#FFA500", "#FFAC00", "#FFB300", "#FFBA00", "#FFC100", "#FFC800", "#FFCF00", "#FFD600", "#FFDD00", "#FFE300", "#FFEA00", "#FFF100", "#FFF800", "#FFFF00", "#FFFF0B", "#FFFF20", "#FFFF35", "#FFFF4A", "#FFFF60", "#FFFF75", "#FFFF8A", "#FFFF9F", "#FFFFB5", "#FFFFCA", "#FFFFDF", "#FFFFF4"];
    this.canvas.colorspectrum.terraincolors = ["#00A600", "#07A800", "#0EAB00", "#16AE00", "#1DB000", "#25B300", "#2DB600", "#36B800", "#3EBB00", "#47BE00", "#50C000", "#59C300", "#63C600", "#6CC800", "#76CB00", "#80CE00", "#8BD000", "#95D300", "#A0D600", "#ABD800", "#B6DB00", "#C2DE00", "#CEE000", "#D9E300", "#E6E600", "#E6DD09", "#E7D612", "#E7CF1C", "#E8C825", "#E8C32E", "#E9BE38", "#E9BA41", "#EAB74B", "#EAB454", "#EBB25E", "#EBB167", "#ECB171", "#ECB17B", "#EDB285", "#EDB48E", "#EEB798", "#EEBAA2", "#EFBFAC", "#EFC4B6", "#F0C9C0", "#F0D0CA", "#F1D7D4", "#F1DFDE", "#F2E8E8", "#F2F2F2"];
    this.canvas.colorspectrum.topocolors = ["#4C00FF", "#3B00FF", "#2800FF", "#1600FF", "#0400FF", "#000DFF", "#001FFF", "#0032FF", "#0043FF", "#0055FF", "#0068FF", "#007AFF", "#008BFF", "#009EFF", "#00AFFF", "#00C1FF", "#00D3FF", "#00E5FF", "#00FF4D", "#00FF38", "#00FF24", "#00FF0F", "#05FF00", "#1AFF00", "#2EFF00", "#42FF00", "#57FF00", "#6BFF00", "#80FF00", "#94FF00", "#A8FF00", "#BDFF00", "#D1FF00", "#E6FF00", "#FFFF00", "#FFF90C", "#FFF318", "#FFED24", "#FFE930", "#FFE53B", "#FFE247", "#FFDF53", "#FFDD5F", "#FFDC6B", "#FFDB77", "#FFDB83", "#FFDB8F", "#FFDC9B", "#FFDEA7", "#FFE0B3"];
    this.canvas.colorspectrum.cmcolors = ["#80FFFF", "#85FFFF", "#8AFFFF", "#8FFFFF", "#94FFFF", "#99FFFF", "#9EFFFF", "#A3FFFF", "#A8FFFF", "#ADFFFF", "#B3FFFF", "#B8FFFF", "#BDFFFF", "#C2FFFF", "#C7FFFF", "#CCFFFF", "#D1FFFF", "#D6FFFF", "#DBFFFF", "#E0FFFF", "#E6FFFF", "#EBFFFF", "#F0FFFF", "#F5FFFF", "#FAFFFF", "#FFFAFF", "#FFF5FF", "#FFF0FF", "#FFEBFF", "#FFE6FF", "#FFE0FF", "#FFDBFF", "#FFD6FF", "#FFD1FF", "#FFCCFF", "#FFC7FF", "#FFC2FF", "#FFBDFF", "#FFB8FF", "#FFB3FF", "#FFADFF", "#FFA8FF", "#FFA3FF", "#FF9EFF", "#FF99FF", "#FF94FF", "#FF8FFF", "#FF8AFF", "#FF85FF", "#FF80FF"];
    // this.canvas.colorspectrum.terraincolors=["RGBA(11,41,159,1)", "RGBA(49, 125, 240, 1)", "RGBA(57, 198, 233, 1)","RGBA(233, 233, 57, 1)","RGBA(248, 83, 42, 1)" ,"RGBA(255, 34, 34, 1)" , "RGBA(255, 34, 34, 1)"];

    this.canvas.render = function () {
        this.clear();
        this.background();
        this.points();
    }

    this.canvas.pixel = function (x, y, col) {
        this.ctx.fillStyle = col;

        /* Spaced-out pixels */
        //this.ctx.fillRect((x-this.xlim[0])/this.xratio - pixelsize/2 + 1, this.height - (y-this.ylim[0])/this.yratio - pixelsize/2 + 1, pixelsize - 2, pixelsize - 2);

        /* Solid map */
        this.ctx.fillRect((x - this.xlim[0]) / this.xratio - pixelsize / 2, this.height - (y - this.ylim[0]) / this.yratio - pixelsize / 2, pixelsize, pixelsize);
    }

    this.canvas.focus = function (x, y, v, col) {
        this.ctx.beginPath();
        this.ctx.arc((x - this.xlim[0]) / this.xratio, this.height - (y - this.ylim[0]) / this.yratio, 2, 0, 2 * Math.PI, false);
        this.ctx.fillStyle = col;
        this.ctx.fill();
        this.ctx.fillText(Math.round(v * 100) / 100, (x - this.xlim[0]) / this.xratio - (2 * pixelsize) / 2 + 5, 3 + this.height - (y - this.ylim[0]) / this.yratio - (2 * pixelsize) / 2)
    }

    this.canvas.clear = function () {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /* Plot observed points */
    this.canvas.points = function () {
        for (let i = 0; i < this.model.n; i++) {
            this.focus(this.model.x[i], this.model.y[i], this.model.response[i], "black");
        }
    }

    /* Fills the background with the polygons */
    this.canvas.background = function () {
        /**
         * 1) Nearest-neighbor
         * 2) Loop through sorted polygons
         * 3) Point-in-polygon for eligible points
         * 4) Break if no points in polygon
         */

        for (let i = 0; i < this.polygoncenters.length; i++) {
            this.polygonsorted[i] = Math.hypot(this.polygoncenters[i][0] - this.xlim.mean(), this.polygoncenters[i][1] - this.ylim.mean());
        }
        let maxVal = Math.max(...this.polygonsorted);
        let nearest = this.polygonsorted.indexOf(Math.min(...this.polygonsorted));
        let xbox = [0, 0];
        let ybox = [0, 0];
        let color;

        for (let i = 0; i < this.polygons.length; i++) {
            /* Calculate the intersecting box */
            if (this.xlim[0] > Math.min(...this.polygons[nearest][0])) xbox[0] = this.xpixel * Math.floor(this.xlim[0] / this.xpixel);
            else xbox[0] = this.xpixel * Math.floor(Math.min(...this.polygons[nearest][0]) / this.xpixel);

            if (this.xlim[1] < Math.max(...this.polygons[nearest][0])) xbox[1] = this.xpixel * Math.ceil(this.xlim[1] / this.xpixel);
            else xbox[1] = this.xpixel * Math.ceil(Math.max(...this.polygons[nearest][0]) / this.xpixel);

            if (this.ylim[0] > Math.min(...this.polygons[nearest][1])) ybox[0] = this.ypixel * Math.floor(this.ylim[0] / this.ypixel);
            else ybox[0] = this.ypixel * Math.floor(Math.min(...this.polygons[nearest][1]) / this.ypixel);

            if (this.ylim[0] < Math.max(...this.polygons[nearest][1])) ybox[1] = this.ypixel * Math.ceil(this.ylim[1] / this.ypixel);
            else ybox[1] = this.ypixel * Math.ceil(Math.max(...this.polygons[nearest][1]) / this.ypixel);

            for (let j = xbox[0]; j <= xbox[1]; j += this.xpixel) {
                for (let k = ybox[0]; k <= ybox[1]; k += this.ypixel) {
                    if (pip(this.polygons[nearest][0], this.polygons[nearest][1], j, k)) {
                        color = Math.round(49 * (this.model.pred(j, k) - this.model.response_min) / (this.model.response_range));
                        if (color < 0) color = 0;
                        else if (color > 49) color = 49;
                        this.pixel(j, k, this.colorspectrum.terraincolors[color])
                    }
                }
            }

            this.polygonsorted[nearest] = maxVal;
            nearest = this.polygonsorted.indexOf(Math.min(...this.polygonsorted));

        }
    }

    return true;
}