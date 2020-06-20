attribute float a_index;                // 各粒子索引
uniform sampler2D u_particles;          // 粒子纹理单元=3  256*256的画在canvas的大小上，所以要变换
uniform float u_particles_radix;        // 粒子基数=256，粒子纹理的长宽
varying vec2 v_pos;
void main() {
    // fixme：先算出每个纹理坐标，再通过纹理得到像素值，从而得到每个粒子的位置坐标
    // fixme:s取的假分数的小数部分，t取的假分数的整数部分占总高度的份额
//      vec4 coord = texture2D(u_particles, vec2(fract(a_index / u_particles_radix),floor(a_index / u_particles_radix) / u_particles_radix));
    vec4 coord = texture2D(u_particles, vec2(mod(a_index,u_particles_radix)/(u_particles_radix-1.0),floor(a_index / u_particles_radix) / (u_particles_radix-1.0)));
//    v_pos = vec2(coord.x+coord.z/255.0,coord.y+coord.w/255.0)*2.0-1.0;   // 因为存在u_particles纹理中的值是0-1范围的，所以2x-1转成-1~1的范围
    v_pos = vec2(coord.x*256.0+coord.z,coord.y*256.0+coord.w)/257.0*2.0-1.0;
    gl_PointSize = 1.0;
    gl_Position = vec4(v_pos, 0, 1);
}
