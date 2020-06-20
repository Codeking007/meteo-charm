precision highp float;
uniform float u_opacity;    // 1.0
varying vec2 v_uv_rate;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
void main(){
    vec2 val1=floor(v_uv_rate * 65535.0 / 256.0);
    vec2 val2=v_uv_rate*65535.0-val1*256.0;
    gl_FragColor = vec4(val1/255.0,val2/255.0);         // 把uv比例值存成四通道的
}