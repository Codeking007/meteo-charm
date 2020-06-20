precision highp float;
uniform sampler2D u_numbers;   //  字体纹理单元=6
varying vec2 v_texCoord;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
void main(){
    vec4 fontColor=texture2D(u_numbers, v_texCoord);
    if(fontColor.g>0.3){
        gl_FragColor=vec4(0.5,1.0,0.5,1.0);
    }else{
        gl_FragColor=vec4(0.0,0.0,0.0,0.0);
    }

    //    gl_FragColor=fontColor;
}