precision highp float;
const float PREC = 255.0/254.0;
uniform mat4 u_matrix_invert;// 顺带把顶点坐标反转成和图片对应的了
uniform mat4 u_matrix;
uniform float u_scale;// 地图的zoom层
uniform float u_pitch;// 地图的俯角
uniform float u_bearing;// 地图的旋转角
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
const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float random(const vec2 co) { // 伪随机数
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}
float between(float min, float max, float val){
    return (val-min)/(max-min);
}
vec2 tilePos(vec2 pos){
    vec4 p0 = u_matrix_invert*vec4(pos, 0, 1);
    vec4 p1 = u_matrix_invert*vec4(pos, 1, 1);
    p0 = p0/p0.w;p1 = p1/p1.w;
    float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
    return mix(p0, p1, t).xy;
}
vec2 geoPos(vec2 pos){
    float lon = mix(-180.0, 180.0, pos.x);
    float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
    return vec2(lon, lat);
}
vec2 coord(vec2 pos){
    return vec2(between(u_lon[0], u_lon[1], mod(pos.x+180.0, 360.0)-180.0), between(u_lat[0], u_lat[1], pos.y));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
vec2 sum(vec2 point, float val){
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
void main() {
    vec4 point = texture2D(u_particles, v_pos);// 没反转v_pos，因为u_particles纹理的方向跟v_pos一样
    //    vec2 pos = vec2(point.x+point.z/255.0,point.y+point.w/255.0);
    vec2 pos = vec2((point.x*256.0+point.z), (point.y*256.0+point.w))/257.0;
    vec2 tp = tilePos(pos*2.0-1.0);// 线性混合粒子坐标
    vec2 seed = (pos+v_pos) * u_rand_seed;// a random seed to use for the particle drop
    vec2 target=vec2(0.0, 0.0);
    vec4 re = random4(seed);
    if (tp.y>=0.0&&tp.y<=1.0){
        vec2 geo = geoPos(tp);// 经纬度
        vec2 c = coord(geo);// 图片纹理坐标
        if (valid(c)&&texture2D(u_data, c).a==1.0){
            vec2 uv = mix(u_min, u_max, texture2D(u_data, c).xy*PREC);//  通过图片的纹理坐标c获得各通道像素值,然后线性混合，得到风uv值
            float drop_rate = u_drop_rate + length(uv) / length(u_max) * u_drop_rate_bump;
            float drop = step(1.0 - drop_rate, random(seed));
            float uFrom=uv.x/cos(radians(geo.y));
            float vFrom=uv.y;
            float uTo=uFrom*cos(radians(u_bearing))-vFrom*sin(radians(u_bearing));
            float vTo=uFrom*sin(radians(u_bearing))+vFrom*cos(radians(u_bearing));
            target =vec2(uTo, vTo*cos(radians(u_pitch)))*u_speed_factor;
            //            target =vec2(uTo,vTo*cos(radians(u_pitch)))*50.0;
            target=(target.xy+1.0)/(2.0);
            point.xz = sum(point.xz, target.x/255.0);
            point.yw = sum(point.yw, target.y/255.0);
            if (valid(vec2((point.x*256.0+point.z), (point.y*256.0+point.w))/257.0)){
                re = mix(point, re, drop);
            }
            /*vec2 t = pos+(target.xy+1.0)/(65535.0*2.0);
            if(valid(t)){
                re = mix(t,re,drop);
            }*/
        }
    }
    gl_FragColor = re;
}
