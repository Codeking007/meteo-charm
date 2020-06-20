attribute vec2 a_index;// [索引，首点/尾点(0/1)]
uniform sampler2D u_particles_end;// 粒子纹理单元=3  256*256的画在canvas的大小上，所以要变换
uniform sampler2D u_particles_start;// 粒子纹理单元=4  256*256的画在canvas的大小上，所以要变换
uniform float u_particles_radix;// 粒子基数=256，粒子纹理的长宽
uniform vec2 u_canvas_size;// canvas的大小，即屏幕分辨率*window.devicePixelRatio
varying vec2 v_pos;
varying float v_line_opacity;// 线段透明度值
void main() {
    // fixme：先算出每个纹理坐标，再通过纹理得到像素值，从而得到每个粒子的位置坐标
    // fixme:s取的假分数的小数部分，t取的假分数的整数部分占总高度的份额
    //      vec4 coord = texture2D(u_particles, vec2(fract(a_index / u_particles_radix),floor(a_index / u_particles_radix) / u_particles_radix));
    /*vec4 coord_start = texture2D(u_particles_start, vec2(mod(a_index[0], u_particles_radix)/(u_particles_radix-1.0), floor(a_index[0] / u_particles_radix) / (u_particles_radix-1.0)));
    vec4 coord_end = texture2D(u_particles_end, vec2(mod(a_index[0], u_particles_radix)/(u_particles_radix-1.0), floor(a_index[0] / u_particles_radix) / (u_particles_radix-1.0)));*/
    vec4 coord_start = texture2D(u_particles_start, vec2(mod(a_index[0], u_particles_radix)/(u_particles_radix), floor(a_index[0] / u_particles_radix) / (u_particles_radix)));
    vec4 coord_end = texture2D(u_particles_end, vec2(mod(a_index[0], u_particles_radix)/(u_particles_radix), floor(a_index[0] / u_particles_radix) / (u_particles_radix)));
    vec2 texture_coord_start=vec2(coord_start.x*256.0+coord_start.z, coord_start.y*256.0+coord_start.w)/257.0;
    vec2 texture_coord_end=vec2(coord_end.x*256.0+coord_end.z, coord_end.y*256.0+coord_end.w)/257.0;
    // 考虑到在粒子游走到地图边界外，或者进入旋涡 所导致的 粒子在后期会出现不在屏幕内或者都聚集在旋涡中，所以需要通过伪随机数重新生成粒子位置，让新粒子在其他地方出现。
    // 这时不能把当前帧的粒子首尾点相连，因为已经变成另外一个新粒子了，旧的粒子应该当作“已死亡”。
    // 通过updateFrag.glsl中vec2 sum(vec2 point, float val)函数所写的内容：粒子每帧移动的距离最多就一个像素点==>这个条件来判断
    if (
    length(vec2(texture_coord_end.x-texture_coord_start.x, texture_coord_end.y-texture_coord_start.y)*u_canvas_size)
    <=10.0
    ){
        if (a_index[1]==0.0){ // 起点
            v_pos = texture_coord_start*2.0-1.0;
        } else if (a_index[1]==1.0){ // 终点
            v_pos = texture_coord_end*2.0-1.0;
        }
        gl_Position = vec4(v_pos, 0, 1);
    } else { // 如果变成新粒子了，那就让线段的首尾点重合，这样就画不出来了
        v_pos = vec2(0.0, 0.0);
        gl_Position = vec4(-1.0, -1.0, 0, 1);
    }
    v_line_opacity=a_index[1];
}
