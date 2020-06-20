precision highp float;
attribute vec2 a_pos;// 传进来的是从[0,0]到[1,1]的范围，不是从[-1,-1]到[1,1]的范围，所以下面要转换
varying vec2 v_pos;
void main() {
    v_pos = a_pos;
    gl_Position = vec4(a_pos*2.0-1.0, 0, 1);// 从0~1转到1~-1，不是-1~1，因为图片是反转的，所以这里对应一下
}
