const vert = `
attribute vec3 a_pos;
uniform vec3 u_lon;
uniform vec3 u_lat;
uniform vec3 u_coord;
varying vec2 v_pos;
varying float v_val;
float ms = exp2(u_coord.z);
float lon(float x){
    return (u_coord.x + (x + 1.0)/2.0)/ms*360.0 - 180.0;
}
float lat(float y){
    return degrees(atan((exp(180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms))-exp(-180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms)))/2.0));
}
float between(float min,float max,float val){
    return (val-min)/(max-min);
}
vec2 coord(float lon,float lat){
    return vec2(between(u_lon[0],u_lon[1],lon),between(u_lat[0],u_lat[1],lat));
}
void main(){
    float lon = lon(a_pos.x/180.0);
    float lat = lat(a_pos.y/90.0);
    vec2 c = coord(lon,lat);    
    gl_Position = vec4(c,0.0,1.0);
    v_pos = c;
    v_val = a_pos.z;
}`;

const frag = `
// precision mediump float;
precision highp float;
uniform sampler2D u_color;
uniform vec2 u_cmm;
varying vec2 v_pos;
varying float v_val;

float between(float min,float max,float val){
    return (val-min)/(max-min);
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    if(valid(v_pos)){
        float colorPos = between(u_cmm[0],u_cmm[1],v_val);
        gl_FragColor = texture2D(u_color,vec2(colorPos,1.0));
    }
    
}`;

const vert = `
const float PI = 3.141592653589793;
attribute vec3 a_pos;
uniform vec3 u_coord;
varying float v_value;
float ms = exp2(u_coord.z);
float adjust(float val,float offset){
    return (val*ms-offset)*2.0-1.0;
}
float x(float lon){
    return adjust((lon+180.0)/360.0,u_coord.x);
}
float y(float lat){
    return adjust(0.5-log((1.0+sin(lat*PI/180.0))/(1.0-sin(lat*PI/180.0)))/(4.0*PI),u_coord.y);
}
void main(){
    gl_Position = vec4(x(a_pos.x),y(a_pos.y), 0, 1);
    v_value = a_pos.z;
}`;

const frag = `
precision mediump float;
uniform sampler2D u_color;
uniform vec2 u_cmm;
varying float v_value;
void main(){
    gl_FragColor = texture2D(u_color,vec2(v_value/10.0,1));//vec4(1,0,0,1);
}`;
