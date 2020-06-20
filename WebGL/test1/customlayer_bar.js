const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_DATA = 14;
const TEXTURE_INDEX_WINDBAR = 13;
const TEXTURE_FRAMEBUFFER = 12;

const vertW9 = `
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

const fragW9 = `
precision highp float;
const float PREC = 255.0/250.0;
uniform mat4 u_matrix_invert;
uniform vec3 u_lon;         // 经度最小值、最大值、步长
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
uniform sampler2D u_data;   //  图片纹理单元=1
uniform float u_opacity;    // 1.0
varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
float between(float min,float max,float val){
    return (val-min)/(max-min);
}    
vec2 tilePos(vec2 pos){     
    vec4 p0 = u_matrix_invert*vec4(pos,0,1);
    vec4 p1 = u_matrix_invert*vec4(pos,1,1);    
    p0 = p0/p0.w;
    p1 = p1/p1.w;
    float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
    return mix(p0,p1,t).xy;     // todo:线性混合
}
vec2 coord(vec2 pos){   // pos:经纬度
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
}
vec2 geoPos(vec2 pos){
    float lon = mix(-180.0,180.0,pos.x);
    float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
    return vec2(lon,lat);
}
bool valid(vec2 pos){ 
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
        if(valid(c)){
            vec2 eachValue=texture2D(u_data, c).xy*PREC;       //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            vec2 val1=floor(eachValue * 65535.0 / 256.0);
            vec2 val2=eachValue*65535.0-val1*256.0;
            gl_FragColor = vec4(val1/255.0,val2/255.0);         // 把uv比例值存成四通道的
        }
    }
}`;

const vertAll = `
precision highp float;
const float PI = 3.141592653589793;
attribute vec2 a_pos;           // 顶点坐标
attribute vec2 a_texCoord;      // 纹理坐标
varying vec2 v_texCoord;
void main(){
    gl_Position = vec4(a_pos,0.0,1.0);
    v_texCoord=a_texCoord;
}`;

const fragAll = `
precision highp float;  
const float PI = 3.141592653589793;
uniform sampler2D u_frameImage; // 纹理单元：帧缓冲区铺的热力图
uniform sampler2D u_windBar;    // 纹理单元：风杆
uniform vec2 u_min;         // 各通道像素最小值
uniform vec2 u_max;         // 各通道像素最大值
uniform vec2 u_num;         // 要画的图片的横向纵向的图标个数==帧缓冲区中的图标个数
varying vec2 v_texCoord;
// fixme:参数u向右，v向下，返回角度0°朝上，逆时针旋转
float transferredFromSpeedToDirectionOfWind(float u,float v,float speed) {      // 单位m/s
		float degree = asin(u / speed) * 180.0 / PI;
		if (u < 0.0 && v < 0.0) {
			degree = 180.0 - degree;
		} else if (u > 0.0 && v < 0.0) {
			degree = 180.0 - degree;
		} else if (u < 0.0 && v > 0.0) {
			degree = 360.0 + degree;
		}else if (u == 0.0 && v < 0.0) {
            degree = 180.0;
        } else if (u == 0.0 && v > 0.0) {
            degree = 0.0;
        }
		degree += 180.0;
		if (degree >= 360.0) {
			degree -= 360.0;
		}
		return degree;  // 向上为0，逆时针旋转
}     
float transferredFromSpeedToBf(float speed){          // 速度(m/s)转成风级 
		if(speed<0.2){
			return 0.0;
		}else if(speed<=1.5){
			return 1.0;
		}else if(speed<=3.3) {
			return 2.0;
		}else if(speed<=5.4) {
			return 3.0;
		}else if(speed<=7.9) {
			return 4.0;
		}else if(speed<=10.7) {
			return 5.0;
		}else if(speed<=13.8) {
			return 6.0;
		}else if(speed<=17.1){
			return 7.0;
		}else if(speed<=20.7){
			return 8.0;
		}else if(speed<=24.4) {
			return 9.0;
		}else if(speed<=28.4) {
			return 10.0;
		}else if(speed<=32.6) {
			return 11.0; 
		}else if(speed<=36.9) {
			return 12.0;
		}else if(speed<=41.4) {
			return 13.0;
		}else if(speed<=46.1) {
			return 14.0;
		}else if(speed<=50.9) {
			return 15.0;
		}else if(speed<=56.0) {
			return 16.0;
		}else if(speed<=61.2) {
			return 17.0;
		}else {
			return 18.0;
		}
}
// fixme:让风杆纹理坐标相对风杆图片对应的风杆图标中心点旋转，即让风杆图标相对自己的中心点反方向旋转；又因为风杆纹理(0,0)是从左下角开始的，纹理在y坐标是相反的，所以要关于x轴对称在加到风杆纹理中心点上
vec2 modelMatrix(vec2 windBar_texturePoint,vec2 windBar_centralTexturePoint,float direction){
    float rotateAngle=(direction)/180.0*PI;            // 风方向是向上为0，逆时针旋转的；根据右手定则，旋转矩阵为逆时针的，即顶点旋转direction，图标旋转(-direction)
    vec2 pointRelativeOriginal=windBar_texturePoint-windBar_centralTexturePoint;     // 相对原点,以风杆图标中心点为原点
    vec2 pointAfterRotate=vec2(pointRelativeOriginal.x*cos(rotateAngle)-pointRelativeOriginal.y*sin(rotateAngle),pointRelativeOriginal.x*sin(rotateAngle)+pointRelativeOriginal.y*cos(rotateAngle));
    return windBar_centralTexturePoint+vec2(pointAfterRotate.x,-pointAfterRotate.y);    // fixme:因为风杆纹理坐标从左下角开始(画出来的图片是反过来的)，所以要关于x轴对称，y就取相反值
}
void main(){ 
    // 算出每个16*16的中心位置的速度、方向、风级
    /*vec2 u_radix=vec2(1920.0,968.0);      // 要画的图片的宽度高度
    vec2 u_perRadix=vec2(32.0,32.0);    // 要画的图片的每部分的宽度高度
    vec2 u_num=vec2(60.0,30.0);           // fixme:要画的图片的横向纵向的图标个数==帧缓冲区中的图标个数*/
    vec2 perRadix=1.0/u_num;        // 在纹理坐标中每个风杆的坐标大小
    vec2 startTexturePoint=floor(v_texCoord/perRadix)*perRadix;  // 每个16*16区域内的起始纹理坐标点
    vec4 rateUV=texture2D(u_frameImage, startTexturePoint);
    // fixme:这里设的gl.clearColor(255, 255, 255, 0),rgb都是255，因为uv是双通道，存成四通道了，无法判断值是否有效，而redis存的值最高是254，所以只要是255的就是无效值
//    if(rateUV.r!=1.0&&rateUV.g!=1.0&&rateUV.b!=1.0){         // fixme:有效的值ba通道都设的1.0，如果不是1.0就不画了，因为如果画的话，取出来的值都是0.0，而后面有个mix方法，会取u_min的值，这样就错了，那些中心点没值也画出来东西了
      float val1 = (rateUV.x*256.0*255.0+rateUV.z*255.0)/65535.0; 
      float val2 = (rateUV.y*256.0*255.0+rateUV.w*255.0)/65535.0; 
      vec2 eachValue=mix(u_min,u_max,vec2(val1,val2)); // m/s      //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
      float speed=length(eachValue);    // 速度m/s    // 不需要考虑正负，因为肯定是矢量
      float direction=transferredFromSpeedToDirectionOfWind(eachValue.x,eachValue.y,speed);   // 方向，逆时针方向的
      float bf=transferredFromSpeedToBf(speed);  // m/s  // 风级
      
      // 通过风级计算在风杆图标在风杆图片中的起始位置
//      vec2 u_windBar_radix=vec2(160.0,160.0);       // 风杆图片宽度高度
//      vec2 u_windBar_perRadix=vec2(32.0,32.0);    // 风杆图标宽度高度
      vec2 u_windBar_radix=vec2(240.0,240.0);       // 风杆图片宽度高度
      vec2 u_windBar_perRadix=vec2(48.0,48.0);    // 风杆图标宽度高度
      vec2 u_windBar_num=vec2(5.0,5.0);           // 风杆图片横向纵向的图标个数
      vec2 windBarPerRadix=1.0/u_windBar_num;       // 在风杆图片的纹理坐标中每个风杆的坐标大小
      vec2 windBar_startTexturePoint=vec2(fract(bf/u_windBar_num.x),floor(bf/u_windBar_num.x)/u_windBar_num.y);   // 风级对应风杆图标起始的纹理坐标
      vec2 windBar_centralTexturePoint=windBar_startTexturePoint+windBarPerRadix/2.0;           // 风杆图标的中心纹理坐标
      vec2 windBar_endTexturePoint=windBar_startTexturePoint+windBarPerRadix;   // 风级对应风杆图标结束的纹理坐标
      vec2 windBar_texturePoint=(v_texCoord-startTexturePoint)/perRadix*windBarPerRadix+windBar_startTexturePoint;   // 当前纹理坐标对应风杆图片的纹理坐标，这步比较不好想
      vec2 windBar_modelMatrix=modelMatrix(windBar_texturePoint,windBar_centralTexturePoint,direction);         // 关于当前风杆图标中心点旋转后的风杆图片纹理坐标点
      if(windBar_modelMatrix.x>=windBar_startTexturePoint.x&&windBar_modelMatrix.x<=windBar_endTexturePoint.x&&windBar_modelMatrix.y>=windBar_startTexturePoint.y&&windBar_modelMatrix.y<=windBar_endTexturePoint.y){   // 将风杆图标旋转后，有的地方超出当前风杆图标未旋转时的正方形范围了，那些超出范围的点就落到四周风杆图标上了，所以不画
        gl_FragColor=texture2D(u_windBar,windBar_modelMatrix);
      }
//    }
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
        this.resizeFontNum(canvas.width, canvas.height);
        div.appendChild(canvas);
        map.on('resize', (e) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this.resizeFontNum(canvas.width, canvas.height);
            // fixme：重置屏幕大小时要重新创建帧缓冲区，因为它的大小变了
            const fbo = this.fbo = this.initFramebufferObject(this.gl);
            if (!fbo) {
                console.log('Failed to intialize the framebuffer object (FBO)');
                return;
            }
            this._render();
        });
        map.on('move', (e) => {
            this._render();
        });
        map.on('load', () => {
            this._render();
        });
    }

    resizeFontNum(canvasWidth, canvasHeight) {
        // let windBar_icon_width_height = [32, 32];  // 风杆图片每个图标的宽度、高度
        let windBar_icon_width_height = [48, 48];  // 风杆图片每个图标的宽度、高度
        this.fontNum = [Math.floor(canvasWidth / windBar_icon_width_height[0]), Math.floor(canvasHeight / windBar_icon_width_height[1])];

    }

    _initGL() {
        const gl = this.gl;
        const vertShaderW9 = createShader(gl, gl.VERTEX_SHADER, vertW9);
        const fragShaderW9 = createShader(gl, gl.FRAGMENT_SHADER, fragW9);
        this.programW9 = createProgram(gl, vertShaderW9, fragShaderW9);

        const vertShaderAll = createShader(gl, gl.VERTEX_SHADER, vertAll);
        const fragShaderAll = createShader(gl, gl.FRAGMENT_SHADER, fragAll);
        this.programAll = createProgram(gl, vertShaderAll, fragShaderAll);

        const fbo = this.fbo = this.initFramebufferObject(this.gl);
        if (!fbo) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }

        //初始化静态信息
        this.posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.texBuffer = createBuffer(gl, new Float32Array([1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]));

        this.gl.useProgram(this.programW9);
        this.gl.uniform1f(this.programW9.u_opacity, 0.8);
    }

    show() {
        this.visiable = true;
        this._render();
    }

    setColor(color) {

    }

    load(url, vector) {
        return MeteoImage.load(url).then((meteo) => {
            this.meteo = meteo;
            // 形成数据纹理
            createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
            this.gl.useProgram(this.programW9);
            this.gl.uniform1i(this.programW9.u_data, TEXTURE_INDEX_DATA);
            this.gl.uniform3fv(this.programW9.u_lon, meteo.lon);
            this.gl.uniform3fv(this.programW9.u_lat, meteo.lat);
            this.gl.useProgram(this.programAll);
            this.gl.uniform2fv(this.programAll.u_min, [meteo.minAndMax[0][0], meteo.minAndMax[1][0]]);
            this.gl.uniform2fv(this.programAll.u_max, [meteo.minAndMax[0][1], meteo.minAndMax[1][1]]);
            this.loadWindBar();
        });
    }

    loadWindBar() {
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
                let barData = new Uint8Array(ctx.getImageData(0, 0, image0.width, image0.height).data);
                this.gl.useProgram(this.programAll);
                // todo:改成gl.LINEAR，风杆是彩色的了，很奇怪
                // fixme：这里传入的是barData，而不是image0，因为image0不是Uint8Array类型，走createTexture()方法时会进入else情况，生成的图片透明色都是错的，不知道为什么，所以采用Uint8Array数据让它进入createTexture()的if情况
                // const windBarTexture = this.windBarTexture = createTexture(this.gl, this.gl.NEAREST, image0, image0.width, image0.height, TEXTURE_INDEX_WINDBAR, this.gl.RGBA);
                const windBarTexture = this.windBarTexture = createTexture(this.gl, this.gl.NEAREST, barData, image0.width, image0.height, TEXTURE_INDEX_WINDBAR, this.gl.RGBA);
                this.gl.uniform1i(this.programAll.u_windBar, TEXTURE_INDEX_WINDBAR);
                this.gl.uniform2fv(this.programAll.u_windBar_radix, new Float32Array([image0.width, image0.height]));
                this._render();
                resolve();
            };
            // Tell the browser to load an Image
            // image0.src = './windBar.png';
            image0.src = './wind_48.png';
        });
    }


    _render() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        // fixme:gl.viewport(x, y, width, height)==>用来设置视口，即指定从标准设备到窗口坐标的x、y仿射变换
        // x：GLint，用来设定视口的左下角水平坐标。默认值：0。
        // y：GLint，用来设定视口的左下角垂直坐标。默认值：0。
        // width：非负数Glsizei，用来设定视口的宽度。默认值：canvas的宽度。
        // height：非负数Glsizei，用来设定视口的高度。默认值：canvas的高度。
        // fixme:(1)铺热力图，像素存的是uv比例值
        const gl = this.gl;
        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRAMEBUFFER); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fbo.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.viewport(0, 0, this.fontNum[0], this.fontNum[1]);
        this.gl.clearColor(255, 255, 255, 0);   // fixme:这里设的rgb都是255，因为uv是双通道，存成四通道了，无法判断值是否有效，而redis存的值最高是254，所以只要是255的就是无效值
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programW9);
        gl.uniformMatrix4fv(this.programW9.u_matrix_invert, false, this._matrixInvert());
        // fixme:每次调用gl.drawArrays()方法画之前，每次都得重新绑定所有attribute，因为WebGL中所有attribute用的是同一块内存，分别存到索引0123...中，所以每次画不同的东西时，都得重新gl.bindBuffer()
        bindAttribute(this.gl, this.posBuffer, this.programW9.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // fixme:(2)画风杆
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programAll);
        this.gl.uniform1i(this.programAll.u_frameImage, TEXTURE_FRAMEBUFFER);
        this.gl.uniform2fv(this.programAll.u_num, this.fontNum);
        bindAttribute(this.gl, this.posBuffer, this.programAll.a_pos, 2);
        bindAttribute(this.gl, this.texBuffer, this.programAll.a_texCoord, 2);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    initFramebufferObject(gl) {
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

        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.gl.canvas.width, this.gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.fontNum[0], this.fontNum[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);   // fixme:这里跟以前的不一样，不是全屏的
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        /*gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);*/
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);     // fixme:这个缓冲区纹理存的是各个值，所以不应该是LINEAR,而是NEAREST，取的都是最近点
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);     // fixme:这个缓冲区纹理存的是各个值，所以不应该是LINEAR,而是NEAREST，取的都是最近点
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

    _matrixInvert() {
        // 逆矩阵
        return mat4.invert(new Float32Array(16), this._matrix());
    }

    _matrix() { // mapbox坐标
        const scale = this.map.transform.worldSize;
        const matrix = mat4.identity(new Float32Array(16)); // 定义为单元阵
        mat4.scale(matrix, matrix, [scale, scale, 1]);
        mat4.multiply(matrix, this.map.transform.projMatrix, matrix);
        return matrix;
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
        this.gl.uniform1f(this.programW9.u_opacity, opacity);
    }

}

