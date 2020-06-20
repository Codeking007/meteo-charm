precision highp float;
const float PREC = 255.0/254.0;
uniform float u_opacity;// 1.0
uniform vec3 u_coord;
uniform vec3 u_lon;// 经度最小值、最大值、步长
uniform vec3 u_lat;// 纬度最小值、最大值、步长
uniform sampler2D u_data;//  图片纹理单元=1 fixme:这个地方用gl.LINEAR对么？？？还是用NEAREST？？？==>用LINEAR，对于无效值到有效值过渡区，uv_rate.a==1.0就可以判断哪个是有效值；而对于全是有效值的点，有效值之间的过渡通过LINEAR能很好地发挥线性渐变作用
varying vec2 v_position;
float ms = exp2(u_coord.z);
float sinh(float val){
    return (exp(val)-exp(-val))/2.0;
}
float lon(float x){
    return (u_coord.x + (x + 1.0)/2.0)/ms*360.0 - 180.0;
}
float lat(float y){
    return degrees(atan((exp(180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms))-exp(-180.0*radians(1.0-2.0*(u_coord.y+((y + 1.0)/2.0))/ms)))/2.0));
}
float between(float min, float max, float val){
    return (val-min)/(max-min);
}
vec2 coord(float lon, float lat){
    // fixme:mod()函数返回的值全是正的，比如mod(-1.0,3.0)==2.0!=-1.0，这个跟js不一样。具体看书中mod()函数的计算方法
    // fixme:所以这里得先把值变成0~360之间，再去与360求余，最后再变回在-180~180之间
    //        return vec2(between(u_lon[0],u_lon[1],lon),between(u_lat[0],u_lat[1],lat));
    return vec2(between(u_lon[0], u_lon[1], mod(lon-u_lon[0], 360.0)+u_lon[0]), between(u_lat[0], u_lat[1], lat));
}
bool valid(vec2 pos){
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
void main(){
    float lon = lon(v_position.x);
    float lat = lat(-v_position.y);
    vec2 c = coord(lon, lat);
    if (valid(c)){
        // todo:这个坐标点应该取中心点的，而不是左上角的点
        vec4 uv_rate =texture2D(u_data, c);
        if (uv_rate.r!=1.0&&uv_rate.g!=1.0&&uv_rate.a==1.0){    // fixme:纹理是LINEAR，从无效值到有效值过渡这一段的数据是有问题的，这个if语句的!=1.0没法判断这种特殊情况；而第三个条件==1.0却能很好地判断，因为只要不是1.0，那就是无效值，而且只要是从无效值到有效值过渡，那alpha肯定不是1.0.
            vec2 val1=floor(uv_rate.rg * 65535.0 / 256.0);// fixme:不给uv_rate比例值乘上PREC变成真正的比例值，而是放到下一步着色器再变回来，因为这里需要继续用到这个无效值255，以在下一步着色器进行判断是否有效
            vec2 val2=uv_rate.rg*65535.0-val1*256.0;
            gl_FragColor = vec4(val1/255.0, val2/255.0);// 把uv比例值存成四通道的
        } else {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);// fixme:配合gl.clearColor()，风速0m/s对应风级是0级，所以不能用背景色(0,0,0,0)
        }
    } else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);// fixme:配合gl.clearColor()，风速0m/s对应风级是0级，所以不能用背景色(0,0,0,0)
    }
}