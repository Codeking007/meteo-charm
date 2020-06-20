/*precision highp float;
const float PREC = 255.0/254.0;
attribute vec2 a_position;
uniform vec3 u_coord;
uniform vec3 u_lon;         // 经度最小值、最大值、步长
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
uniform sampler2D u_data;   //  图片纹理单元=1
varying vec2 v_uv_rate;
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
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
vec2 coord(float lon,float lat){
    //    return vec2(between(u_lon[0],u_lon[1],lon),between(u_lat[0],u_lat[1],lat));   // fixme:这个应该是错的
    return vec2(between(u_lon[0],u_lon[1],mod(lon+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],lat));  // fixme:这个应该对
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    gl_Position = vec4(a_position,0,1);
    float lon = lon(a_position.x);
    float lat = lat(-a_position.y); // todo；直接把顶点坐标关于x轴对称变换了
    vec2 c = coord(lon,lat);
    if(valid(c)){
        v_uv_rate=texture2D(u_data, c).xy*PREC;       //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
    }
}*/

precision highp float;
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos=a_position;
}
