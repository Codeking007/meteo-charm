precision highp float;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
const float PREC = 255.0/254.0;
uniform vec3 u_matrix_invert;
uniform vec3 u_translate_scale;
uniform vec4 u_current_bounds;
uniform vec2 u_view;
uniform vec4 u_projection_bounds;
uniform sampler2D u_particles;// 粒子纹理单元=3
uniform sampler2D u_data;//  图片纹理单元=1
uniform vec2 u_min;// 各通道像素最小值
uniform vec2 u_max;// 各通道像素最大值
uniform vec3 u_lon;// 经度最小值、最大值、步长
uniform vec3 u_lat;// 纬度最小值、最大值、步长
uniform float u_rand_seed;// todo:随机数0-1
uniform float u_speed_factor;// todo:粒子移动多快=0.5
uniform float u_drop_rate;// todo:粒子移到随机位置的频率=0.003
uniform float u_drop_rate_bump;// todo:相对于各个粒子速度的降落增加率=0.01
varying vec2 v_pos;
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
const float H=0.1;
float normalizeLat(float lat){
    return mod(lat+90.0, 180.0)-90.0;
}
float normalizeLon(float lon){
    return mod(lon+180.0, 360.0)-180.0;
}
float random(const vec2 co) { // 伪随机数
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}
float between(float min, float max, float val){
    return (val-min)/(max-min);
}
vec2 coord(vec2 pos){
    return vec2(between(u_lon[0], u_lon[1], mod(pos.x+180.0, 360.0)-180.0), between(u_lat[0], u_lat[1], mod(pos.y+90.0, 180.0)-90.0));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
vec2 sum(vec2 point, float val){
    // 这个方法不光可以使粒子沿某方向移动距离，还会限制最多移动point.x += 1.0/255.0;距离。(可能多帧才移动一个像素点)
    // fixme:但是这样的话当前点只会向离它最近一圈的8个点中的其中一个点移动（虽然移动距离只有1.0/255.0，这都不够两个像素点间的距离，可能需要画好多帧，好几个1.0/255.0，可能才会到下一个点），也就是说移动的方向都是45°的倍数，不会出现向30°方向移动的情况（微观角度来讲，本身像素点就是紧挨着的，一点一点画也只能从周围8点选一个去移动，逐渐扩展才会形成宏观的30°这样的现象，所以这样子没问题。但如果不是每一帧都画点而是画线的话，那这个就有问题了，因为一条线是可以跨越好几个像素点画出30°这种现象的，并不局限于周围8个点）
    // fixme:之所以这样是因为现在画的是点，而需要的显示效果是连成线的。为了让点连成线，所以每一帧的点都必须是紧挨着的，同一个点在连续两帧移动的距离太大的话，看起来线就断开了
    if (point.y + val > 1.0){
        point.x += 1.0/255.0;
        point.y += val - 256.0/255.0;
    } else if (point.y + val < 0.0){
        point.x -= 1.0/255.0;
        point.y += val + 256.0/255.0;
    } else {
        point.y += val;
    }
    return point;
}
vec4 random4(const vec2 seed){
    vec2 re = vec2(random(seed + 1.3), random(seed + 2.1));
    vec2 val1=floor(re * 65535.0 / 256.0);
    vec2 val2=re*65535.0-val1*256.0;
    return vec4(val1/255.0, val2/255.0);
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
    invert1=vec2(atan(x[0] * sc, z * cc), asinD3((z!=0.0) ? (x[1] * sc / z) : z));
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
    invert1=vec2(atan(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi), asinD3(k * cosDeltaPhi - x * sinDeltaPhi));

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
vec2 orthographicProjectionInvert(vec2 point){ // 像素点转换成经纬度
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
    // fixme:改了
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
    vec2 rotationPhiGamma=vec2(atan(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi), asinD3(k * cosDeltaGamma + y * sinDeltaGamma));
    return rotationPhiGamma;
}
vec2 projectRotateTransform2(vec2 projection1){
    // 2-1==>a(x, y)==>orthographicRaw(x, y)
    vec2 orthographicRaw=vec2(cos(projection1.y) * sin(projection1.x), sin(projection1.y));
    // 2-2==>b(x[0], x[1])==>scaleTranslate(k, dx, dy).transform(x, y)
    vec2 transform=vec2(u_translate_scale[0] + u_translate_scale[2] * orthographicRaw.x, u_translate_scale[1] - u_translate_scale[2] * orthographicRaw.y);
    return transform;
}
vec2 orthographicProjection(vec2 lon_lat){ // 经纬度转换为像素点
    vec2 projection1=projectRotateTransform1(radians(lon_lat));
    vec2 projection2=projectRotateTransform2(projection1);
    return projection2;
}
vec4 distortion(float lon, float lat, float x, float y) {
    float hLon = lon < 0.0 ? H : -H;
    float hLat = lat < 0.0 ? H : -H;
    vec2 pLon = orthographicProjection(vec2(lon + hLon, lat));// 经纬度转换为像素点
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
vec2 distort(float lon, float lat, float x, float y, vec2 wind) {
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
// fixme:viewport()的大小是粒子数量的大小256*256，所以可以直接texture2D获取每个点的粒子坐标
void main() {
    vec4 point = texture2D(u_particles, v_pos);// 没反转v_pos，因为u_particles纹理的方向跟v_pos一样
    vec2 pos = vec2((point.x*256.0+point.z), (point.y*256.0+point.w))/257.0;
    vec2 seed = (pos+v_pos) * u_rand_seed;// a random seed to use for the particle drop
    vec2 target=vec2(0.0, 0.0);
    vec4 re = random4(seed);
    vec2 current_pos=vec2(pos.x, 1.0-pos.y)*u_view;
    // fixme:是否在正方形内
    //    if(current_pos.x>=u_current_bounds[0]&&current_pos.x<=u_current_bounds[1]&&current_pos.y>=u_current_bounds[2]&&current_pos.y<=u_current_bounds[3]){
    // fixme:像素点距离球体中心点在球体半径范围内==>小于横向像素边界和纵向像素边界的最大值，因为放到很大后可能某个边界范围就跟球体半径不相等了
    if (length(vec2(current_pos.x-u_translate_scale[0], current_pos.y-u_translate_scale[1]))<=max((u_projection_bounds[3]-u_projection_bounds[2])/2.0, (u_projection_bounds[1]-u_projection_bounds[0])/2.0)){
        // fixme:像素点转换成经纬度(正方形就变成圆形了)
        vec2 lon_lat=orthographicProjectionInvert(current_pos);
        lon_lat.x=normalizeLon(lon_lat.x);
        lon_lat.y=normalizeLat(lon_lat.y);
        vec2 c = coord(lon_lat);
        if (valid(c)&&texture2D(u_data, c).a==1.0){
            vec2 uv = mix(u_min, u_max, texture2D(u_data, c).xy*PREC);//  通过图片的纹理坐标c获得各通道像素值,然后线性混合，得到风uv值
            float drop_rate = u_drop_rate + length(uv) / length(u_max) * u_drop_rate_bump;
            float drop = step(1.0 - drop_rate, random(seed));

            // 求当前像素点的速度在不同地图投影中扭转后的速度
            target=distort(lon_lat[0], lon_lat[1], current_pos.x, current_pos.y, uv)*u_speed_factor*4.0/(u_translate_scale[2]/300.0);
            // fixme:canvas坐标系左上角原点，纹理坐标系左下角原点；所以对于x坐标来讲没差别，主要是y坐标
            // fixme:两种坐标系的y坐标相加为1.0；但如果是移动的话，两种坐标系的上的点移动方向是一致的，即如果canvas向下移动（沿自己的y轴正方向）那么纹理坐标也是向下移动（沿自己的y轴负方向）的
            // fixme:所以为了得到粒子在移动后的纹理坐标系坐标，需要先把它从canvas坐标系转成纹理坐标系的点，然后再减去移动的距离==>pos就是当前粒子的纹理坐标
            point.xz = sum(point.xz, target.x);
            point.yw = sum(point.yw, -target.y);

            /* // 求当前像素点的速度在不同地图投影中扭转后的速度
             target=distort(lon_lat[0], lon_lat[1], current_pos.x, current_pos.y, uv);
             // fixme:canvas坐标系左上角原点，纹理坐标系左下角原点；所以对于x坐标来讲没差别，主要是y坐标
             // fixme:两种坐标系的y坐标相加为1.0；但如果是移动的话，两种坐标系的上的点移动方向是一致的，即如果canvas向下移动（沿自己的y轴正方向）那么纹理坐标也是向下移动（沿自己的y轴负方向）的
             // fixme:所以为了得到粒子在移动后的纹理坐标系坐标，需要先把它从canvas坐标系转成纹理坐标系的点，然后再减去移动的距离==>pos就是当前粒子的纹理坐标
             vec2 texturePoint_to=pos+vec2(target.x,-target.y)/length(u_max)*u_speed_factor;

             vec2 val1=floor(texturePoint_to * 65535.0 / 256.0);
             vec2 val2=texturePoint_to*65535.0-val1*256.0;
             point = vec4(val1/255.0, val2/255.0);*/

            if (valid(vec2((point.x*256.0+point.z), (point.y*256.0+point.w))/257.0)){
                re = mix(point, re, drop);
            }
        }
    }
    gl_FragColor = re;
}