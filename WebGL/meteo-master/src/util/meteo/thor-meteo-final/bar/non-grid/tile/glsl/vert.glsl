precision highp float;
const float PI = 3.141592653589793;
attribute float a_index;// 各顶点索引
uniform vec3 u_coord;
uniform sampler2D u_lonlat;// 经纬度的纹理
uniform vec2 u_lonlat_radix;// 经纬度图片的大小
uniform vec3 u_lon;// 经度最小值、最大值、步长
uniform vec3 u_lat;// 纬度最小值、最大值、步长
varying vec2 v_index_texCoord;
varying vec4 v_pos;
float ms = exp2(u_coord.z);
float sinh(float val){
    return (exp(val)-exp(-val))/2.0;
}
float lon(float x){
    return (u_coord.x + (x + 1.0)/2.0)/ms*360.0 - 180.0;
}
float lat(float y){
    return degrees(atan((exp(180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms))-exp(-180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms)))/2.0));
}

float adjust(float val, float offset){
    return (val*ms-offset)*2.0-1.0;
}
float x(float lon){
    return adjust((lon+180.0)/360.0, u_coord.x);
}
float y(float lat){
    return adjust(0.5-log((1.0+sin(lat*PI/180.0))/(1.0-sin(lat*PI/180.0)))/(4.0*PI), u_coord.y);
}

void main(){
    // todo:坐标换算可能有问题，经纬度纹理用的NEAREST导致看不出来问题，如果换成LINEAR就能看出来算的位置不对了
    vec2 a_index_texCoord = vec2(mod(a_index, u_lonlat_radix.x)/(u_lonlat_radix.x-1.0), floor(a_index / u_lonlat_radix.x) / (u_lonlat_radix.y-1.0));
    vec4 coordOriginal = texture2D(u_lonlat, a_index_texCoord);
    vec2 coordRate = vec2((coordOriginal.x*256.0*255.0+coordOriginal.z*255.0), (coordOriginal.y*256.0*255.0+coordOriginal.w*255.0))/65535.0;
    vec2 lonlat=mix(vec2(u_lon.x, u_lat.x), vec2(u_lon.y, u_lat.y), coordRate);
    vec4 pos=vec4(x(lonlat.x), y(lonlat.y), 0.0, 1.0);
    gl_Position = pos;
    v_index_texCoord=a_index_texCoord;
    v_pos=(pos+1.0)/2.0;
}