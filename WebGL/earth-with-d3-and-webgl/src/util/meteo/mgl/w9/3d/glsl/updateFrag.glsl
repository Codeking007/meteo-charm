precision highp float;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
const float PREC = 255.0/254.0;
uniform vec3 u_matrix_invert;      // 顺带把顶点坐标反转成和图片对应的了
uniform vec3 u_translate_scale;
uniform vec4 u_current_bounds;
uniform vec4 u_projection_bounds;
uniform vec2 u_view;
uniform sampler2D u_particles;    // 粒子纹理单元=3
uniform sampler2D u_frameImage;        //  图片纹理单元=1
uniform vec2 u_min;              // 各通道像素最小值
uniform vec2 u_max;              // 各通道像素最大值
uniform vec3 u_lon;              // 经度最小值、最大值、步长
uniform vec3 u_lat;              // 纬度最小值、最大值、步长
uniform float u_rand_seed;       // todo:随机数0-1
uniform float u_speed_factor;    // todo:粒子移动多快=0.5
uniform float u_drop_rate;       // todo:粒子移到随机位置的频率=0.003
uniform float u_drop_rate_bump;  // todo:相对于各个粒子速度的降落增加率=0.01
varying vec2 v_pos;
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
//const float H=0.0000360;
const float H=0.1;  // fixme:偏移量太小了就算不出来了，所以用0.1
float normalizeLat(float lat){
    return mod(lat+90.0, 180.0)-90.0;
}
float normalizeLon(float lon){
    return mod(lon+180.0, 360.0)-180.0;
}
float random(const vec2 co) {       // 伪随机数
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
vec2 sum(vec2 point,float val){
    if(point.y + val > 1.0){
        point.x += 1.0/255.0;
        point.y += val - 256.0/255.0;
    }else if(point.y + val < 0.0){
        point.x -= 1.0/255.0;
        point.y += val + 256.0/255.0;
    }else{
        point.y += val;
    }
    return point;
}
vec4 random4(const vec2 seed){
    vec2 re = vec2(random(seed + 1.3),random(seed + 2.1));
    vec2 val1=floor(re * 65535.0 / 256.0);
    vec2 val2=re*65535.0-val1*256.0;
    return vec4(val1/255.0,val2/255.0);
}
float asinD3(float x) {
    return (x > 1.0) ? halfPi : ((x < -1.0) ? (-halfPi) : asin(x));
}
vec2 projectRotateTransformInvert1(vec2 point){
    // 1-1==>x = b.invert(x, y)
    vec2 x=vec2((point.x - u_translate_scale[0]) / u_translate_scale[2], (u_translate_scale[1] - point.y) / u_translate_scale[2]);
    // 1-2==>x && a.invert(x[0], x[1])
    vec2 invert1;
    /*if(x!=null){*/
    float z = length(x);
    float c = asinD3(z);
    float sc = sin(c);
    float cc = cos(c);
    invert1=vec2(atan(x[0] * sc, z * cc),asinD3((z!=0.0) ? (x[1] * sc / z) : z));
    /*}else{
        invert1=x;
    }*/
    return invert1;
}
vec2 projectRotateTransformInvert2(vec2 invert1){
    vec2 invert2;
    // 2-1==>x = b.invert(x, y)
    float deltaPhi=radians(u_matrix_invert[1]);
    float deltaGamma=radians(u_matrix_invert[2]);

    float cosDeltaPhi = cos(deltaPhi);
    float sinDeltaPhi = sin(deltaPhi);
    float cosDeltaGamma = cos(deltaGamma);
    float sinDeltaGamma = sin(deltaGamma);

    float cosPhi = cos(invert1[1]);
    float x = cos(invert1[0]) * cosPhi;
    float y = sin(invert1[0]) * cosPhi;
    float z = sin(invert1[1]);
    float k = z * cosDeltaGamma - y * sinDeltaGamma;
    invert1=vec2(atan(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),asinD3(k * cosDeltaPhi - x * sinDeltaPhi));

    // 2-2==>x && a.invert(x[0], x[1])
    /*if(invert1!=null){*/
    float deltaLambda=radians(u_matrix_invert[0])*(-1.0);
    invert1[0] += deltaLambda;
    invert2=vec2((invert1[0] > PI) ? (invert1[0] - PI*2.0) : ((invert1[0]<-PI)?(invert1[0]+PI*2.0):(invert1[0])), invert1[1]);
    /*}else{
        invert2=invert1;
    }*/
    return invert2;
}
vec2 orthographicProjectionInvert(vec2 point){  // 像素点转换成经纬度
    // (1)==>point = projectRotateTransform.invert(point[0], point[1]);
    // 1==>x = b.invert(x, y)
    vec2 invert1=projectRotateTransformInvert1(point);
    // 2==>x && a.invert(x[0], x[1])
    vec2 invert2=projectRotateTransformInvert2(invert1);
    // (2)==>point && [point[0] * degrees, point[1] * degrees]
    vec2 lon_lat;
    /*if(invert2!=null){*/
    lon_lat=degrees(invert2);
    /*}else{
        lon_lat=invert2;
    }*/
    return lon_lat;
}
vec2 projectRotateTransform1(vec2 lon_lat){
    // 1-1==>a(x, y)==>forwardRotationLambda(deltaLambda)
    float deltaLambda=radians(u_matrix_invert[0]);
    lon_lat[0] += deltaLambda;
    vec2 forwardRotationLambda=vec2((lon_lat[0] > PI) ? (lon_lat[0] - PI*2.0):  ((lon_lat[0]<-PI) ? (lon_lat[0]+PI*2.0) : (lon_lat[0])), lon_lat[1]);

    // 1-2==>b(x[0], x[1])==>rotationPhiGamma(deltaPhi, deltaGamma).rotation(lambda, phi)
    float deltaPhi=radians(u_matrix_invert[1]);
    float deltaGamma=radians(u_matrix_invert[2]);

    float cosDeltaPhi = cos(deltaPhi);
    float sinDeltaPhi = sin(deltaPhi);
    float cosDeltaGamma = cos(deltaGamma);
    float sinDeltaGamma = sin(deltaGamma);

    float cosPhi = cos(forwardRotationLambda[1]);
    float x = cos(forwardRotationLambda[0]) * cosPhi;
    float y = sin(forwardRotationLambda[0]) * cosPhi;
    float z = sin(forwardRotationLambda[1]);
    float k = z * cosDeltaPhi + x * sinDeltaPhi;
    vec2 rotationPhiGamma=vec2(atan(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),asinD3(k * cosDeltaGamma + y * sinDeltaGamma));
    return rotationPhiGamma;
}
vec2 projectRotateTransform2(vec2 projection1){
    // 2-1==>a(x, y)==>orthographicRaw(x, y)
    vec2 orthographicRaw=vec2(cos(projection1.y) * sin(projection1.x), sin(projection1.y));
    // 2-2==>b(x[0], x[1])==>scaleTranslate(k, dx, dy).transform(x, y)
    vec2 transform=vec2(u_translate_scale[0] + u_translate_scale[2] * orthographicRaw.x, u_translate_scale[1] - u_translate_scale[2] * orthographicRaw.y);
    return transform;
}
vec2 orthographicProjection(vec2 lon_lat){       // 经纬度转换为像素点
    vec2 projection1=projectRotateTransform1(radians(lon_lat));
    vec2 projection2=projectRotateTransform2(projection1);
    return projection2;
}
vec4 distortion(float lon,float lat,float x,float y) {
    float hLon = lon < 0.0 ? H : -H;
    float hLat = lat < 0.0 ? H : -H;
    vec2 pLon = orthographicProjection(vec2(lon + hLon, lat));   // 经纬度转换为像素点
    vec2 pLat = orthographicProjection(vec2(lon, lat + hLat));
    // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1° lon
    // changes depending on lat. Without this, there is a pinching effect at the poles.
    // 子午线比例因子:没有这个在南北极会出现挤压效应
    float k = cos(radians(lat));
    return vec4(
    (pLon[0] - x) / hLon / k,
    (pLon[1] - y) / hLon / k,
    (pLat[0] - x) / hLat,
    (pLat[1] - y) / hLat
    );
}
vec2 distort(float lon,float lat,float x,float y,vec2 wind) {
    // fixme:把速度系数u_speed_factor放到外面去了
    float u = wind[0];
    float v = wind[1];
    vec4 d = distortion(lon, lat, x, y);

    // Scale distortion vectors by u and v, then add.
    vec2 scaleWind;
    scaleWind[0] = d[0] * u + d[2] * v;
    scaleWind[1] = d[1] * u + d[3] * v;
    // fixme:因为zoom越大投影算出来的速度越大，即单位时间内移动的距离越大，所以移动距离的最大限定要跟zoom层的大小有关，这里是zoom/100，这样就可以解决由于高版本d3的projection.invert()对任何像素点都能算出经纬度所导致计算边界点distort扭转距离过大导致错误的情况
    //    if (abs(scaleWind[0]) <= u_translate_scale[2] / 100.0 && abs(scaleWind[1]) <= u_translate_scale[2] / 100.0) {
    if ((abs(d[0])<100.0&&abs(d[1])<100.0&&abs(d[2])<100.0&&abs(d[3])<100.0)){
        wind[0] = scaleWind[0];
        wind[1] = scaleWind[1];
    } else { // todo:如果算出的扭转量有问题（球体边缘部分和南北纬都有问题），就让粒子原地不动
        wind[0] = 0.0;
        wind[1] = 0.0;
    }
    return wind;
}
void main() {
    vec4 point = texture2D(u_particles, v_pos);     // 没反转v_pos，因为u_particles纹理的方向跟v_pos一样
    vec2 pos = vec2((point.x*256.0+point.z),(point.y*256.0+point.w))/257.0;
    vec2 seed = (pos+v_pos) * u_rand_seed;      // a random seed to use for the particle drop
    vec2 target=vec2(0.0,0.0);
    vec4 re = random4(seed);
    vec2 current_pos=vec2(pos.x,1.0-pos.y)*u_view;
    // fixme:是否在正方形内
//    if(current_pos.x>=u_current_bounds[0]&&current_pos.x<=u_current_bounds[1]&&current_pos.y>=u_current_bounds[2]&&current_pos.y<=u_current_bounds[3]){
    // fixme:像素点距离球体中心点在球体半径范围内==>小于横向像素边界和纵向像素边界的最大值，因为放到很大后可能某个边界范围就跟球体半径不相等了
    if(length(vec2(current_pos.x-u_translate_scale[0],current_pos.y-u_translate_scale[1]))<=max((u_projection_bounds[3]-u_projection_bounds[2])/2.0,(u_projection_bounds[1]-u_projection_bounds[0])/2.0)){
        // fixme:像素点转换成经纬度(正方形就变成圆形了)
        vec2 lon_lat=orthographicProjectionInvert(current_pos);
        lon_lat.x=normalizeLon(lon_lat.x);
        lon_lat.y=normalizeLat(lon_lat.y);
        vec4 rateUV=texture2D(u_frameImage, pos);
        if(rateUV.r!=1.0&&rateUV.g!=1.0&&rateUV.b!=1.0){         // fixme:有效的值ba通道都设的1.0，如果不是1.0就不画了，因为如果画的话，取出来的值都是0.0，而后面有个mix方法，会取u_min的值，这样就错了，那些中心点没值也画出来东西了
            float val1 = (rateUV.x*256.0+rateUV.z)/257.0;
            float val2 = (rateUV.y*256.0+rateUV.w)/257.0;
            vec2 uv = mix(u_min,u_max,vec2(val1,val2));    //  通过图片的纹理坐标c获得各通道像素值,然后线性混合，得到风uv值
            // drop rate is a chance a particle will restart at random position, to avoid degeneration
            float drop_rate = u_drop_rate + length(uv) / length(u_max) * u_drop_rate_bump;
            float drop = step(1.0 - drop_rate, random(seed));

            /*target=distort(lon_lat[0],lon_lat[1],current_pos.x,current_pos.y,uv)*u_speed_factor*(u_current_bounds[3]-u_current_bounds[2]+1.0);
            target=(target.xy+1.0)/(2.0);
            point.xz = sum(point.xz,target.x/255.0);
            point.yw = sum(point.yw,target.y/255.0);*/

            // 求当前像素点的速度在不同地图投影中扭转后的速度
            target=distort(lon_lat[0], lon_lat[1], current_pos.x, current_pos.y, uv);
            // fixme:canvas坐标系左上角原点，纹理坐标系左下角原点；所以对于x坐标来讲没差别，主要是y坐标
            // fixme:两种坐标系的y坐标相加为1.0；但如果是移动的话，两种坐标系的上的点移动方向是一致的，即如果canvas向下移动（沿自己的y轴正方向）那么纹理坐标也是向下移动（沿自己的y轴负方向）的
            // fixme:所以为了得到粒子在移动后的纹理坐标系坐标，需要先把它从canvas坐标系转成纹理坐标系的点，然后再减去移动的距离==>pos就是当前粒子的纹理坐标
            vec2 texturePoint_to=pos+vec2(target.x,-target.y)/length(u_max)*u_speed_factor;

            vec2 texturePoint_to_val1=floor(texturePoint_to * 65535.0 / 256.0);
            vec2 texturePoint_to_val2=texturePoint_to*65535.0-texturePoint_to_val1*256.0;
            point = vec4(texturePoint_to_val1/255.0, texturePoint_to_val2/255.0);

            if(valid(vec2((point.x*256.0+point.z),(point.y*256.0+point.w))/257.0)){
                re = mix(point,re,drop);
            }
        }
    }
    gl_FragColor = re;
}