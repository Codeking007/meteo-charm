// precision mediump float;
precision highp float;
const float PREC = 255.0/254.0;
uniform mat4 u_matrix_invert;
uniform vec3 u_lon;         // 经度最小值、最大值、步长 
uniform vec3 u_lat;         // 纬度最小值、最大值、步长
uniform sampler2D u_data;   //  图片纹理单元=1
uniform float u_opacity;    // 1.0
uniform vec2 u_textureSize; // 纹理图片大小
uniform float u_kernel[9];  // 卷积内核系数
varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
vec2 tilePos(vec2 pos){
    vec4 p0 = u_matrix_invert*vec4(pos,0,1);
    vec4 p1 = u_matrix_invert*vec4(pos,1,1);
    p0 = p0/p0.w;
    p1 = p1/p1.w;
    float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
    return mix(p0,p1,t).xy;     // todo:线性混合
}
vec2 coord(vec2 pos){   // pos:经纬度
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
}
vec2 geoPos(vec2 pos){
    float lon = mix(-180.0,180.0,pos.x);
    float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
    return vec2(lon,lat);
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    vec2 tp = tilePos(v_pos);
    if(tp.y<1.0&&tp.y>0.0){
        vec2 c = coord(geoPos(tp));     // 获取图片的纹理坐标
        if(valid(c)){
            vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
            vec2 point[9];
            point[0]=c + vec2(-onePixel.x, onePixel.y);
            point[1]=c + vec2(0.0, onePixel.y);
            point[2]=c + vec2(onePixel.x, onePixel.y);
            point[3]=c + vec2(-onePixel.x, 0.0);
            point[4]=c + vec2(0.0, 0.0);
            point[5]=c + vec2(onePixel.x, 0.0);
            point[6]=c + vec2(-onePixel.x, -onePixel.y);
            point[7]=c + vec2(0.0, -onePixel.y);
            point[8]=c + vec2(onePixel.x, -onePixel.y);
            float kernelWeight;
            vec2 val;
            for(int i=0;i<9;i++){
                val += texture2D(u_data, point[i]).xy*PREC*u_kernel[i];
                kernelWeight +=u_kernel[i];
            }
            val /=kernelWeight;
            //            vec2 val= texture2D(u_data, c).xy*PREC;
            vec2 val1=floor(val * 65535.0 / 256.0);
            vec2 val2=val*65535.0-val1*256.0;
            gl_FragColor = vec4(val1/255.0,val2/255.0);
        }
    }
}