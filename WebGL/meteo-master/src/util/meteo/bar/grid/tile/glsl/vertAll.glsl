precision highp float;
const float PI = 3.141592653589793;
attribute vec2 a_pos;           // 顶点坐标
attribute vec2 a_texCoord;      // 纹理坐标
varying vec2 v_texCoord;
void main(){
    gl_Position = vec4(a_pos.x,-a_pos.y,0.0,1.0);
    v_texCoord=a_texCoord;
}