// Extend the Array class
Array.prototype.rep = function (n) {
    return Array.apply(null, new Array(n)).map(Number.prototype.valueOf, this[0]);
};
Array.prototype.pip = function (x, y) {
    let i, j, c = false;
    for (i = 0, j = this.length - 1; i < this.length; j = i++) {
        if (((this[i][1] > y) !== (this[j][1] > y)) && (x < (this[j][0] - this[i][0]) * (y - this[i][1]) / (this[j][1] - this[i][1]) + this[i][0])) {
            c = !c;
        }
    }
    return c;
};

class Kriging{
    kriging_matrix_diag(c, n) {
        let i, Z = [0].rep(n * n);
        for (i = 0; i < n; i++) {
            Z[i * n + i] = c;
        }
        return Z;
    }
    kriging_matrix_transpose(X, n, m) {
        let i, j, Z = new Array(m * n);
        for (i = 0; i < n; i++){
            for (j = 0; j < m; j++){
                Z[j * n + i] = X[i * m + j];
            }
        }
        return Z;
    };
    kriging_matrix_add (X, Y, n, m) {
        let i, j, Z = new Array(n * m);
        for (i = 0; i < n; i++){
            for (j = 0; j < m; j++){
                Z[i * m + j] = X[i * m + j] + Y[i * m + j];
            }
        }
        return Z;
    };
    // Naive matrix multiplication
    kriging_matrix_multiply (X, Y, n, m, p) {
        let i, j, k, Z = new Array(n * p);
        for (i = 0; i < n; i++) {
            for (j = 0; j < p; j++) {
                Z[i * p + j] = 0;
                for (k = 0; k < m; k++){
                    Z[i * p + j] += X[i * m + k] * Y[k * p + j];
                }
            }
        }
        return Z;
    };
    // Cholesky decomposition
    kriging_matrix_chol (X, n) {
        let i, j, k, sum, p = new Array(n);
        for (i = 0; i < n; i++){
            p[i] = X[i * n + i];
        }
        for (i = 0; i < n; i++) {
            for (j = 0; j < i; j++){
                p[i] -= X[i * n + j] * X[i * n + j];
            }
            if (p[i] <= 0) {
                return false;
            }
            p[i] = Math.sqrt(p[i]);
            for (j = i + 1; j < n; j++) {
                for (k = 0; k < i; k++){
                    X[j * n + i] -= X[j * n + k] * X[i * n + k];
                }
                X[j * n + i] /= p[i];
            }
        }
        for (i = 0; i < n; i++){
            X[i * n + i] = p[i];
        }
        return true;
    };
    // Inversion of cholesky decomposition
    kriging_matrix_chol2inv (X, n) {
        let i, j, k, sum;
        for (i = 0; i < n; i++) {
            X[i * n + i] = 1 / X[i * n + i];
            for (j = i + 1; j < n; j++) {
                sum = 0;
                for (k = i; k < j; k++){
                    sum -= X[j * n + k] * X[k * n + i];
                }
                X[j * n + i] = sum / X[j * n + j];
            }
        }
        for (i = 0; i < n; i++){
            for (j = i + 1; j < n; j++){
                X[i * n + j] = 0;
            }
        }
        for (i = 0; i < n; i++) {
            X[i * n + i] *= X[i * n + i];
            for (k = i + 1; k < n; k++){
                X[i * n + i] += X[k * n + i] * X[k * n + i];
            }
            for (j = i + 1; j < n; j++){
                for (k = j; k < n; k++){
                    X[i * n + j] += X[k * n + i] * X[k * n + j];
                }
            }
        }
        for (i = 0; i < n; i++){
            for (j = 0; j < i; j++){
                X[i * n + j] = X[j * n + i];
            }
        }
    };
    // Inversion via gauss-jordan elimination
    kriging_matrix_solve(X, n) {
        let m = n;
        let b = new Array(n * n);
        let indxc = new Array(n);
        let indxr = new Array(n);
        let ipiv = new Array(n);
        let i, icol, irow, j, k, l, ll;
        let big, dum, pivinv, temp;
        for (i = 0; i < n; i++){
            for (j = 0; j < n; j++) {
                if (i === j){
                    b[i * n + j] = 1;
                } else {
                    b[i * n + j] = 0;
                }
            }
        }
        for (j = 0; j < n; j++) {
            ipiv[j] = 0;
        }
        for (i = 0; i < n; i++) {
            big = 0;
            for (j = 0; j < n; j++) {
                if (ipiv[j] !== 1) {
                    for (k = 0; k < n; k++) {
                        if (ipiv[k] === 0) {
                            if (Math.abs(X[j * n + k]) >= big) {
                                big = Math.abs(X[j * n + k]);
                                irow = j;
                                icol = k;
                            }
                        }
                    }
                }
            }
            ++(ipiv[icol]);
            if (irow !== icol) {
                for (l = 0; l < n; l++) {
                    temp = X[irow * n + l];
                    X[irow * n + l] = X[icol * n + l];
                    X[icol * n + l] = temp;
                }
                for (l = 0; l < m; l++) {
                    temp = b[irow * n + l];
                    b[irow * n + l] = b[icol * n + l];
                    b[icol * n + l] = temp;
                }
            }
            indxr[i] = irow;
            indxc[i] = icol;
            if (X[icol * n + icol] === 0) {
                return false;// Singular
            }
            pivinv = 1 / X[icol * n + icol];
            X[icol * n + icol] = 1;
            for (l = 0; l < n; l++){
                X[icol * n + l] *= pivinv;
            }
            for (l = 0; l < m; l++){
                b[icol * n + l] *= pivinv;
            }
            for (ll = 0; ll < n; ll++) {
                if (ll !== icol) {
                    dum = X[ll * n + icol];
                    X[ll * n + icol] = 0;
                    for (l = 0; l < n; l++){
                        X[ll * n + l] -= X[icol * n + l] * dum;
                    }
                    for (l = 0; l < m; l++) {
                        b[ll * n + l] -= b[icol * n + l] * dum;
                    }
                }
            }
        }
        for (l = (n - 1); l >= 0; l--){
            if (indxr[l] !== indxc[l]) {
                for (k = 0; k < n; k++) {
                    temp = X[k * n + indxr[l]];
                    X[k * n + indxr[l]] = X[k * n + indxc[l]];
                    X[k * n + indxc[l]] = temp;
                }
            }
        }
        return true;
    };

