precision mediump float;
uniform sampler2D u_screen;     // 屏幕纹理单元=2
uniform float u_opacity;
varying vec2 v_pos;
void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_pos);      // 跟顶点坐标一样反过来
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
}