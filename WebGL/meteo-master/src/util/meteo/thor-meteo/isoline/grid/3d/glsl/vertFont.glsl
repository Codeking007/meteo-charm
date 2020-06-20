attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_texCoord = a_texCoord;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}