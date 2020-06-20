const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_WINDBAR = 0;

const vertAll = `
//precision highp float;
attribute vec2 a_pos;           // 顶点坐标
attribute vec2 a_texCoord;      // 纹理坐标
varying vec2 v_texCoord;
void main(){
    gl_Position = vec4(a_pos,0.0,1.0);
    v_texCoord=a_texCoord;
}`;

const fragAll = `
precision mediump float;  
uniform sampler2D u_windBar;    // 纹理单元：风杆
varying vec2 v_texCoord;
void main(){ 
// fixme:共有两种效果
// gl.LINEAR和gl.NEAREST的原始效果，即一对一原模原样铺到屏幕上
//    gl_FragColor=texture2D(u_windBar,v_texCoord);

// fixme:共有三种效果
// 5*5图片：gl.LINEAR和gl.NEAREST用这个，那么固定的坐标就是自己设定的固定的颜色，与数学理论相同
//    gl_FragColor=texture2D(u_windBar,v_texCoord+(1.0/10.0)  );
    // 5*5图片：gl.NEAREST用这个，那么效果就和色卡的数学定义相同，不仅固定坐标就是自己设定的固定颜色，而且在两个固定坐标之间都只会是小坐标的颜色值
    gl_FragColor=texture2D(u_windBar,floor(v_texCoord/(1.0/5.0))*(1.0/5.0)+(1.0/10.0)  );
    
// fixme:共有两种效果
  // 80*80图片：gl.LINEAR和gl.NEAREST都能用这个
//    gl_FragColor=texture2D(u_windBar,floor(v_texCoord/(1.0/80.0))*(1.0/80.0)+(1.0/160.0)  );

}`;

class Meteo {
    constructor(map) {
        this.map = map;
        this._init();
        this._initGL();
    }

    _init() {
        this.fontNum = [60, 30];       // 第一步画8*8大的，就存8*8个值
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
        map.on('resize', (e) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this._render();
        });
        map.on('move', (e) => {
            this._render();
        });
        map.on('load', () => {
            this._render();
        });
    }

    _initGL() {
        const gl = this.gl;

        const vertShaderAll = createShader(gl, gl.VERTEX_SHADER, vertAll);
        const fragShaderAll = createShader(gl, gl.FRAGMENT_SHADER, fragAll);
        this.programAll = createProgram(gl, vertShaderAll, fragShaderAll);


        //初始化静态信息
        this.posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.texBuffer = createBuffer(gl, new Float32Array([1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]));

    }

    show() {
        this.visiable = true;
        this._render();
    }

    setColor(color) {

    }

    load(url, vector) {
        return new Promise((resolve, reject) => {
            let image0 = new Image();
            if (!image0) {
                console.log('Failed to create the image object');
                return false;
            }
            // Register the event handler to be called when image loading is completed
            image0.onload = () => {
                // 读取图片
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = image0.width;
                canvas.height = image0.height;
                ctx.drawImage(image0, 0, 0);
                this.gl.useProgram(this.programAll);
                // todo:改成gl.LINEAR，风杆是彩色的了，很奇怪
                let barData = new Uint8Array(ctx.getImageData(0, 0, image0.width, image0.height).data);
                const windBarTexture = this.windBarTexture = createTexture(this.gl, this.gl.NEAREST, barData, image0.width, image0.height, TEXTURE_INDEX_WINDBAR, this.gl.RGBA);
                this.gl.uniform1i(this.programAll.u_windBar, TEXTURE_INDEX_WINDBAR);
                this._render();
                resolve();
            };
            // Tell the browser to load an Image
            // image0.src = './windBarTest.png';
            image0.src = './windBarTest5.png';
        });
    }

    _render() {
        if (!this.visiable) return;
        const gl = this.gl;
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.clearColor(0, 0, 0, 0); //把清理缓冲区的值设置为黑色
        gl.useProgram(this.programAll);

        bindAttribute(this.gl, this.posBuffer, this.programAll.a_pos, 2);
        bindAttribute(this.gl, this.texBuffer, this.programAll.a_texCoord, 2);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    hide() {
        this.visiable = false;
        this.gl.clearColor(0, 0, 0, 0); //把清理缓冲区的值设置为黑色
        this.gl.clear(this.gl.COLOR_BUFFER_BIT); //调用clear方法，传入参数gl.COLOR_BUFFER_BIT告诉WebGL使用之前定义的颜色来填充相应区域。
    }

    setZIndex(z) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity) {

    }

}