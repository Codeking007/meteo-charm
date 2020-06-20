precision highp float;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
attribute float a_index;// 各顶点索引
uniform sampler2D u_lonlat;// 经纬度的纹理
uniform vec2 u_lonlat_radix;// 经纬度图片的大小
uniform vec3 u_lon;// 经度最小值、最大值、步长
uniform vec3 u_lat;// 纬度最小值、最大值、步长
uniform vec3 u_matrix_invert;
uniform vec3 u_translate_scale;
uniform vec2 u_view;
uniform vec4 u_current_bounds;
uniform vec4 u_projection_bounds;
varying vec2 v_index_texCoord;
varying vec2 v_texture_pixel;
varying vec2 v_lonlat;
float normalizeLon(float lon){
    return mod(lon+180.0, 360.0)-180.0;
}
float asinD3(float x) {
    return (x > 1.0) ? halfPi : ((x < -1.0) ? (-halfPi) : asin(x));
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
void main(){
    vec2 a_index_texCoord=vec2(fract(a_index/u_lonlat_radix.x), floor(a_index/u_lonlat_radix.x)/u_lonlat_radix.y);
    vec4 coordOriginal = texture2D(u_lonlat, a_index_texCoord);
    vec2 coordRate = vec2((coordOriginal.x*256.0*255.0+coordOriginal.z*255.0), (coordOriginal.y*256.0*255.0+coordOriginal.w*255.0))/65535.0;
    vec2 lonlat=mix(vec2(u_lon.x, u_lat.x), vec2(u_lon.y, u_lat.y), coordRate);
    v_lonlat=lonlat;
    // 经纬度转换为像素点
    v_texture_pixel = orthographicProjection(lonlat);// 纹理像素点
    vec2 text_coord =v_texture_pixel/u_view;// 纹理坐标点
    vec2 pos_coord=vec2(text_coord.x, 1.0-text_coord.y)*2.0-1.0;// 顶点坐标
    vec4 pos=vec4(pos_coord, 0.0, 1.0);// 顶点坐标

    vec2 front_lon_lat=orthographicProjectionInvert(v_texture_pixel);   // fixme:这一步算出来的经纬度不是在-180~180的，所以要给它算到标准范围内
    if (abs(v_lonlat.x-normalizeLon(front_lon_lat.x))<0.1&&abs(v_lonlat.y-front_lon_lat.y)<0.1){

    } else {
        // fixme:如果开启了隐藏面消除(深度缓冲区==>gl.enable(gl.DEPTH_TEST);)，那么就会用到裁剪坐标系，而裁剪坐标系默认矩阵是从后往前看的(即翻转了z轴，把传统的右手坐标系翻转成左手坐标系了)，所以这里把球体背面的点的z值设成正值而不是负值
        //        pos.z=0.8;
        // fixme:这里直接把球体背面的顶点画出边界(-1~1)，这样这些点就不会画了
        // fixme:这样就不用去担心哪个点在前面画哪个点在后面画了，而且片元着色器也不用再调用orthographicProjectionInvert()判断两个经纬度是否相同了
        pos.z=10.9;
    }

    gl_Position = pos;
    v_index_texCoord=a_index_texCoord;
}