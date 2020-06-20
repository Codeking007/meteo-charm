/*precision highp float;
uniform float u_opacity;    // 1.0
varying vec2 v_uv_rate;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
void main(){
    vec2 val1=floor(v_uv_rate * 65535.0 / 256.0);
    vec2 val2=v_uv_rate*65535.0-val1*256.0;
    gl_FragColor = vec4(val1/255.0,val2/255.0);         // 把uv比例值存成四通道的
}*/

precision highp float;
const float PREC = 255.0/254.0;
uniform float u_opacity;    // 1.0
uniform vec3 u_coord;
uniform vec3 u_lon;         // 经度最小值、最大值、步长
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
uniform sampler2D u_data;   //  图片纹理单元=1
varying vec2 v_pos;
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
    float lon = lon(v_pos.x);
    float lat = lat(-v_pos.y);
    vec2 c = coord(lon,lat);
//    if(valid(c)){
      vec2  v_uv_rate=texture2D(u_data, c).xy*PREC;       //  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
//    }
    vec2 val1=floor(v_uv_rate * 65535.0 / 256.0);
    vec2 val2=v_uv_rate*65535.0-val1*256.0;
    gl_FragColor = vec4(val1/255.0,val2/255.0);         // 把uv比例值存成四通道的
}
