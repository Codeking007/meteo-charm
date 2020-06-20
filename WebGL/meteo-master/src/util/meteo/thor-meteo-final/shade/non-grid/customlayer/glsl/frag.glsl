precision highp float;
const float PREC = 255.0/254.0;
uniform sampler2D u_data;// 数值的纹理
uniform sampler2D u_color;// 色卡的纹理
uniform vec2 u_min;// 各通道像素最小值
uniform vec2 u_max;// 各通道像素最大值
uniform vec2 u_cmm;// 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
uniform float u_opacity;// 1.0
varying vec2 v_index_texCoord;
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);// fixme：是否是双通道
float between(float min, float max, float val){
    return (val-min)/(max-min);
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    if (valid(v_index_texCoord)&&texture2D(u_data, v_index_texCoord).a==1.0){
        vec2 eachValue=mix(u_min, u_max, texture2D(u_data, v_index_texCoord).xy*PREC);//  通过图片的纹理坐标c获得各通道像素值,然后线性混合,在通过length方法求矢量和:如求u,v矢量和.得到色卡横坐标,即gfs数据值的大小
        float val;
        // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
        if (isVector){ // fixme：双通道
            val = length(eachValue);
        } else { // fixme：单通道
            val = eachValue[0];
        }
        float colorPos = between(u_cmm[0], u_cmm[1], val);// 通过色卡横坐标val得到色卡纹理坐标
        gl_FragColor = texture2D(u_color, vec2(colorPos, 1.0))*u_opacity;
    }

}