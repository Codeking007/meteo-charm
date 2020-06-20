precision highp float;
const float PI = 3.141592653589793;
const float halfPi = PI / 2.0;
const float PREC = 255.0/254.0;
uniform vec3 u_matrix_invert;    // 顺带把顶点坐标反转成和图片对应的了
uniform vec3 u_translate_scale;
uniform vec4 u_current_bounds;
uniform vec2 u_view;
uniform vec4 u_projection_bounds;
uniform sampler2D u_data;       //  图片纹理单元=1
uniform sampler2D u_color;      //  色卡纹理单元=0
uniform vec2 u_min;             // 各通道像素最小值
uniform vec2 u_max;             // 各通道像素最大值
uniform vec3 u_lon;             // 经度最小值、最大值、步长
uniform vec3 u_lat;             // 纬度最小值、最大值、步长
uniform vec2 u_cmm;             // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
varying vec2 v_pos;
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
vec2 coord(vec2 pos){
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],mod(pos.y+90.0,180.0)-90.0));
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
// fixme:这里的viewport()的大小是全屏大小
void main() {
    vec2 texture_point=(v_pos+1.0)/2.0;
    vec2 current_pos=vec2(texture_point.x,1.0-texture_point.y)*u_view;
    // fixme:是否在正方形内
//    if(current_pos.x>=u_current_bounds[0]&&current_pos.x<=u_current_bounds[1]&&current_pos.y>=u_current_bounds[2]&&current_pos.y<=u_current_bounds[3]){
    // fixme:像素点距离球体中心点在球体半径范围内==>小于横向像素边界和纵向像素边界的最大值，因为放到很大后可能某个边界范围就跟球体半径不相等了
    if(length(vec2(current_pos.x-u_translate_scale[0],current_pos.y-u_translate_scale[1]))<=max((u_projection_bounds[3]-u_projection_bounds[2])/2.0,(u_projection_bounds[1]-u_projection_bounds[0])/2.0)){
        // fixme:像素点转换成经纬度(正方形就变成圆形了)
        vec2 lon_lat=orthographicProjectionInvert(current_pos);
        vec2 c = coord(lon_lat);
        if(valid(c)&&texture2D(u_data, c).a==1.0){
            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));  // 通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);                    // 通过色卡横坐标val得到色卡纹理坐标
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));               // 得到色卡颜色，即相应点的颜色
        }
    }
}