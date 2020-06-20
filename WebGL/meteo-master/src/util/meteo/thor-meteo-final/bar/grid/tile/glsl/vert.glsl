precision highp float;
const float PREC = 255.0/254.0;
attribute vec2 a_position;
uniform vec3 u_coord;
uniform vec3 u_lon;// 经度最小值、最大值、步长
uniform vec3 u_lat;// 纬度最小值、最大值、步长
uniform sampler2D u_data;//  图片纹理单元=1
varying vec2 v_position;
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
float between(float min, float max, float val){
    return (val-min)/(max-min);
}
vec2 coord(float lon, float lat){
    // fixme:mod()函数返回的值全是正的，比如mod(-1.0,3.0)==2.0!=-1.0，这个跟js不一样。具体看书中mod()函数的计算方法
    // fixme:所以这里得先把值变成0~360之间，再去与360求余，最后再变回在-180~180之间
    //        return vec2(between(u_lon[0],u_lon[1],lon),between(u_lat[0],u_lat[1],lat));
    return vec2(between(u_lon[0], u_lon[1], mod(lon-u_lon[0], 360.0)+u_lon[0]), between(u_lat[0], u_lat[1], lat));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    gl_Position = vec4(a_position, 0, 1);
    v_position=a_position;
}