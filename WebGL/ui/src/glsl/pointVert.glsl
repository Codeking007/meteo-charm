varying vec2 v_pos;
attribute float a_index;                // 各粒子索引
uniform sampler2D u_particles;          // 粒子纹理单元=3  256*256的画在canvas的大小上，所以要变换
uniform float u_particles_radix;        // 粒子基数=256，粒子纹理的长宽
void main() {
    vec4 point = texture2D(u_particles, vec2(mod(a_index,u_particles_radix)/(u_particles_radix-1.0),floor(a_index/u_particles_radix)/(u_particles_radix-1.0)));
    vec2 pos = vec2((point.x*256.0*255.0+point.z*255.0),(point.y*256.0*255.0+point.w*255.0))/65535.0;//(0-1)
    v_pos = pos*2.0-1.0;
    gl_PointSize = 2.0;
    gl_Position = vec4(v_pos, 0, 1);
}
