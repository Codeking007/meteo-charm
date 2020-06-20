// fixme:孙哥写的相对高低点
class Iso {
    constructor(map) {
        this.map = map;
        this._init();
        this._initGL();
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
        map.on('resize', (e) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this._render();
        });

        map.on('move', () => {
            this._render();
        });

        map.on('load', () => {
            this._render();
        });
    }

    _initGL() {
        const gl = this.gl;
    }

    load(url, vector) {
        return MeteoImage.load(url).then((meteo) => {
            const w = meteo.width;
            const h = meteo.height;
            const data = meteo.data;
            const min = meteo.minAndMax[0][0];
            const max = meteo.minAndMax[0][1];
            // console.time("test");
            const high = [];
            const low = [];
            const middle = [];
            const step = 800;
            const minl = 0;
            const maxl = Math.floor(max/step)-Math.floor(min/step);
            // console.time("standard");
            let _data = standard(data,h,w,min,max,step);    // fixme:数值最低的等级是0，其余数值的都是相对最低等级0的等级
            // console.timeEnd("standard");

            // console.time("polygon");
            const info = [];
            const _data1 = polygon(_data,h,w-1,info);
            // console.timeEnd("polygon");
            // fixme:la/ha={信息索引:[val,lon,lat]}
            const la = new Map();//[lon,lat,val]
            const ha = new Map();
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w - 1; x++) {
                    const pval = _data1[y*(w-1)+x];
                    const ival = info[pval];
                    const val = data[(y*w+x)*4];
                    if(ival[1]&&(!ival[2])){
                        if((!la.has(pval))||val<la.get(pval)[0])
                            la.set(pval,[val,x*0.25-180,y*0.25-90]);    // fixme:这里直接用的图片，所以不用什么算法来换算成经纬度，图片就是按等经纬度间隔来存的
                    }
                    if(ival[2]&&(!ival[1])){
                        if((!ha.has(pval))||val>ha.get(pval)[0])
                            ha.set(pval,[val,x*0.25-180,y*0.25-90]);
                    }
                }
            }
            // console.timeEnd("test");
            // console.log(high.length,low.length,middle.length);

            const ps = [];
            for (let v of la.values())
                ps.push(turf.point([v[1], v[2]], {v:-1,val:Math.round(min+(max-min)*v[0]/254)}));
            for (let v of ha.values())
                ps.push(turf.point([v[1], v[2]], {v:1,val:Math.round(min+(max-min)*v[0]/254)}));
            this.map.getSource("point").setData(turf.featureCollection(ps));

            function polygon(data, h, w,info) {
                // const info = [];//[start,isLow,isHigh]
                let index = 0;
                let infoIndex = 0;
                const re = new Uint16Array(h*w);
                const k0 = new Uint8Array(6);
                const k1 = new Uint16Array(3);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        refreshK0(k0,data,h,w,y,x);
                        refreshK1(k1,re,h,w,y,x);
                        //判断连接，刷新，如果刷新需要重新刷新k1
                        const lk = link(k0,k1,re,info,index);
                        if(lk!==-1){
                            refreshK1(k1,re,h,w,y,x);
                            infoIndex = lk;
                        }
                        // const low = (k0[0]!==255&&k0[3]<k0[0])||(k0[0]!==255&&k0[3]<k0[1])||(k0[0]!==255&&k0[3]<k0[2]);
                        // const high =(k0[0]!==255&&k0[3]>k0[0])||(k0[0]!==255&&k0[3]>k0[1])||(k0[0]!==255&&k0[3]>k0[2]);
                        const low = k0.findIndex(val=>val!==255&&val>k0[3])!==-1;
                        const high = k0.findIndex(val=>val!==255&&val<k0[3])!==-1;
                        const ki = k0.findIndex(val=>val===k0[3]);
                        if(ki===3||k1[2]===0xffff||index===0){
                            re[index]=infoIndex;
                            if(infoIndex<info.length)
                                info[infoIndex]=[index,low,high];
                            else
                                info.push([index,low,high]);
                            infoIndex = info.length;
                        }else{
                            const val = k1[ki];
                            re[index]=val;
                            info[val][1] = info[val][1]||low;
                            info[val][2] = info[val][2]||high;
                        }
                        index++;
                    }
                    //判断收尾是否相连
                    const re0 = re[y*w];
                    const re1 = re[(y+1)*w-1];
                    if(data[y*w]===data[(y+1)*w-1]&&re0!==re1){
                        //替换起始位置靠后的
                        const from = info[re0][0]<info[re1][0]?re1:re0;
                        const to = info[re0][0]<info[re1][0]?re0:re1;
                        infoIndex = linkInfo(re,info,from,to,index);
                    }
                }
                return re;

                function link(k0,k1,data,info,index) {
                    if(k0[1]===255||k1[2]===0xffff||k0[1]!==k0[2]||k1[1]===k1[2])
                        return -1;
                    //替换起始位置靠后的
                    const from = info[k1[1]][0]<info[k1[2]][0]?k1[2]:k1[1];
                    const to = info[k1[1]][0]<info[k1[2]][0]?k1[1]:k1[2];
                    return linkInfo(data,info,from,to,index);
                }

                function linkInfo(data,info,from,to,index) {
                    for (let i = info[from][0]; i < index; i++) {
                        if(data[i]===from)data[i]=to;
                    }
                    info[to][1] = info[to][1]||info[from][1];
                    info[to][2] = info[to][2]||info[from][2];
                    info[from] = null;
                    return from;
                }

                function refreshK0(kernel,data,h,w,y,x){
                    // 0 1
                    // 2 3 4
                    //   5
                    //4,5后加，修正low和high
                    const py = y-1;
                    const px = x>0?x-1:w-1;
                    kernel[0]=y-1<0?255:data[py*w+px];
                    kernel[1]=y-1<0?255:data[py*w+x];
                    kernel[2]=data[y*w+px];
                    kernel[3]=data[y*w+x];
                    kernel[4]=data[y*w+((x+1)===w?0:(x+1))];
                    kernel[5]=data[((y+1)===h?y:(y+1))*w+x];
                }

                function refreshK1(kernel,data,h,w,y,x){
                    const py = y-1;
                    const px = x>0?x-1:w-1;
                    kernel[0]=y-1<0?0xffff:data[py*w+px];
                    kernel[1]=y-1<0?0xffff:data[py*w+x];
                    kernel[2]=x===0?0xffff:data[y*w+px];
                }
            }


            //数据标准化，避免反复操作不一致
            function standard(data,h,w,min,max,step) {
                const re = new Uint8ClampedArray(h*(w-1));//去掉相等的180
                const low = Math.floor(min/step);
                const ratio = (max-min)/254;
                let i = 0;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w-1; x++) {
                        re[i] = (min+data[(y*w+x)*4]*ratio)/step-low;
                        i++;
                    }
                }
                return re;
            }

            function kernelEdgeDetect(data,h,w) {
                const re = new Uint8ClampedArray(w*h);//进行卷积，忽略最上最下2列(3*3的话应该忽略1列)
                const kernel = new Uint8ClampedArray(3*3);//3*3
                for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) {
                        refreshKernel3(kernel,data,h,w,i,j,255);
                        //求均值
                        let c = 0;
                        let total = 0;
                        kernel.map(v=>{
                            if(v!==255){
                                c++;
                                total+=v;
                            }
                        });
                        total -= kernel[4];
                        c--;
                        re[i*w+j]=Math.round(kernel[4]*(-c)+total);
                    }
                }
                return re;
            }

            function kernelSharpen(data,h,w) {
                const re = new Uint8ClampedArray(w*h);//进行卷积，忽略最上最下2列(3*3的话应该忽略1列)
                const kernel = new Uint8ClampedArray(3*3);//3*3
                for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) {
                        refreshKernel3(kernel,data,h,w,i,j,255);
                        //求均值
                        let c = 0;
                        let total = 0;
                        kernel.map(v=>{
                            if(v!==255){
                                c++;
                                total+=v;
                            }
                        });
                        total -= kernel[4];
                        c--;
                        re[i*w+j]=Math.round(kernel[4]*(c+1)-total);
                    }
                }
                return re;
            }

            function kernelHorL(data,h,w) {
                const re = new Int8Array(w*h);
                const kernel = new Uint8Array(25);//5*5
                for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) {
                        refreshKernel5(kernel,_data,h,w,i,j,255);
                        re[i*w+j]=compute2(kernel,255);
                    }
                }
                return re;
            }

            function compute2(kernel,invalid) {
                let min = 254;
                let max = 0;
                // const a = [6,7,8,11,12,13,16,17,18];
                const a = [7,11,13,17];
                for (let i = 0; i < a.length; i++) {
                    if(kernel[a[i]]===invalid)continue;
                    if(kernel[a[i]]<min)min = kernel[a[i]];
                    if(kernel[a[i]]>max)max = kernel[a[i]];
                }
                if(max===min)
                    return 0;
                const d = kernel[12];
                if(d===min) return -1;
                if(d===max) return 1;
                return -128;
            }

            //平均卷积3*3
            function kernelAvgI(data,h,w) {
                const re = new Int8Array(w*h);//进行卷积，忽略最上最下2列(3*3的话应该忽略1列)
                const kernel = new Int8Array(3*3);//3*3
                for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) {
                        refreshKernel3(kernel,data,h,w,i,j,-128);
                        //求均值
                        let c = 0;
                        let total = 0;
                        kernel.map(v=>{
                            if(v!==-128){
                                c++;
                                total+=v;
                            }
                        });
                        if(c===0)
                            re[i*w+j]=-128;
                        else
                            re[i*w+j]=Math.round( total/c);
                        // re[i*w+j]=Math.round((kernel[4]*(c+1)-total)/c);
                    }
                }
                return re;
            }

            function kernelAvg(data,h,w) {
                const re = new Uint8ClampedArray(w*h);//进行卷积，忽略最上最下2列(3*3的话应该忽略1列)
                const kernel = new Uint8ClampedArray(3*3);//3*3
                for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) {
                        refreshKernel3(kernel,data,h,w,i,j,255);
                        //求均值
                        let c = 0;
                        let total = 0;
                        kernel.map(v=>{
                            if(v!==255){
                                c++;
                                total+=v;
                            }
                        });
                        re[i*w+j]=Math.round(total/c);
                    }
                }
                return re;
            }

            function compute(kernel,invalid) {
                let min = 254;
                let max = 0;
                for (let i = 0; i < kernel.length; i++) {
                    if(kernel[i]===invalid)continue;
                    if(kernel[i]<min)min = kernel[i];
                    if(kernel[i]>max)max = kernel[i];
                }
                if(max===min)
                    return 0;
                const d = kernel[12];
                if(d===min) return -1;
                if(d===max) return 1;
                return -128;
            }

            function refreshKernel3(kernel, data,h,w, i, j,invalid) {
                for (let row = -1; row < 2; row++) {
                    for (let col = -1; col < 2; col++) {
                        const k = (row+1)*3+col+1;
                        kernel[k]=getData(data,h,w,i+row,j+col,invalid);
                    }
                }
            }

            function refreshKernel5(kernel, data,h,w, i, j,invalid) {
                for (let row = -2; row < 3; row++) {
                    for (let col = -2; col < 3; col++) {
                        const k = (row+2)*5+col+2;
                        kernel[k]=getData(data,h,w,i+row,j+col,invalid);
                    }
                }
            }

            function getData(data,h,w,i,j,invalid) {
                if(i<0)return invalid;
                if(i>=h)return invalid;
                if(j<0)j+=w-1;
                else if(j>=w)j-=w-1;
                return data[(i*w+j)];
            }
        });
    }

    _frame(){

    }

    _render() {
        const _this = this;
        this._stopTime = new Date().getTime()+200;
        if(_this._animateHandle)
            return;
        frame();
        function frame(){
            _this._frame();
            if(new Date().getTime()<_this._stopTime)
                _this._animateHandle = requestAnimationFrame(frame);
            else
                delete _this._animateHandle;
        }
    }

}