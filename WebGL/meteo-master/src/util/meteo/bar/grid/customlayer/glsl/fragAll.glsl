precision highp float;
const float PI = 3.141592653589793;
uniform sampler2D u_frameImage;// 纹理单元：帧缓冲区铺的热力图
uniform sampler2D u_windBar;// 纹理单元：风杆
uniform vec2 u_min;// 各通道像素最小值
uniform vec2 u_max;// 各通道像素最大值
uniform vec2 u_num;// 要画的图片的横向纵向的图标个数==帧缓冲区中的图标个数
varying vec2 v_texCoord;
// fixme:参数u向右，v向下，返回角度0°朝上，逆时针旋转==>风从哪个方向吹过来
float transferredFromSpeedToDirectionOfWind(float u, float v, float speed) { // 单位m/s
    float degree = asin(u / speed) * 180.0 / PI;
    if (u < 0.0 && v < 0.0) {
        degree = 180.0 - degree;
    } else if (u > 0.0 && v < 0.0) {
        degree = 180.0 - degree;
    } else if (u < 0.0 && v > 0.0) {
        degree = 360.0 + degree;
    } else if (u == 0.0 && v < 0.0) {
        degree = 180.0;
    } else if (u == 0.0 && v > 0.0) {
        degree = 0.0;
    }
    degree += 180.0;
    if (degree >= 360.0) {
        degree -= 360.0;
    }
    return degree;// 向上为0，逆时针旋转
}
float transferredFromSpeedToBf(float speed){ // 速度(m/s)转成风级
    if (speed<0.2){
        return 0.0;
    } else if (speed<=1.5){
        return 1.0;
    } else if (speed<=3.3) {
        return 2.0;
    } else if (speed<=5.4) {
        return 3.0;
    } else if (speed<=7.9) {
        return 4.0;
    } else if (speed<=10.7) {
        return 5.0;
    } else if (speed<=13.8) {
        return 6.0;
    } else if (speed<=17.1){
        return 7.0;
    } else if (speed<=20.7){
        return 8.0;
    } else if (speed<=24.4) {
        return 9.0;
    } else if (speed<=28.4) {
        return 10.0;
    } else if (speed<=32.6) {
        return 11.0;
    } else if (speed<=36.9) {
        return 12.0;
    } else if (speed<=41.4) {
        return 13.0;
    } else if (speed<=46.1) {
        return 14.0;
    } else if (speed<=50.9) {
        return 15.0;
    } else if (speed<=56.0) {
        return 16.0;
    } else if (speed<=61.2) {
        return 17.0;
    } else {
        return 18.0;
    }
}
// fixme:让风杆纹理坐标相对风杆图片对应的风杆图标中心点旋转，即让风杆图标相对自己的中心点反方向旋转；又因为风杆纹理(0,0)是从左下角开始的，纹理在y坐标是相反的，所以要关于x轴对称在加到风杆纹理中心点上
vec2 modelMatrix(vec2 windBar_texturePoint, vec2 windBar_centralTexturePoint, float direction){
    /*   float rotateAngle=(direction)/180.0*PI;// 风方向是向上为0，逆时针旋转的；根据右手定则，旋转矩阵为逆时针的，即顶点旋转direction，图标旋转(-direction)
       vec2 pointRelativeOriginal=windBar_texturePoint-windBar_centralTexturePoint;// 相对原点,以风杆图标中心点为原点
       vec2 pointAfterRotate=vec2(pointRelativeOriginal.x*cos(rotateAngle)-pointRelativeOriginal.y*sin(rotateAngle), pointRelativeOriginal.x*sin(rotateAngle)+pointRelativeOriginal.y*cos(rotateAngle));
       return windBar_centralTexturePoint+vec2(pointAfterRotate.x, -pointAfterRotate.y);// fixme:因为风杆纹理坐标从左下角开始(画出来的图片是反过来的)，所以要关于x轴对称，y就取相反值
   */


    float rotateAngle=-((360.0-direction)+180.0)/180.0*PI;// 风方向是向上为0，逆时针旋转的；根据右手定则，旋转矩阵为逆时针的，即顶点旋转direction，图标旋转(-direction)
//    float rotateAngle=30.0/180.0*PI;// 风方向是向上为0，逆时针旋转的；根据右手定则，旋转矩阵为逆时针的，即顶点旋转direction，图标旋转(-direction)
    vec2 pointRelativeOriginal=windBar_texturePoint-windBar_centralTexturePoint;// 相对原点,以风杆图标中心点为原点
    vec2 pointAfterRotate=vec2(pointRelativeOriginal.x*cos(rotateAngle)-pointRelativeOriginal.y*sin(rotateAngle), pointRelativeOriginal.x*sin(rotateAngle)+pointRelativeOriginal.y*cos(rotateAngle));
    return windBar_centralTexturePoint+vec2(pointAfterRotate.x, pointAfterRotate.y);// fixme:因为风杆纹理坐标从左下角开始(画出来的图片是反过来的)，所以要关于x轴对称，y就取相反值


}
void main(){
    // 算出每个16*16的中心位置的速度、方向、风级
    /*vec2 u_radix=vec2(1920.0,968.0);      // 要画的图片的宽度高度
    vec2 u_perRadix=vec2(32.0,32.0);    // 要画的图片的每部分的宽度高度
    vec2 u_num=vec2(60.0,30.0);           // fixme:要画的图片的横向纵向的图标个数==帧缓冲区中的图标个数*/
    vec2 perRadix=1.0/u_num;// 在纹理坐标中每个风杆的坐标大小
    vec2 startTexturePoint=floor(v_texCoord/perRadix)*perRadix;// 每个16*16区域内的起始纹理坐标点
    vec4 rateUV=texture2D(u_frameImage, startTexturePoint+perRadix/2.0);
    //    vec4 rateUV=texture2D(u_frameImage, startTexturePoint+vec2(perRadix.x,perRadix.y));
    // fixme:这里设的gl.clearColor(255, 255, 255, 0),rgb都是255，因为uv是双通道，存成四通道了，无法判断值是否有效，而redis存的值最高是254，所以只要是255的就是无效值
    //    if(rateUV.r!=1.0&&rateUV.g!=1.0&&rateUV.b!=1.0){         // fixme:有效的值ba通道都设的1.0，如果不是1.0就不画了，因为如果画的话，取出来的值都是0.0，而后面有个mix方法，会取u_min的值，这样就错了，那些中心点没值也画出来东西了
    float val1 = (rateUV.x*256.0*255.0+rateUV.z*255.0)/65535.0;
    float val2 = (rateUV.y*256.0*255.0+rateUV.w*255.0)/65535.0;
    vec2 eachValue=mix(u_min, u_max, vec2(val1, val2));// m/s      //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
    float speed=length(eachValue);// 速度m/s    // 不需要考虑正负，因为肯定是矢量
    float direction=transferredFromSpeedToDirectionOfWind(eachValue.x, eachValue.y, speed);// 方向，逆时针方向的
    float bf=transferredFromSpeedToBf(speed);// m/s  // 风级

    // 通过风级计算在风杆图标在风杆图片中的起始位置
              vec2 u_windBar_radix=vec2(160.0,160.0);       // 风杆图片宽度高度
              vec2 u_windBar_perRadix=vec2(32.0,32.0);    // 风杆图标宽度高度
//    vec2 u_windBar_radix=vec2(240.0, 240.0);// 风杆图片宽度高度
//    vec2 u_windBar_perRadix=vec2(48.0, 48.0);// 风杆图标宽度高度
    vec2 u_windBar_num=vec2(5.0, 5.0);// 风杆图片横向纵向的图标个数
    vec2 windBarPerRadix=1.0/u_windBar_num;// 在风杆图片的纹理坐标中每个风杆的坐标大小
    vec2 windBar_startTexturePoint=vec2(fract(bf/u_windBar_num.x), floor(bf/u_windBar_num.x)/u_windBar_num.y);// 风级对应风杆图标起始的纹理坐标
    vec2 windBar_centralTexturePoint=windBar_startTexturePoint+windBarPerRadix/2.0;// 风杆图标的中心纹理坐标
    vec2 windBar_endTexturePoint=windBar_startTexturePoint+windBarPerRadix;// 风级对应风杆图标结束的纹理坐标
    vec2 windBar_texturePoint=(v_texCoord-startTexturePoint)/perRadix*windBarPerRadix+windBar_startTexturePoint;// 当前纹理坐标对应风杆图片的纹理坐标，这步比较不好想
    vec2 windBar_modelMatrix=modelMatrix(windBar_texturePoint, windBar_centralTexturePoint, direction);// 关于当前风杆图标中心点旋转后的风杆图片纹理坐标点
    if (windBar_modelMatrix.x>=windBar_startTexturePoint.x&&windBar_modelMatrix.x<=windBar_endTexturePoint.x&&windBar_modelMatrix.y>=windBar_startTexturePoint.y&&windBar_modelMatrix.y<=windBar_endTexturePoint.y){ // 将风杆图标旋转后，有的地方超出当前风杆图标未旋转时的正方形范围了，那些超出范围的点就落到四周风杆图标上了，所以不画
        gl_FragColor=texture2D(u_windBar, windBar_modelMatrix);
        gl_FragColor=vec4(0.0, 1.0, 0.0, texture2D(u_windBar, windBar_modelMatrix));
    }
    //    }
}