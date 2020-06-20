precision highp float;
const float PI = 3.141592653589793;
const float PREC = 255.0/254.0;
uniform vec3 u_matrix_invert;    // 顺带把顶点坐标反转成和图片对应的了
uniform vec3 u_translate_scale;
uniform vec4 u_current_bounds;
uniform vec4 u_projection_bounds;
uniform vec2 u_view;
uniform sampler2D u_frameImage;       //  图片纹理单元=1
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
void main() {
    vec2 texture_point=(v_pos+1.0)/2.0;
    vec2 current_pos=vec2(texture_point.x,1.0-texture_point.y)*u_view;
    // fixme:像素点距离球体中心点在球体半径范围内==>小于横向像素边界和纵向像素边界的最大值，因为放到很大后可能某个边界范围就跟球体半径不相等了
    if(length(vec2(current_pos.x-u_translate_scale[0],current_pos.y-u_translate_scale[1]))<=max((u_projection_bounds[3]-u_projection_bounds[2])/2.0,(u_projection_bounds[1]-u_projection_bounds[0])/2.0)){
        vec4 rateUV=texture2D(u_frameImage, (v_pos+1.0)/2.0);
        if(rateUV.r!=1.0&&rateUV.g!=1.0&&rateUV.b!=1.0){         // fixme:有效的值ba通道都设的1.0，如果不是1.0就不画了，因为如果画的话，取出来的值都是0.0，而后面有个mix方法，会取u_min的值，这样就错了，那些中心点没值也画出来东西了
            float val1 = (rateUV.x*256.0+rateUV.z)/257.0;
            float val2 = (rateUV.y*256.0+rateUV.w)/257.0;
            float val = length(mix(u_min,u_max,vec2(val1,val2)));  // 通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
            float colorPos = between(u_cmm[0],u_cmm[1],val);    // 通过色卡横坐标val得到色卡纹理坐标
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));               // 得到色卡颜色，即相应点的颜色
        }
    }
}