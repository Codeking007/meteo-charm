export class MeteoImage{
    public load(url:string){
        return new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin="anonymous";
            image.onload = ()=>resolve(this._loadImage(image));
            image.src = "http://weather.unmeteo.com/tiles/meteo/gfs/wuv/50/18073000.png?time=18073008";
            console.log(image.src);
        });
    }

    public _loadImage(image: HTMLImageElement):object{
        //this.valueTexture = createTexture(this.gl, this.gl.LINEAR, image);
        //读取图片
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const re:any = {};
        // 形成数据纹理
        re.width = image.width;
        re.height = image.height - 1;
        re.data = new Uint8Array(ctx.getImageData(0, 0, image.width, image.height - 1).data);   // 图片像素数据
        re.minAndMax = this.getMinAndMax(ctx.getImageData(0, image.height - 1, 8, 1).data);          // 图片左下角范围像素数据
        re.lon = this.getCoord(ctx.getImageData(8, image.height - 1, 4, 1).data);                    // 图片左下角经度范围像素数据
        re.lat = this.getCoord(ctx.getImageData(12, image.height - 1, 4, 1).data);                   // 图片左下角纬度范围像素数据
        // re.minAndMax = [new Float32Array([-21.32,26.8]),new Float32Array([-21.57,21.42])];
        // re.lon = new Float32Array([-180,180,0.5]);
        // re.lat = new Float32Array([90,-90,0.5]);
        return re;
    }

    public getCoord(uintArray:Uint8ClampedArray){
        // uintArray从左到右代表最小值、最大值、步长
        let d = new Float32Array(3);
        let u = new Uint8Array(d.buffer);
        for (let m = 0; m < d.length; m++)
            for(let n=0;n<4;n++)
                u[4*m+n] = uintArray[4*n+m];
        return d;
    }
    public getMinAndMax(uintArray:Uint8ClampedArray){
        // uintArray前四行从左到右代表r通道最小值、g通道最小值、b通道最小值、透明度
        // uintArray后四行从左到右代表r通道最大值、g通道最大值、b通道最大值、透明度
        let mm = new Array(3);  // 三行==>三个通道的最小值、最大值（第一列最小值、第二列最大值）
        for (let n = 0; n < mm.length; n++) {
            let d = mm[n] = new Float32Array(2);
            let u = new Uint8Array(d.buffer);
            for (let m = 0; m < u.length; m++)
                u[m] = uintArray[4 * m + n];
        }
        return mm;
    }

    getFloatArray(base64:any) {
        const a = this.base64ToArrayBuffer(base64);
        const re = new Float32Array(a);
        const dv = new DataView(a);
        for (let m = 0; m < re.length; m++)
            re[m] = dv.getFloat32(m * 4);
        return re;
    }

    base64ToArrayBuffer(base64:any) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