class Custom {
    constructor(map,color) {
        this.map = map;
        this.color=color;
        this.id = 'mycustomlayer';
        this.type = 'custom';
        this.renderingMode = '3d';
    }
    onAdd(map, gl) {
        console.log("执行onAdd()")
        this.gl=gl;

        this.fontNum = [60, 30];       // 第一步画8*8大的，就存8*8个值
        const mapCanvas = map.getCanvas();
        this.resizeFontNum(mapCanvas.width, mapCanvas.height);
        map.on('resize', (e) => {
            const mc = e.target.getCanvas();
            this.resizeFontNum(mc.width, mc.height);
            // fixme：重置屏幕大小时要重新创建帧缓冲区，因为它的大小变了
            const fbo = this.fbo = this.initFramebufferObject(this.gl);
            if (!fbo) {
                console.log('Failed to intialize the framebuffer object (FBO)');
                return;
            }
        });


        this._initGL();
        this.show();
        this.setColor(this.color);
        this.load("18072516_25.png",false);
    }

    resizeFontNum(canvasWidth, canvasHeight) {
        // let windBar_icon_width_height = [32, 32];  // 风杆图片每个图标的宽度、高度
        let windBar_icon_width_height = [48, 48];  // 风杆图片每个图标的宽度、高度
        this.fontNum = [Math.floor(canvasWidth / windBar_icon_width_height[0]), Math.floor(canvasHeight / windBar_icon_width_height[1])];

    }

