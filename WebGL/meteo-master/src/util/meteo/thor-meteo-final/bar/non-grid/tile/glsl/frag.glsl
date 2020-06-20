precision highp float;
const float PI = 3.141592653589793;
uniform vec3 u_coord;
uniform sampler2D u_data;// 数值的纹理
uniform vec2 u_lonlat_radix;// 经纬度图片的大小
uniform vec2 u_lon1;// 经度最小值、最大值
uniform vec2 u_lat1;// 纬度最小值、最大值
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
    // todo:这个坐标点应该取中心点的，而不是左上角的点
    vec4 coordOriginal1 =texture2D(u_data, v_index_texCoord);
    if (coordOriginal1.r!=0.0&&coordOriginal1.g!=0.0&&coordOriginal1.b!=0.0&&coordOriginal1.a!=0.0){ // fixme:如果值是有效值，四通道都不为0   // todo:但是纹理是LINEAR，从无效值到有效值过渡这一段的数据是有问题的，这个if语句没法判断这种特殊情况
        vec2 coordRate1 = vec2((coordOriginal1.x*256.0*255.0+coordOriginal1.z*255.0), (coordOriginal1.y*256.0*255.0+coordOriginal1.w*255.0))/65535.0;
        vec2 lonlat1=mix(vec2(u_lon1.x, u_lat1.x), vec2(u_lon1.y, u_lat1.y), coordRate1);
        vec4 pos1=vec4(x(lonlat1.x), y(lonlat1.y), 0.0, 1.0);
        // todo:这个移向有问题，如果跨越90N跳到另一边，那怎么算方向
        vec2 drift=pos1.xy-(v_pos.xy*2.0-1.0);// fixme:通过投影到地图上的顶点坐标差值判断方向，而不是简单地通过经纬度差值判断方向
        // fixme:差值 ==>顶点坐标范围【-1,1】与【-1,1】的差值范围是【-2,2】
        vec2 uv_rate=(drift-vec2(-2.0, -2.0))/(vec2(2.0, 2.0)-vec2(-2.0, -2.0));// 把uv比例值传到片元着色器，让WebGL对这个值作渐变，而不是把纹理坐标值传过去让WebGL做渐变

        vec2 val1=floor(uv_rate * 65535.0 / 256.0);
        vec2 val2=uv_rate*65535.0-val1*256.0;
        gl_FragColor = vec4(val1/255.0, val2/255.0);// 把uv比例值存成四通道的
    } else {
        gl_FragColor = vec4(0.0);
    }
}