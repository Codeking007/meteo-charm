const TILESIZE_DEFAULT = 256;
const TEXTURE_FRMAE_MATRIX_K = 4;

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

class Meteo {
    constructor(map) {
        this.map = map;
        this._init();
    }

    initShader() {
        // region fixme:(4)
        this.vert_invert_matrix_K = `            // (1441*721+1)*(1441*721+1)
attribute vec2 a_position;
varying vec2 v_tex;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_tex = (a_position+1.0)/2.0;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

        this.frag_invert_matrix_K = `   
precision highp float;
uniform sampler2D u_frame_matrix_K;   //  纹理单元==>矩阵K=4
uniform vec2 u_frame_matrix_K_size;   // 帧缓冲区宽度、高度==>矩阵K=16,16
varying vec2 v_tex;
const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
float between(float min,float max,float val){
    return (val-min)/(max-min); 
}
void main(){
    // todo:没有const
    const int n=int(${this.params ? this.params.u_frame_distance_value_size + 1 : 1});
    const int m=n;
    float a[n*n],b[n*n],ipiv[n],big, dum, pivinv, temp;
    int icol,irow,indxc[n],indxr[n]; 
    for(int i=0;i<n;i++){
        for(int j=0;j<n;j++){
            a[i*n+j]=texture2D(u_frame_matrix_K,vec2(j,i)/u_frame_matrix_K_size).x*255.0;
        }
    }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (i == j) {
                b[i*n+j] = 1.0;
            } else {
                b[i*n+j] = 0.0;
            }
        }
    }
    for (int j = 0; j < n; j++) {
        ipiv[j] = 0.0;
    }
    for (int i = 0; i < n; i++) {
        // 1、全选主元
        // 从第 k 行、第 k 列开始的右下角子阵中选取绝对值最大的元素，并记住次元素所在的行号和列号，在通过行交换和列交换将它交换到主元素位置上。这一步称为全选主元。
        big = 0.0;
        for (int j = 0; j < n; j++) {
            if (ipiv[j] != 1.0) {
                for (int k = 0; k < n; k++) {
                    if (ipiv[k] == 0.0) {
                        if (abs(a[j*n+k]) >= big) {
                            big = abs(a[j*n+k]);
                            irow = j;
                            icol = k;
                        }
                    }
                }
            }
        }
        // fixme:(改了)等价于++(ipiv[icol]);因为数组中的索引必须是const或者uniform，而这里的是变量，所以加了c_icol和c_irow，把后面的irow和icol都变成了c_irow和c_icol
        for(int c_irow=0;c_irow<n;c_irow++){
            if(c_irow==irow){
                for(int c_icol=0;c_icol<n;c_icol++){           
                    if(c_icol==icol){
                        ++(ipiv[c_icol]); 
                        if (c_irow != c_icol) {
                            for (int l = 0; l < n; l++) {
                                temp = a[c_irow*n+l];
                                a[c_irow*n+l] = a[c_icol*n+l];
                                a[c_icol*n+l] = temp;
                            }
                            for (int l = 0; l < m; l++) {
                                temp = b[c_irow*n+l];
                                b[c_irow*n+l] = b[c_icol*n+l];
                                b[c_icol*n+l] = temp;
                            }
                        }
                        indxr[i] = c_irow;
                        indxc[i] = c_icol;
                        // 2、m(k, k) = 1 / m(k, k)
                        if (a[c_icol*n+c_icol] == 0.0) {  // Singular matrix 
                            break;
                        }
                        pivinv = 1.0 / a[c_icol*n+c_icol];
                
                        // 3、m(k, j) = m(k, j) * m(k, k)，j = 0, 1, ..., n-1；j != k
                        a[c_icol*n+c_icol] = 1.0;
                        for (int l = 0; l < n; l++) {
                            a[c_icol*n+l] *= pivinv;
                        }
                        for (int l = 0; l < m; l++) {
                            b[c_icol*n+l] *= pivinv;
                        }
                
                        // 4、m(i, j) = m(i, j) - m(i, k) * m(k, j)，i, j = 0, 1, ..., n-1；i, j != k
                        for (int ll = 0; ll < n; ll++) {
                            if (ll != c_icol) {
                                dum = a[ll*n+c_icol];
                                a[ll*n+c_icol] = 0.0;
                                for (int l = 0; l < n; l++) {
                                    a[ll*n+l] -= a[c_icol*n+l] * dum;
                                }
                                for (int l = 0; l < m; l++) {
                                    b[ll*n+l] -= b[c_icol*n+l] * dum;
                                }
                            }
                        }
                        break;
                    }
                }  
            }
        }
    }

