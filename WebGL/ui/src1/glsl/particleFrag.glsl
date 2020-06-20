precision mediump float;
uniform sampler2D u_particles;
varying vec2 v_pos;
vec2 sum(vec2 point,float val){
    if(point.y + val >= 1.0){
        point.x += 1.0/255.0;
        point.y += val - 1.0;
    }else if(point.y + val < 0.0){
        point.x -= 1.0/255.0;
        point.y += val + 1.0;
    }else{
        point.y += val;
    }
    return point;
}
void main() {
    vec4 point = texture2D(u_particles, v_pos);
    point.xz = sum(point.xz,10.0/255.0);
    point.yw = sum(point.yw,10.0/255.0);
    gl_FragColor = point;
}