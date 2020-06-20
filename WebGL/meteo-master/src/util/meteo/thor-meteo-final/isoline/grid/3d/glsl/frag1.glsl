precision highp float;
uniform sampler2D u_frameImage;
uniform vec2 u_textureSize;
uniform vec2 u_min;         // 各通道像素最小值
uniform vec2 u_max;         // 各通道像素最大值
uniform float u_isoline;     // 等值线数值间距
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小
varying vec2 v_texCoord;
const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift);
    return depth;
}
void main(){
    // todo:有的图有的地方没值，透明度为0.0，得在帧缓冲区着色器对象里判断
    float kernel[5];
    vec4 value[5];
    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    value[0]=texture2D(u_frameImage, v_texCoord + vec2(-onePixel.x, 0.0));
    value[1]=texture2D(u_frameImage, v_texCoord + vec2(onePixel.x, 0.0));
    value[2]=texture2D(u_frameImage, v_texCoord + vec2(0.0, onePixel.y));
    value[3]=texture2D(u_frameImage, v_texCoord + vec2(0.0, -onePixel.y));
    value[4]=texture2D(u_frameImage, v_texCoord + vec2(0.0, 0.0));
    for(int i=0;i<5;i++){
        vec4 rgbaDepth = value[i];
        float val1 = (rgbaDepth.x*256.0+rgbaDepth.z)/257.0;
        float val2 = (rgbaDepth.y*256.0+rgbaDepth.w)/257.0;
        vec2 eachValue=mix(u_min,u_max,vec2(val1,val2));
        // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
        if(isVector){       // fixme：双通道
            kernel[i] = floor(length(eachValue)/u_isoline);
        }else{      // fixme：单通道
            kernel[i] = floor(eachValue[0]/u_isoline);
        }
    }
    if(!(kernel[0]==kernel[1]&&kernel[1]==kernel[2]&&kernel[2]==kernel[3]&&kernel[3]==kernel[0])){
        int showLines=0;
        float currentValue;
        for(int i=0;i<4;i++){
            if(kernel[i]>=kernel[4]){
                showLines++;
                currentValue=kernel[i];
            }
        }
        if(showLines<=3){   // fixme:如果showLines<=4，那么数值显示就会有问题，所以只能取高线或者低线中的一个
            // todo:正负数怎么搞
            vec4 isolineValue;
            if(isVector){
                isolineValue = fract(between(length(u_min),length(u_max),currentValue*u_isoline) * bitShift);
            }else{
                isolineValue = fract(between(u_min[0],u_max[0],currentValue*u_isoline) * bitShift);
            }
            isolineValue -= isolineValue.gbaa * bitMask;
            gl_FragColor =isolineValue;
            //            gl_FragColor =vec4(1.0,1.0,1.0,1.0);
        }
    }
}