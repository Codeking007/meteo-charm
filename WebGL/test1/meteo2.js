const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_VALUE = 1;

const vert = `
const float PI = 3.141592653589793;
const int size = 256;
attribute vec2 a_position;
attribute float a_value;
uniform vec3 u_coord;
varying float v_value;
float ms = exp2(u_coord.z);
float adjust(float val,float offset){
    return (val*ms-offset)*2.0-1.0;
}
float x(float lon){
    return adjust((lon+180.0)/360.0,u_coord.x);
}
float y(float lat){
    return adjust(0.5-log((1.0+sin(lat*PI/180.0))/(1.0-sin(lat*PI/180.0)))/(4.0*PI),u_coord.y);
}
void main(){
    gl_Position = vec4(x(a_position.x),y(a_position.y), 0, 1);
    v_value = a_value;
}`;

const frag = `
precision mediump float;
uniform sampler2D u_color;
uniform vec2 u_cmm;
varying float v_value;
void main(){
    gl_FragColor = texture2D(u_color,vec2(v_value/10.0,1));//vec4(1,0,0,1);
}`;
class Meteo{
    constructor(tileSize) {
        this.tileSize = tileSize?tileSize:TILESIZE_DEFAULT;
        const gl = this.gl = document.getElementById("c").getContext("webgl");
        // this.canvas = document.createElement("canvas");
        // this.canvas.width = this.tileSize;
        // this.canvas.height = this.tileSize;
        // const gl = this.gl = this.canvas.getContext("webgl");
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vert);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
        const program = this.program = createProgram(gl, vertexShader, fragmentShader);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.useProgram(this.program);
    }

    setColor(color){
        const color2D = createColorRamp(color);
        const colorTexture = createTexture(this.gl,this.gl.LINEAR,color2D,TEXTURE_INDEX_COLOR,color2D.length/4,1);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_color"), TEXTURE_INDEX_COLOR);
        this.gl.uniform2fv(this.gl.getUniformLocation(this.program, "u_cmm"),new Float32Array([color[0][0],color[color.length-1][0]]));
    }

    load(url,vector){
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = ()=>{
                this._loadImage(image);
                resolve();
            };
            image.src = url;
        });
    }

    getVectorTile(x,y,z){
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, "u_coord"),x,y,z);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.posLength);
        const pixels = new Uint8Array(this.tileSize * this.tileSize * 4);
        this.gl.readPixels(0, 0, this.tileSize, this.tileSize, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        return {width:this.tileSize,height:this.tileSize,data:pixels};
        // return base64Img2Blob(this.canvas.toDataURL("image/png"));
        function base64Img2Blob(code){
            let parts = code.split(';base64,');
            let contentType = parts[0].split(':')[1];
            let raw = window.atob(parts[1]);
            let rawLength = raw.length;
            let uInt8Array = new Uint8Array(rawLength);
            for(let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }
            return new Blob([uInt8Array], {type: contentType});
        }
    }
    _loadImage(image){
        //this.valueTexture = createTexture(this.gl, this.gl.LINEAR, image);
        //读取图片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        // // 形成数据纹理
        const lon = [-180,180];
        const lat = [-90,90];
        let data = transImageData(ctx.getImageData(0, 0, image.width, image.height - 1).data, ctx.getImageData(0, image.height - 1, 8, 1).data,image.width,image.height-1,lon,lat);
        const posBuffer = createBuffer(this.gl, data[0]);
        const posLoc = this.gl.getAttribLocation(this.program, "a_position");
        bindAttribute(this.gl,posBuffer,posLoc,2);
        const valueBuffer = createBuffer(this.gl, data[1]);
        const valueLoc = this.gl.getAttribLocation(this.program, "a_value");
        bindAttribute(this.gl,valueBuffer,valueLoc,1);
        this.posLength = data[2];

        function transImageData1(data,dataMam,width,height,lonMam,latMam){
            const d0 = new Float32Array([-180,-78,-180,78,180,-78,-180,78,180,78,180,-78]);
            // const d0 = new Float32Array([-1,-1,-1,1,1,1,1,1,1,-1,-1,-1]);
            const d1 = new Float32Array([0,5,5,5,10,5]);
            return [d0,d1,d1.length];
        }

        function transImageData(data,dataMam,width,height,lonMam,latMam){
            // 最大最小值
            // const mm = getMinAndMax(dataMam);
            const mm=[[0,12]];
            // 获取格点值(换成矢量改这个方法)
            const vs = getValue(data,mm);
            const ps = new Float32Array(6*2*((width-1)*(height-1)));
            const cs = new Float32Array(ps.length/2);
            let idx = 0;
            for(let n = 1;n<height;n++){
                for(let m = 1;m<width;m++){
                    let pp=[[ratio(m-1,width,lonMam),ratio(n-1,height,latMam),getData(vs,m-1,n-1,width)],
                        [ratio(m-1,width,lonMam),ratio(n,height,latMam),getData(vs,m-1,n,width)],
                        [ratio(m,width,lonMam),ratio(n,height,latMam),getData(vs,m,n,width)],
                        [ratio(m,width,lonMam),ratio(n-1,height,latMam),getData(vs,m,n-1,width)]];
                    idx += addRectangle(idx,pp,ps,cs);
                }
            }
            return [ps,cs,idx];

            function addRectangle(idx,pp,ps,cs){
                let list = pp.filter(value => !isNaN(value[2]));
                if(list.length <3) return 0;
                if(list.length === 3){
                    addL(idx,ps,cs,list);
                    return 3;
                }else{
                    let c = Math.abs(pp[0][2]-pp[2][2])-Math.abs(pp[1][2]-pp[3][2]);
                    let l = [];
                    if(c>0)
                        l.push(pp[0],pp[1],pp[3],pp[1],pp[2],pp[3]);
                    else
                        l.push(pp[0],pp[1],pp[2],pp[0],pp[2],pp[3]);
                    addL(idx,ps,cs,l);
                    return l.length;
                }
                function addL(idx,ps,cs,l){
                    for(let m=0;m<l.length;m++){
                        let pi = idx+m;
                        ps[2*pi] = l[m][0];
                        ps[2*pi+1] = l[m][1];
                        cs[pi] = l[m][2];
                    }
                }
            }

            function getData(data,col,row,width,height){return data[row*width+col];}

            // function ratio(v,l){return (2*v-l)/l}
            function ratio(v,l,mam){return (mam[1]-mam[0])*v/(l-1)+mam[0];}

            function getValue(data,mm){
                const re = new Float32Array(data.length / 4);
                for(let m=0;m<re.length;m++){
                    if(data[4*m+3] ===0)
                        re[m] = Number.NaN;
                    else
                        re[m] = computeValue(data[4*m],mm[0]);
                }
                return re;
                function computeValue(val,valM){
                    if(val === 255)
                        return Number.NaN;
                    else
                        return (valM[1]-valM[0]) * val/ 250 + valM[0];
                }
            }
            function getMinAndMax(uintArray){
                let mm = new Array(3);
                for (let n = 0; n < mm.length; n++) {
                    let d = mm[n] = new Float32Array(2);
                    let u = new Uint8Array(d.buffer);
                    for (let m = 0; m < u.length; m++)
                        u[m] = uintArray[4 * m + n];
                }
                return mm;
            }
        }
    }
}