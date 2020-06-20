precision highp float;
uniform sampler2D u_frameIsoline;   // 等值线纹理单元
uniform sampler2D u_frameFont;     // 数值纹理
varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
void main(){
    vec2 texCoord = v_pos/2.0+0.5;
    vec4 isolineColor=texture2D(u_frameIsoline, texCoord);
    vec4 fontColor=texture2D(u_frameFont, texCoord);
    if(isolineColor.r>0.0||isolineColor.g>0.0||isolineColor.b>0.0||isolineColor.a>0.0){
        gl_FragColor=vec4(1.0,1.0,1.0,1.0);
        //        gl_FragColor=isolineColor;
    }
    /*if(fontColor.a==1.0){
        gl_FragColor=fontColor;
    }*/

    //    gl_FragColor=fontColor;

}