    // Variogram models
    kriging_variogram_gaussian  (h, nugget, range, sill, A) {
        return nugget + ((sill - nugget) / range) * (1.0 - Math.exp(-(1.0 / A) * Math.pow(h / range, 2)));
    };
    kriging_variogram_exponential  (h, nugget, range, sill, A) {
        return nugget + ((sill - nugget) / range) * (1.0 - Math.exp(-(1.0 / A) * (h / range)));
    };
    kriging_variogram_spherical  (h, nugget, range, sill, A) {
        if (h > range) {
            return nugget + (sill - nugget) / range;
        }
        return nugget + ((sill - nugget) / range) * (1.5 * (h / range) - 0.5 * Math.pow(h / range, 3));
    };

    // Train using gaussian processes with bayesian priors
    /**
     * 普通克里金法和泛克里金法所共有的参数
     * @param t         样本值
     * @param x         样本x坐标
     * @param y         样本y坐标
     * @param model     半变异函数模型
     * @param sigma2    平方差
     * @param alpha
     * @returns {{t: *, x: *, y: *, nugget: number, range: number, sill: number, A: number, n: number}}
     */
    train  (t, x, y, model, sigma2, alpha) {
        let variogram = {
            t: t,
            x: x,
            y: y,
            nugget: 0.0,
            range: 0.0,
            sill: 0.0,
            A: 1 / 3,
            n: 0
        };
        switch (model) {
            case "gaussian":
                variogram.model = this.kriging_variogram_gaussian;
                break;
            case "exponential":
                variogram.model = this.kriging_variogram_exponential;
                break;
            case "spherical":
                variogram.model = this.kriging_variogram_spherical;
                break;
        }

        // Lag distance/semivariance
        let i, j, k, l, n = t.length;
        let distance = new Array((n * n - n) / 2);
        for (i = 0, k = 0; i < n; i++){
            for (j = 0; j < i; j++, k++) {
                distance[k] = new Array(2);
                distance[k][0] = Math.hypot(x[i] - x[j],y[i] - y[j]);
                distance[k][1] = Math.abs(t[i] - t[j]);
            }
        }
        distance.sort(function (a, b) {
            return a[0] - b[0];
        });
        variogram.range = distance[(n * n - n) / 2 - 1][0];

        // Bin lag distance
        let lags = ((n * n - n) / 2) > 30 ? 30 : (n * n - n) / 2;
        let tolerance = variogram.range / lags;
        let lag = [0].rep(lags);
        let semi = [0].rep(lags);
        if (lags < 30) {
            for (l = 0; l < lags; l++) {
                lag[l] = distance[l][0];
                semi[l] = distance[l][1];
            }
        } else {
            for (i = 0, j = 0, k = 0, l = 0; i < lags && j < ((n * n - n) / 2); i++, k = 0) {
                while (distance[j][0] <= ((i + 1) * tolerance)) {
                    lag[l] += distance[j][0];
                    semi[l] += distance[j][1];
                    j++;
                    k++;
                    if (j >= ((n * n - n) / 2)) break;
                }
                if (k > 0) {
                    lag[l] /= k;
                    semi[l] /= k;
                    l++;
                }
            }
            if (l < 2) {
                return variogram;   // Error: Not enough points
            }
        }

        // Feature transformation
        n = l;
        variogram.range = lag[n - 1] - lag[0];
        let X = [1].rep(2 * n);
        let Y = new Array(n);
        let A = variogram.A;
        for (i = 0; i < n; i++) {
            switch (model) {
                case "gaussian":
                    X[i * 2 + 1] = 1.0 - Math.exp(-(1.0 / A) * Math.pow(lag[i] / variogram.range, 2));
                    break;
                case "exponential":
                    X[i * 2 + 1] = 1.0 - Math.exp(-(1.0 / A) * lag[i] / variogram.range);
                    break;
                case "spherical":
                    X[i * 2 + 1] = 1.5 * (lag[i] / variogram.range) - 0.5 * Math.pow(lag[i] / variogram.range, 3);
                    break;
            }
            Y[i] = semi[i];
        }

        // Least squares
        let Xt = this.kriging_matrix_transpose(X, n, 2);
        let Z = this.kriging_matrix_multiply(Xt, X, 2, n, 2);
        Z = this.kriging_matrix_add(Z, this.kriging_matrix_diag(1 / alpha, 2), 2, 2);
        let cloneZ = Z.slice(0);
        if (this.kriging_matrix_chol(Z, 2)){
            this.kriging_matrix_chol2inv(Z, 2);
        }else {
            this.kriging_matrix_solve(cloneZ, 2);
            Z = cloneZ;
        }
        let W = this.kriging_matrix_multiply(this.kriging_matrix_multiply(Z, Xt, 2, 2, n), Y, 2, n, 1);

        // Variogram parameters
        variogram.nugget = W[0];
        variogram.sill = W[1] * variogram.range + variogram.nugget;
        variogram.n = x.length;

        // Gram matrix with prior
        n = x.length;
        let K = new Array(n * n);
        for (i = 0; i < n; i++) {
            for (j = 0; j < i; j++) {
                K[i * n + j] = variogram.model(Math.hypot(x[i] - x[j],y[i] - y[j]), variogram.nugget, variogram.range, variogram.sill, variogram.A);
                K[j * n + i] = K[i * n + j];
            }
            K[i * n + i] = variogram.model(0, variogram.nugget, variogram.range, variogram.sill, variogram.A);
        }

        // Inverse penalized Gram matrix projected to target vector
        let C = this.kriging_matrix_add(K, this.kriging_matrix_diag(sigma2, n), n, n);
        let cloneC = C.slice(0);
        if (this.kriging_matrix_chol(C, n)){
            this.kriging_matrix_chol2inv(C, n);
        } else {
            this.kriging_matrix_solve(cloneC, n);
            C = cloneC;
        }

        // Copy unprojected inverted matrix as K
        K = C.slice(0);
        let M = this.kriging_matrix_multiply(C, t, n, n, 1);
        variogram.K = K;
        variogram.M = M;

        return variogram;
    };

