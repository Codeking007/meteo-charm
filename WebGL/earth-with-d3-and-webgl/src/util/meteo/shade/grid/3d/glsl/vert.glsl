attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;
}