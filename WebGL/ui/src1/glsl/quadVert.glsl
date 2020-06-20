attribute vec2 a_pos;
varying vec2 v_pos;
void main() {
    v_pos = a_pos;
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);    // 从0~1转到1~-1，不是-1~1，因为图片是反转的，所以这里对应一下
}
