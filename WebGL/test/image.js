class MeteoImage{
    static load(url){
        return new Promise((resolve) => {
            const image = new Image();
            image.onload = ()=>resolve(_loadImage(image));
            image.src = url;
            console.log(image.src)
        });
    }
}
function _loadImage(image){
    //this.valueTexture = createTexture(this.gl, this.gl.LINEAR, image);
    //读取图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    const re = {};
    // 形成数据纹理
    re.width = image.width;
    re.height = image.height - 1;
    re.data = new Uint8Array(ctx.getImageData(0, 0, image.width, image.height - 1).data);   // 图片像素数据
    re.minAndMax = getMinAndMax(ctx.getImageData(0, image.height - 1, 8, 1).data);          // 图片左下角范围像素数据
    re.lon = getCoord(ctx.getImageData(8, image.height - 1, 4, 1).data);                    // 图片左下角经度范围像素数据
    re.lat = getCoord(ctx.getImageData(12, image.height - 1, 4, 1).data);                   // 图片左下角纬度范围像素数据
    // re.minAndMax = [new Float32Array([-21.32,26.8]),new Float32Array([-21.57,21.42])];
    // re.lon = new Float32Array([-180,180,0.5]);
    // re.lat = new Float32Array([90,-90,0.5]);
    return re;

    function getCoord(uintArray){
        // uintArray从左到右代表最小值、最大值、步长
        let d = new Float32Array(3);
        let u = new Uint8Array(d.buffer);
        for (let m = 0; m < d.length; m++)
            for(let n=0;n<4;n++)
                u[4*m+n] = uintArray[4*n+m];
        return d;
    }
    function getMinAndMax(uintArray){
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
}
