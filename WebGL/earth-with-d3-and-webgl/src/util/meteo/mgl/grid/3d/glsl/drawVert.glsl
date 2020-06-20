attribute float a_index;
uniform sampler2D u_particles;  // 粒子纹理，存的各粒子位置坐标
uniform float u_particles_radix;
varying vec2 v_pos;
void main() {
    vec4 coord = texture2D(u_particles, vec2(mod(a_index,u_particles_radix)/(u_particles_radix-1.0),floor(a_index / u_particles_radix) / (u_particles_radix-1.0)));
    v_pos = vec2(coord.x*256.0+coord.z,coord.y*256.0+coord.w)/257.0*2.0-1.0;
    gl_PointSize = 1.0;
    gl_Position = vec4(v_pos, 0, 1);
}