    // Model prediction
    predict  (x, y, variogram) {
        let i, k = new Array(variogram.n);
        for (i = 0; i < variogram.n; i++) {
            k[i] = variogram.model(Math.hypot(x - variogram.x[i], y - variogram.y[i]), variogram.nugget, variogram.range, variogram.sill, variogram.A);
        }
        return this.kriging_matrix_multiply(k, variogram.M, 1, variogram.n, 1)[0];
    };
    variance (x, y, variogram) {
        let i, k = new Array(variogram.n);
        for (i = 0; i < variogram.n; i++) {
            k[i] = variogram.model(Math.hypot(x - variogram.x[i], y - variogram.y[i]), variogram.nugget, variogram.range, variogram.sill, variogram.A);
        }
        return variogram.model(0, variogram.nugget, variogram.range, variogram.sill, variogram.A) + this.kriging_matrix_multiply(this.kriging_matrix_multiply(k, variogram.K, 1, variogram.n, variogram.n), k, 1, variogram.n, 1)[0];
    };

    // Gridded matrices or contour paths
    /**
     *
     * @param polygons      插值范围，点数组构成 [[[113.33752441406284,29.881896972656477],[113.3394713498775,29.879479149706071],[113.34130859375034,29.876525878906421],...],]
     * @param variogram     kriging.train(t, x, y, "exponential", 0, 10);
     * @param width
     * @returns {any[]}
     */
    grid(polygons, variogram, width) {
        let i, j, k, n = polygons.length;
        if (n === 0){
            return;
        }
        // Boundaries of polygons space
        let xlim = [polygons[0][0][0], polygons[0][0][0]];
        let ylim = [polygons[0][0][1], polygons[0][0][1]];
        for (i = 0; i < n; i++){// Polygons
            for (j = 0; j < polygons[i].length; j++) { // Vertices
                if (polygons[i][j][0] < xlim[0]){
                    xlim[0] = polygons[i][j][0];
                }
                if (polygons[i][j][0] > xlim[1]){
                    xlim[1] = polygons[i][j][0];
                }
                if (polygons[i][j][1] < ylim[0]){
                    ylim[0] = polygons[i][j][1];
                }
                if (polygons[i][j][1] > ylim[1]){
                    ylim[1] = polygons[i][j][1];
                }
            }
        }

        // Alloc for O(n^2) space
        let xtarget, ytarget;
        let a = new Array(2), b = new Array(2);
        let lxlim = new Array(2); // Local dimensions
        let lylim = new Array(2); // Local dimensions
        let x = Math.ceil((xlim[1] - xlim[0]) / width);
        let y = Math.ceil((ylim[1] - ylim[0]) / width);

        let A = new Array(x + 1);
        for (i = 0; i <= x; i++) {
            A[i] = new Array(y + 1);
        }
        for (i = 0; i < n; i++) {
            // Range for polygons[i]
            lxlim[0] = polygons[i][0][0];
            lxlim[1] = lxlim[0];
            lylim[0] = polygons[i][0][1];
            lylim[1] = lylim[0];
            for (j = 1; j < polygons[i].length; j++) { // Vertices
                if (polygons[i][j][0] < lxlim[0]){
                    lxlim[0] = polygons[i][j][0];
                }
                if (polygons[i][j][0] > lxlim[1]) {
                    lxlim[1] = polygons[i][j][0];
                }
                if (polygons[i][j][1] < lylim[0]) {
                    lylim[0] = polygons[i][j][1];
                }
                if (polygons[i][j][1] > lylim[1]) {
                    lylim[1] = polygons[i][j][1];
                }
            }

            // Loop through polygon subspace
            a[0] = Math.floor(((lxlim[0] - ((lxlim[0] - xlim[0]) % width)) - xlim[0]) / width);
            a[1] = Math.ceil(((lxlim[1] - ((lxlim[1] - xlim[1]) % width)) - xlim[0]) / width);
            b[0] = Math.floor(((lylim[0] - ((lylim[0] - ylim[0]) % width)) - ylim[0]) / width);
            b[1] = Math.ceil(((lylim[1] - ((lylim[1] - ylim[1]) % width)) - ylim[0]) / width);
            for (j = a[0]; j <= a[1]; j++){
                for (k = b[0]; k <= b[1]; k++) {
                    xtarget = xlim[0] + j * width;
                    ytarget = ylim[0] + k * width;
                    if (polygons[i].pip(xtarget, ytarget)) {
                        A[j][k] = this.predict(xtarget, ytarget, variogram);
                    }
                }
            }
        }
        A.xlim = xlim;
        A.ylim = ylim;
        debugger
        A.zlim = [Math.min(...variogram.t),Math.max(...variogram.t)];
        A.width = width;
        return A;
    };

