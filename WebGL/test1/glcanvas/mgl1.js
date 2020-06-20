const EXTENT = 1;
const vert = `
uniform mat4 u_matrix;
attribute vec2 a_pos;
varying vec2 v_pos0;
void main() {
    gl_PointSize = 10.0;
    gl_Position = normalize(u_matrix*vec4(a_pos, 0, 1));
}
`;
const frag = `
void main(){
    gl_FragColor = vec4(0,0,1,0.5);
}`;

class Mgl{

    constructor(map) {
        this._map = map;
        this.pxRatio = Math.max(Math.floor(window.devicePixelRatio)||1, 2);
        this._init();
        this._initGL();
    }

    _init() {
        const map = this._map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this._canvas = document.createElement("canvas");
        this._gl = canvas.getContext("webgl");
        canvas.style.cssText= mapCanvas.style.cssText;
        canvas.style.pointerEvents= 'none';
        canvas.width = mapCanvas.width*this.pxRatio;
        canvas.height = mapCanvas.height*this.pxRatio;
        div.appendChild(canvas);
        map.on('resize',(e)=>{
            const mc = e.target.getCanvas();
            canvas.style.width= mc.style.width;
            canvas.style.height= mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width*this.pxRatio;
            canvas.height = mc.height*this.pxRatio;
            this._render();
        });
        map.on('move',(e)=>{
            this._render();
        });
        map.on('load',()=>{
            this._render();
        });
    }

    _initGL() {
        const gl = this._gl;
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vert);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
        const program = this._program = createProgram(gl, vertexShader, fragmentShader);
        const x = 0.5;
        const w = 1;
        const posBuffer = createBuffer(gl, new Float32Array([x,x]));
        bindAttribute(gl,posBuffer,program.a_pos,2);
        gl.useProgram(this._program);
    }

    _render(){
        this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT);
        // const scale = 512;
        const scale = this._map.transform.worldSize;
        const posMatrix = mat4.identity(new Float32Array(16));
        mat4.scale(posMatrix, posMatrix, [scale, scale, 1]);
        mat4.multiply(posMatrix,this._map.transform.projMatrix, posMatrix);
        const m = 0.0001;
        const x = 0.5;
        const y = 0.5;
        const a = [x,y,0,1];
        const b = [x+m,y-m,0,1];
        const r0 = mat4.multiply(new Float32Array(4),posMatrix,a);
        const r1 = mat4.multiply(new Float32Array(4),posMatrix,b);
        let f = (r)=>{return [r[0]/r[3],r[1]/r[3]]};
        // console.log((f(r1)[0]-f(r0)[0])*1e7/scale,(f(r1)[1]-f(r0)[1])*1e7/scale);
        let re = mat4.multiply(new Float32Array(4),posMatrix,[0.5,0.5,0,1]);
        console.log(re[0]/re[3],re[1]/re[3]);
         const i = mat4.invert(new Float32Array(16),posMatrix);
        const a0 = new Float32Array([1,1,0,1]);
        const a1 = new Float32Array([1,1,1,1]);
        // console.log(mat4.mul(new Float32Array(4),posMatrix,a));
        const b0 = mat4.mul(new Float32Array(4),i,a0);
        const b1 = mat4.mul(new Float32Array(4),i,a1);
        const w0 = b0[3];
        const w1 = b1[3];
        const x0 = b0[0] / w0;
        const x1 = b1[0] / w1;
        const y0 = b0[1] / w0;
        const y1 = b1[1] / w1;
        const z0 = b0[2] / w0;
        const z1 = b1[2] / w1;
        const t = z0 === z1 ? 0 : (0 - z0) / (z1 - z0);
        // console.log(c(x0,x1,t),c(y0,y1,t));
        this._gl.uniformMatrix4fv(this._gl.getUniformLocation(this._program, "u_matrix"), false, posMatrix);
        this._gl.drawArrays(this._gl.POINTS, 0, 1);
    }
}

function c(a,b,t){
    return (a * (1 - t)) + (b * t);
}