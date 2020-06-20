precision highp float;
uniform sampler2D u_screen;     // 屏幕纹理单元=2
uniform float u_opacity;
varying vec2 v_pos;
// fixme:这里的viewport()的大小是全屏大小
void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_pos);      // 跟顶点坐标一样反过来
    // a hack to guarantee opacity fade out even with a value close to 1.0
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
}