    // Plotting on the DOM
    /**
     *
     * @param canvas    渲染容器
     * @param grid      渲染的插值，跟point插值点有关系 kriging.grid(world, variogram, width)
     * @param xlim      渲染的最大最小值范围  [113.220276, 113.476929]
     * @param ylim      渲染的最大最小值范围   [29.737915, 29.965698]
     * @param colors    渲染颜色分级数组
     */
    plot(canvas, grid, xlim, ylim, colors) {
        // Clear screen
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Starting boundaries
        let range = [xlim[1] - xlim[0], ylim[1] - ylim[0], grid.zlim[1] - grid.zlim[0]];
        let i, j, x, y, z;
        let n = grid.length;
        let m = grid[0].length;
        let wx = Math.ceil(grid.width * canvas.width / (xlim[1] - xlim[0]));
        let wy = Math.ceil(grid.width * canvas.height / (ylim[1] - ylim[0]));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                if (grid[i][j] == undefined) {
                    continue;
                }
                x = canvas.width * (i * grid.width + grid.xlim[0] - xlim[0]) / range[0];
                y = canvas.height * (1 - (j * grid.width + grid.ylim[0] - ylim[0]) / range[1]);
                z = (grid[i][j] - grid.zlim[0]) / range[2];
                if (z < 0.0) {
                    z = 0.0;
                }
                if (z > 1.0) {
                    z = 1.0;
                }
                ctx.fillStyle = colors[Math.floor((colors.length - 1) * z)];
                ctx.fillRect(Math.round(x - wx / 2), Math.round(y - wy / 2), wx, wy);
            }
        }
    };
}