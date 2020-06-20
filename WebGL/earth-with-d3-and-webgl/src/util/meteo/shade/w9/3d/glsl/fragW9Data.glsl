precision highp float;
const float PREC = 255.0/254.0;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
uniform sampler2D u_data;// 数值的纹理
uniform sampler2D u_color;// 色卡的纹理
uniform vec3 u_lon;// 经度最小值、最大值、步长
uniform vec3 u_lat;// 纬度最小值、最大值、步长
uniform vec2 u_min;// 各通道像素最小值
uniform vec2 u_max;// 各通道像素最大值
uniform vec2 u_cmm;// 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
uniform float u_opacity;// 1.0
uniform vec3 u_matrix_invert;
uniform vec3 u_translate_scale;
uniform vec2 u_view;
uniform vec4 u_current_bounds;
uniform vec4 u_projection_bounds;
varying vec2 v_index_texCoord;
varying vec2 v_texture_pixel;
varying vec2 v_lonlat;
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);// fixme：是否是双通道
float between(float min, float max, float val){
    return (val-min)/(max-min);
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
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
void main(){
    // fixme:像素点距离球体中心点在球体半径范围内==>小于横向像素边界和纵向像素边界的最大值，因为放到很大后可能某个边界范围就跟球体半径不相等了
    if(length(vec2(v_texture_pixel.x-u_translate_scale[0], v_texture_pixel.y-u_translate_scale[1]))<=max((u_projection_bounds[3]-u_projection_bounds[2])/2.0, (u_projection_bounds[1]-u_projection_bounds[0])/2.0)){
        // fixme:这里直接把球体背面的顶点画出边界(-1~1)，这样这些点就不会画了
        // fixme:这样就不用去担心哪个点在前面画哪个点在后面画了，而且片元着色器也不用再调用orthographicProjectionInvert()判断两个经纬度是否相同了
//        vec2 front_lon_lat=orthographicProjectionInvert(v_texture_pixel);
//        if (abs(v_lonlat.x-front_lon_lat.x)<0.1&&abs(v_lonlat.y-front_lon_lat.y)<0.1){
            vec2 val=texture2D(u_data, v_index_texCoord).xy;
            vec2 val1=floor(val * 65535.0 / 256.0);
            vec2 val2=val*65535.0-val1*256.0;
            gl_FragColor = vec4(val1/255.0,val2/255.0);
//        } else { // 如果是球体背面的，就换成透明色
//            gl_FragColor=vec4(0.0);
//        }
    }
}