    _initGL() {
        const gl = this.gl;
        const vertShaderW9 = createShader(gl, gl.VERTEX_SHADER, vertW9);
        const fragShaderW9 = createShader(gl, gl.FRAGMENT_SHADER, fragW9);
        this.programW9 = createProgram(gl, vertShaderW9, fragShaderW9);

        const vertShaderAll = createShader(gl, gl.VERTEX_SHADER, vertAll);
        const fragShaderAll = createShader(gl, gl.FRAGMENT_SHADER, fragAll);
        this.programAll = createProgram(gl, vertShaderAll, fragShaderAll);

        const fbo = this.fbo = this.initFramebufferObject(this.gl);
        if (!fbo) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }

        //初始化静态信息
        this.posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.texBuffer = createBuffer(gl, new Float32Array([1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]));

        this.gl.useProgram(this.programW9);
        this.gl.uniform1f(this.programW9.u_opacity, 0.8);
    }

    show() {
        this.visiable = true;
        // this._render();
    }

    setColor(color) {

    }

    load(url, vector) {
        return MeteoImage.load(url).then((meteo) => {
            this.meteo = meteo;
            // 形成数据纹理
            createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
            this.gl.useProgram(this.programW9);
            this.gl.uniform1i(this.programW9.u_data, TEXTURE_INDEX_DATA);
            this.gl.uniform3fv(this.programW9.u_lon, meteo.lon);
            this.gl.uniform3fv(this.programW9.u_lat, meteo.lat);
            this.gl.useProgram(this.programAll);
            this.gl.uniform2fv(this.programAll.u_min, [meteo.minAndMax[0][0], meteo.minAndMax[1][0]]);
            this.gl.uniform2fv(this.programAll.u_max, [meteo.minAndMax[0][1], meteo.minAndMax[1][1]]);
            this.loadWindBar();
        });
    }

    loadWindBar() {
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
                let barData = new Uint8Array(ctx.getImageData(0, 0, image0.width, image0.height).data);
                this.gl.useProgram(this.programAll);
                // todo:改成gl.LINEAR，风杆是彩色的了，很奇怪
                // fixme：这里传入的是barData，而不是image0，因为image0不是Uint8Array类型，走createTexture()方法时会进入else情况，生成的图片透明色都是错的，不知道为什么，所以采用Uint8Array数据让它进入createTexture()的if情况
                // const windBarTexture = this.windBarTexture = createTexture(this.gl, this.gl.NEAREST, image0, image0.width, image0.height, TEXTURE_INDEX_WINDBAR, this.gl.RGBA);
                const windBarTexture = this.windBarTexture = createTexture(this.gl, this.gl.NEAREST, barData, image0.width, image0.height, TEXTURE_INDEX_WINDBAR, this.gl.RGBA);
                this.gl.uniform1i(this.programAll.u_windBar, TEXTURE_INDEX_WINDBAR);
                this.gl.uniform2fv(this.programAll.u_windBar_radix, new Float32Array([image0.width, image0.height]));
                // this._render();
                resolve();
            };
            // Tell the browser to load an Image
            // image0.src = './windBar.png';
            image0.src = './wind_48.png';
        });
    }

    initFramebufferObject(gl) {
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

        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.gl.canvas.width, this.gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.fontNum[0], this.fontNum[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);   // fixme:这里跟以前的不一样，不是全屏的
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        /*gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);*/
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);     // fixme:这个缓冲区纹理存的是各个值，所以不应该是LINEAR,而是NEAREST，取的都是最近点
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);     // fixme:这个缓冲区纹理存的是各个值，所以不应该是LINEAR,而是NEAREST，取的都是最近点
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

    prerender(gl, matrix){
        // console.log("执行prerender()");
        if (!this.meteo) return;
        if (!this.visiable) return;

        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRAMEBUFFER); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fbo.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.viewport(0, 0, this.fontNum[0], this.fontNum[1]);
        this.gl.clearColor(255, 255, 255, 0);   // fixme:这里设的rgb都是255，因为uv是双通道，存成四通道了，无法判断值是否有效，而redis存的值最高是254，所以只要是255的就是无效值
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programW9);
        gl.uniformMatrix4fv(this.programW9.u_matrix_invert, false, mat4.invert(new Float32Array(16), matrix));
        // fixme:每次调用gl.drawArrays()方法画之前，每次都得重新绑定所有attribute，因为WebGL中所有attribute用的是同一块内存，分别存到索引0123...中，所以每次画不同的东西时，都得重新gl.bindBuffer()
        bindAttribute(this.gl, this.posBuffer, this.programW9.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);


        this.pixels = new Uint8Array(this.fontNum[0] * this.fontNum[1] * 4);
        this.gl.readPixels(0, 0, this.fontNum[0], this.fontNum[1], this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixels);
        // console.log(this.pixels);

    }

    render(gl, matrix) {
        /*gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.enableVertexAttribArray(this.program.a_pos);
        gl.vertexAttribPointer(this.program.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(this.program.uMatrix, false, matrix);
        gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);*/
        // console.log("执行render()")
        // fixme:mapbox自己用了部分纹理单元，所以最好把纹理单元从后往前用，避免和mapbox冲突了
        // fixme:viewport也不用设置了
        // fixme:套完以后也不会迟钝了，就是不会地图先动热力图再动，而是同步动作
        // fixme:设置每个参数时都要先useProgram()
        if (!this.meteo) return;
        if (!this.visiable) return;

        // fixme:(2)画风杆
        // todo：怎么绑定mapbox的帧缓冲区
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programAll);
        this.gl.uniform1i(this.programAll.u_frameImage, TEXTURE_FRAMEBUFFER);
        this.gl.uniform2fv(this.programAll.u_num, this.fontNum);
        bindAttribute(this.gl, this.posBuffer, this.programAll.a_pos, 2);
        bindAttribute(this.gl, this.texBuffer, this.programAll.a_texCoord, 2);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}