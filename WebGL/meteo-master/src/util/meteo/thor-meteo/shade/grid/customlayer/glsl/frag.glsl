precision highp float;
const float PREC = 255.0/254.0;
uniform mat4 u_matrix_invert;
uniform vec3 u_lon;
uniform vec3 u_lat;
uniform sampler2D u_data;
uniform sampler2D u_color;
uniform vec3 u_coord;
uniform vec2 u_min;
uniform vec2 u_max;
uniform vec2 u_cmm;
uniform float u_type;
uniform float u_opacity;
varying vec2 v_pos;
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);// fixme：是否是双通道
float between(float min, float max, float val){
    return (val-min)/(max-min);
}
vec2 tilePos(vec2 pos){
    vec4 p0 = u_matrix_invert*vec4(pos, 0, 1);
    vec4 p1 = u_matrix_invert*vec4(pos, 1, 1);
    p0 = p0/p0.w;
    p1 = p1/p1.w;
    float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
    return mix(p0, p1, t).xy;
}
vec2 geoPos(vec2 pos){
    float lon = mix(-180.0, 180.0, pos.x);
    float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
    return vec2(lon, lat);
}
vec2 coord(vec2 pos){
    // fixme:mod()函数返回的值全是正的，比如mod(-1.0,3.0)==2.0!=-1.0，这个跟js不一样。具体看书中mod()函数的计算方法
    // fixme:所以这里得先把值变成0~360之间，再去与360求余，最后再变回在-180~180之间
    // todo:其他的GLSL还没重新检查一遍
    //    return vec2(between(u_lon[0], u_lon[1], mod(pos.x+180.0, 360.0)-180.0), between(u_lat[0], u_lat[1], pos.y));
    return vec2(between(u_lon[0], u_lon[1], mod(pos.x-u_lon[0], 360.0)+u_lon[0]), between(u_lat[0], u_lat[1], pos.y));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    vec2 tp = tilePos(v_pos);
    if (tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));
        //        if(valid(c)){
        if (valid(c)&&texture2D(u_data, c).a==1.0){
            // if(valid(c)&&texture2D(u_data, c).x>0.0&&texture2D(u_data, c).y>0.0&&texture2D(u_data, c).x<1.0&&texture2D(u_data, c).y<1.0){
            vec4 texColor=texture2D(u_data, c);
            vec2 eachValue=mix(u_min, u_max, texture2D(u_data, c).xy*PREC);
            float val;
            if (isVector){ // fixme：双通道
                val = length(eachValue);//  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            } else { // fixme：单通道
                val = eachValue[0];
            }
            gl_FragColor = texture2D(u_color, vec2(between(u_cmm[0], u_cmm[1], val), 1.0))*u_opacity;
        }
    }
}