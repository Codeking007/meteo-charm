precision highp float;
const float PREC = 255.0/254.0;
uniform mat4 u_matrix_invert;    // 顺带把顶点坐标反转成和图片对应的了
uniform sampler2D u_data;       //  图片纹理单元=1
uniform sampler2D u_color;      //  色卡纹理单元=0
uniform vec2 u_min;             // 各通道像素最小值
uniform vec2 u_max;             // 各通道像素最大值
uniform vec3 u_lon;             // 经度最小值、最大值、步长
uniform vec3 u_lat;             // 纬度最小值、最大值、步长
uniform vec2 u_cmm;             // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
varying vec2 v_pos;
varying float v_line_opacity;// 线段透明度值==>不用这个值，让一帧的线段都是1.0透明度，通过screenFrag.glsl来使整个canvas透明度降低
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
vec2 tilePos(vec2 pos){
    vec4 p0 = u_matrix_invert*vec4(pos,0,1);
    vec4 p1 = u_matrix_invert*vec4(pos,1,1);
    p0 = p0/p0.w;p1 = p1/p1.w;
    float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
    return mix(p0,p1,t).xy;
}
vec2 geoPos(vec2 pos){
    float lon = mix(-180.0,180.0,pos.x);
    float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
    return vec2(lon,lat);
}
vec2 coord(vec2 pos){
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main() {
    vec2 tp = tilePos(v_pos);
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
        if(valid(c)&&texture2D(u_data, c).a==1.0){  // fixme：线段的当前位置还应该有气象数据才能显示
            float val = length(mix(u_min,u_max,texture2D(u_data, c).xy*PREC));  // 通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);                    // 通过色卡横坐标val得到色卡纹理坐标
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));               // 得到色卡颜色，即相应点的颜色
//            gl_FragColor = vec4(1.0,1.0,1.0,colorPos);
//            gl_FragColor = vec4(1.0,1.0,1.0,1.0);
        }
    }
}