    // 5、m(i, k) = -m(i, k) * m(k, k)，i = 0, 1, ..., n-1；i != k
    for (int l = (n - 1); l >= 0; l--) {
        if (indxr[l] != indxc[l]) {
            for (int k = 0; k < n; k++) {
                // fixme:(改了)因为数组中的索引必须是const或者uniform，而这里的是变量，所以加了c_indxr和c_indxc，把后面的indxr和indxc都变成了c_indxr和c_indxc
//                temp = a[k*n+indxr[l]];
//                a[k*n+indxr[l]] = a[k*n+indxc[l]];
//                a[k*n+indxc[l]] = temp;
                for(int c_indxr=0;c_indxr<n;c_indxr++){
                    if(c_indxr==indxr[l]){
                        for(int c_indxc=0;c_indxc<n;c_indxc++){
                            if(c_indxc==indxc[l]){
                                temp = a[k*n+c_indxr];
                                a[k*n+c_indxr] = a[k*n+c_indxc];
                                a[k*n+c_indxc] = temp;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    vec2 column_row=floor(v_tex*u_frame_matrix_K_size);
    // fixme:(改了)等价于float k_invert=a[int(column_row.y)*n+int(column_row.x)];因为数组中的索引必须是const或者uniform，而这里的是变量
//    float k_invert=a[int(column_row.y)*n+int(column_row.x)];
    float k_invert;
    for(int c_column_row_i=0;c_column_row_i < n;c_column_row_i++){
        if(c_column_row_i==int(column_row.x)){
            for(int c_column_row_j=0;c_column_row_j<n;c_column_row_j++){
                if(c_column_row_j==int(column_row.y)){
                    k_invert=a[c_column_row_j*n+c_column_row_i];
                    break;
                }
            }
        }
    }
    // todo:这个最小最大值不确定，暂以2*基台的值为正负最大最小值
    // todo:pow函数的第一个参数不能是负的？？？其余的pow也得检查一下
    if(k_invert>0.0){
        gl_FragColor=vec4(0.5,abs(k_invert/255.0),0.0,0.0);
    }else{
        gl_FragColor=vec4(1.0,abs(k_invert/255.0),0.0,0.0);
    }
}`;
        // endregion
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this.canvas = document.createElement("canvas");
        this.gl = canvas.getContext("webgl", {antialiasing: false});    // todo:???
        canvas.style.cssText = mapCanvas.style.cssText;
        canvas.style.pointerEvents = 'none';
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        div.appendChild(canvas);
    }

    _initGL() {
        const gl = this.gl;

        const vertShaderInvertMatrixK = createShader(gl, gl.VERTEX_SHADER, this.vert_invert_matrix_K);
        const fragShaderInvertMatrixK = createShader(gl, gl.FRAGMENT_SHADER, this.frag_invert_matrix_K);
        this.programInvertMatrixK = createProgram(gl, vertShaderInvertMatrixK, fragShaderInvertMatrixK);


        //初始化静态信息
        this.posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
    }

    initFrameBuffer() {
        this.params = {
            u_frame_distance_value_size: 2       // 长度为3
        };

        const fboMatrixK = this.fboMatrixK = this.initFramebufferObject(this.gl, this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1);
        if (!fboMatrixK) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }

    }

    show() {

    }

    setColor(color) {

    }

    load(url, vector) {
        this.initFrameBuffer();
        // 获得图片后再生成顶点着色器、片元着色器，从而生成着色器对象  每次都重新生成这些没什么影响
        this.initShader();
        this._initGL();
        // fixme:(4)
        this.gl.useProgram(this.programInvertMatrixK);
        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRMAE_MATRIX_K); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboMatrixK.texture); // fixme:这里放的是帧缓冲区的纹理图像
        this.gl.uniform1i(this.programInvertMatrixK.u_frame_matrix_K, TEXTURE_FRMAE_MATRIX_K);
        this.gl.uniform2fv(this.programInvertMatrixK.u_frame_matrix_K_size, [this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1]);

        this.krigingInterpolation();
    }

    krigingInterpolation() {
        const gl = this.gl;

        // fixme:(4)K的逆矩阵
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programInvertMatrixK);
        bindAttribute(gl, this.posBuffer, this.programInvertMatrixK.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.pexelsTest4 = new Uint8Array((this.params.u_frame_distance_value_size + 1) * (this.params.u_frame_distance_value_size + 1) * 4);
        this.gl.readPixels(0, 0, (this.params.u_frame_distance_value_size + 1), (this.params.u_frame_distance_value_size + 1), this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pexelsTest4);
        console.log(this.pexelsTest4);
    }

    initFramebufferObject(gl, textureWidth, textureHeight) {      // 指定纹理宽度高度
        let framebuffer, texture;

        // Create a frame buffer object (FBO)
        // fixme:(1)gl.createFramebuffer()：创建帧缓冲区对象
        framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            console.log('Failed to create frame buffer object');
            gl.deleteFramebuffer(framebuffer);
        }

        // Create a texture object and set its size and parameters
        // fixme:(2)创建纹理对象并设置其尺寸和参数
        texture = gl.createTexture(); // Create a texture object
        if (!texture) {
            console.log('Failed to create texture object');
            gl.deleteTexture(texture);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
        // fixme:将纹理的尺寸设为OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT，比<canvas>略小一些，以加快绘制的速度
        // fixme:gl.texImage2D()函数可以为纹理对象分配一块存储纹理图像的区域，供WebGL在其中进行绘制
        // fixme:调用该函数，将最后一个参数设为null，就可以创建一块空白的区域。第5章中这个参数是传入的纹理图像Image对象。
        // fixme:将创建出来的纹理对象存储在framebuffer.texture属性上，以便稍后访问
        let data1 = new Uint8Array(textureWidth * textureHeight * 4);
        data1[0] = 1;
        data1[4] = 2;
        data1[8] = 3;
        data1[12] = 2;
        data1[16] = 2;
        data1[20] = 1;
        data1[24] = 3;
        data1[28] = 4;
        data1[32] = 3;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, data1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // fixme:※※※这里一定要用gl.NEAREST，不能用LINEAR，因为这几步全是用于计算，而不是渲染，不需要它自动插值
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Attach the texture and the renderbuffer object to the FBO
        // fixme:(5)使用帧缓冲区对象的方式与使用渲染缓冲区类似：先将缓冲区绑定到目标上，然后通过操作目标来操作缓冲区对象，而不能直接操作缓冲区对象
        // fixme:gl.bindFramebuffer(target,framebuffer)：将framebuffer指定的帧缓冲区对象绑定到target目标上。如果framebuffer为null，那么已经绑定到target目标上的帧缓冲区对象将被解除绑定
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数framebuffer：指定被绑定的帧缓冲区对象
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);   // fixme：必须先绑定帧缓冲区(这步在步骤里是最后一步，但这里还是得用)
        // fixme:本例使用一个纹理对象来替代颜色缓冲区，所以就将这个纹理对象指定为帧缓冲区的颜色关联对象
        // fixme:gl.framebufferTexture2D(target,attachment,textarget,texture,level)：将texture指定的纹理对象关联到绑定在target目标上的帧缓冲区
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数attachment：指定关联的类型
        // fixme:参数attachment=gl.COLOR_ATTACHMENT0时，表示texture是颜色关联对象
        // fixme:参数attachment=gl.DEPTH_ATTACHMENT时，表示texture是深度关联对象
        // fixme:参数textarget：同第二步的gl.texImage2D()的第1个参数(gl.TEXTURE_2D或gl.TEXTURE_CUBE)
        // fixme:参数texture：指定关联的纹理对象
        // fixme:参数level：指定为0(在使用MIPMAP时纹理时指定纹理的层级)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        framebuffer.texture = texture; // fixme:保存纹理对象 // Store the texture object

        // Check if FBO is configured correctly
        // fixme:(7)检查帧缓冲区是否正确配置
        // fixme:gl.checkFramebufferStatus(target)：检查绑定在target上的帧缓冲区对象的配置状态
        // fixme:参数target：必须是gl.FRAMEBUFFER
        let e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (gl.FRAMEBUFFER_COMPLETE !== e) {
            console.log('Frame buffer object is incomplete: ' + e.toString());
            return error();
        }

        // Unbind the buffer object
        // fixme:这里也是全清空了
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return framebuffer;
    }

}