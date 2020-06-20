const TILESIZE_DEFAULT = 256;
const TEXTURE_INDEX_COLOR = 0;
const TEXTURE_INDEX_DATA = 1;
const TEXTURE_FRMAE_DISTANCE_VALUE = 2;
const TEXTURE_FRMAE_SIMPLIFIED_DISTANCE_VALUE = 3;
const TEXTURE_FRMAE_MATRIX_K = 4;
const TEXTURE_FRMAE_INVERT_MATRIX_K = 5;


let R_solve = function (a) {
    let n = Math.sqrt(a.length);
    let m = n;
    // let b = new Array(n);
    let indxc = new Array(n);
    let indxr = new Array(n);
    let ipiv = new Array(n);

    let icol, irow;
    let big, dum, pivinv, temp;

    // for (let i = 0; i < n; i++) {
    //     b[i] = new Array(n);
    //     for (let j = 0; j < n; j++) {
    //         if (i === j) {
    //             b[i][j] = 1;
    //         } else {
    //             b[i][j] = 0;
    //         }
    //     }
    // }
    for (let j = 0; j < n; j++) {
        ipiv[j] = 0;
    }
    for (let i = 0; i < n; i++) {
        // 1、全选主元
        // 从第 k 行、第 k 列开始的右下角子阵中选取绝对值最大的元素，并记住次元素所在的行号和列号，在通过行交换和列交换将它交换到主元素位置上。这一步称为全选主元。
        big = 0;
        for (let j = 0; j < n; j++) {
            if (ipiv[j] !== 1) {
                for (let k = 0; k < n; k++) {
                    if (ipiv[k] === 0) {
                        if (Math.abs(a[j*n+k]) >= big) {
                            big = Math.abs(a[j*n+k]);
                            irow = j;
                            icol = k;
                        }
                    }
                }
            }
        }
        ++(ipiv[icol]);

        if (irow !== icol) {
            for (let l = 0; l < n; l++) {
                temp = a[irow*n+l];
                a[irow*n+l] = a[icol*n+l];
                a[icol*n+l] = temp;
            }
            // for (let l = 0; l < m; l++) {
            //     temp = b[irow][l];
            //     b[irow][l] = b[icol][l];
            //     b[icol][l] = temp;
            // }
        }

        indxr[i] = irow;
        indxc[i] = icol;

        // 2、m(k, k) = 1 / m(k, k)
        if (a[icol*n+icol] === 0) { /* Singular matrix */
            return false;
        }
        pivinv = 1 / a[icol*n+icol];

        // 3、m(k, j) = m(k, j) * m(k, k)，j = 0, 1, ..., n-1；j != k
        a[icol*n+icol] = 1;
        for (let l = 0; l < n; l++) {
            a[icol*n+l] *= pivinv;
        }
        // for (let l = 0; l < m; l++) {
        //     b[icol][l] *= pivinv;
        // }

        // 4、m(i, j) = m(i, j) - m(i, k) * m(k, j)，i, j = 0, 1, ..., n-1；i, j != k
        for (let ll = 0; ll < n; ll++) {
            if (ll !== icol) {
                dum = a[ll*n+icol];
                a[ll*n+icol] = 0;
                for (let l = 0; l < n; l++) {
                    a[ll*n+l] -= a[icol*n+l] * dum;
                }
                // for (let l = 0; l < m; l++) {
                //     b[ll][l] -= b[icol][l] * dum;
                // }
            }
        }
    }

    // 5、m(i, k) = -m(i, k) * m(k, k)，i = 0, 1, ..., n-1；i != k
    for (let l = (n - 1); l >= 0; l--) {
        if (indxr[l] !== indxc[l]) {
            for (let k = 0; k < n; k++) {
                temp = a[k*n+indxr[l]];
                a[k*n+indxr[l]] = a[k*n+indxc[l]];
                a[k*n+indxc[l]] = temp;
            }
        }
    }
    return a;
}

class Meteo {

    constructor(map) {
        this.map = map;
        this._init();
    }

    initShader() {
        // region fixme:(1)
        this.vert_distance_value = `        // (1441*721)*(1441*721)
attribute vec2 a_position;
varying vec2 v_tex;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_tex = (a_position+1.0)/2.0;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

        this.frag_distance_value = ` 
precision highp float;
const float PREC = 255.0/250.0;
uniform vec3 u_lon;         // 经度最小值、最大值、步长     =-180,180 0.25
uniform vec3 u_lat;         // 纬度最小值、最大值、步长     =-90,90 0.25
uniform vec2 u_min;         // 各通道像素最小值             =218.53,0
uniform vec2 u_max;         // 各通道像素最大值             =313.72,0
uniform vec2 u_lon_lat_min_max; // 经纬度距离的最小最大，(0,180*1.414)     =0,254.56
uniform vec2 u_value_min_max;   // 值的最小最大，如果是单通道就是(u_min[0],u_max[0]),双通道就是(0,length(max(u_min[0],u_max[0]),max(u_min[1],u_max[1])))    =218.53,313.72
uniform sampler2D u_data;  // 图片纹理单元=1
uniform vec2 u_data_size;   // 图片大小(宽度、高度)      =1441,721
uniform vec2 u_data_scale;   // 图片缩放倍数(宽度、高度)   =700,360  
uniform vec2 u_frame_distance_value_size;  // 帧缓冲区大小(宽度、高度) ==> 宽度==高度==(floor((u_data_size.x-1.0)/u_data_scale.x)+1.0)*(floor((u_data_size.y-1.0)/u_data_scale.y)+1.0)=9,9
varying vec2 v_tex;     
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道
float lonDistance(float lon1,float lon2){     
    lon1=mod(lon1+180.0,360.0)-180.0;
    lon2=mod(lon2+180.0,360.0)-180.0;
    float distance=0.0;
    if(abs(lon1-lon2)<=180.0){
        distance=abs(lon1-lon2);
    }else{
        if(lon1<lon2){
            distance=abs(lon1+360.0-lon2);
        }else{
            distance=abs(lon2+360.0-lon1);
        }
    }
    return distance;
}
float between(float min,float max,float val){
    return (val-min)/(max-min);
}    
vec4 pack(vec2 originalValue){    // 二通道变四通道
    vec2 originalValueRate=vec2(between(u_lon_lat_min_max[0],u_lon_lat_min_max[1],originalValue[0]),between(0.0,u_value_min_max[1]-u_value_min_max[0],originalValue[1]));
    vec2 val1=floor(originalValueRate * 65535.0 / 256.0);
    vec2 val2=originalValueRate*65535.0-val1*256.0;
    return vec4(val1/255.0,val2/255.0);
}
void main(){
    // 当前点的片元索引
    vec2 point_index_self=floor(v_tex*u_frame_distance_value_size);           
    // 当前点在数据纹理中的片元索引
    vec2 data_size=vec2(floor((u_data_size.x-1.0)/u_data_scale.x)+1.0,floor((u_data_size.y-1.0)/u_data_scale.y)+1.0);   // 在数据纹理中横向纵向各取几个数=3,2
    vec4 point_index_data=vec4(mod(point_index_self.y,data_size.x)*u_data_scale.x,floor(point_index_self.y/data_size.x)*u_data_scale.y,
                                mod(point_index_self.x,data_size.x)*u_data_scale.x,floor(point_index_self.x/data_size.x)*u_data_scale.y);
    // 当前点在数据纹理中的纹理坐标
    vec4 point_coord_data=vec4(point_index_data[0]/u_data_size.x,point_index_data[1]/u_data_size.y,
                                point_index_data[2]/u_data_size.x,point_index_data[3]/u_data_size.y);
    // 当前点的经纬度
    vec4 lon_lat=vec4(u_lon[0]+u_lon[2]*point_index_data[0],u_lat[0]+u_lat[2]*point_index_data[1],
                       u_lon[0]+u_lon[2]*point_index_data[2],u_lat[0]+u_lat[2]*point_index_data[3]);
    // 当前点的值
    vec4 eachValue=vec4(mix(u_min,u_max,texture2D(u_data, point_coord_data.xy).xy*PREC),mix(u_min,u_max,texture2D(u_data, point_coord_data.zw).xy*PREC));
    vec2 val_data;
    // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
    if(isVector){       // fixme：双通道
        val_data = vec2(length(eachValue.xy),length(eachValue.zw));
    }else{      // fixme：单通道
        val_data = vec2(eachValue[0],eachValue[2]);
    }
    // 求样本中两点的距离和差值
    vec2 distance_value=vec2(length(vec2(lonDistance(lon_lat[0],lon_lat[2]),lon_lat[1]-lon_lat[3])),abs(val_data[0]-val_data[1]));
    // 把（dixtance,value）存成四通道
    gl_FragColor = pack(distance_value);
}`;

        // endregion

        // region fixme:(2)
        this.vert_simplified_distance_value = `    // 10*1
attribute vec2 a_position;
varying vec2 v_tex;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_tex = (a_position+1.0)/2.0;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

        this.frag_simplified_distance_value = `  
precision highp float;
uniform sampler2D u_frame_distance_value;   //  纹理单元==>存两两距离和值的矩阵=2
uniform vec2 u_frame_distance_value_size;   // 帧缓冲区宽度、高度=9,9
uniform vec2 u_frame_simplified_distance_value_size;      // 帧缓冲区宽度、高度  lags*1=10*1=10,1
uniform float u_cut_off;        // cutoff=最大距离/3=84.8528137
uniform vec2 u_lon_lat_min_max; // 经纬度距离的最小最大，(0,180*1.414)=0,254.55844
uniform vec2 u_value_min_max;   // 值的最小最大，如果是单通道就是(u_min[0],u_max[0]),双通道就是(0,max(length(max(u_min[0],u_max[0]),max(u_min[1],u_max[1]))))=218.5314636,313.721466
varying vec2 v_tex;
float between(float min,float max,float val){
    return (val-min)/(max-min);
}       
vec4 pack(vec2 originalValue){    // 二通道变四通道
    // fixme:originalValue.y是平方均值，所以对应范围应该是0-绝对值的最大值的平方
    // todo:这一步sum_z是平方均值，存在二通道应该也不够用，感觉像气压那种超过65535了，得改
    // fixme:可以把平方根的值存到通道
    vec2 originalValueRate=vec2(between(u_lon_lat_min_max[0],u_lon_lat_min_max[1],originalValue[0]),between(0.0,u_value_min_max[1]-u_value_min_max[0],pow(originalValue[1],0.5)));
    vec2 val1=floor(originalValueRate * 65535.0 / 256.0);
    vec2 val2=originalValueRate*65535.0-val1*256.0;
    return vec4(val1/255.0,val2/255.0);
}
vec2 unpack(vec4 originalValue){  // 四通道变二通道
    float distanceRate = (originalValue.x*256.0*255.0+originalValue.z*255.0)/65535.0; 
    float valueRate = (originalValue.y*256.0*255.0+originalValue.w*255.0)/65535.0; 
    return vec2(distanceRate*(u_lon_lat_min_max.y-u_lon_lat_min_max.x)+u_lon_lat_min_max.x,
                valueRate*((u_value_min_max.y-u_value_min_max.x)-0.0)+0.0);
}
void main(){ 
    float sum_z=0.0;    // 满足精简样本条件的差值平方
    float n_h=0.0;      // 满足精简样本条件的距离
    float i=floor(v_tex.x*u_frame_simplified_distance_value_size[0]);     // 第几个精简样本
    float max_distance=(i + 1.0) * u_cut_off / u_frame_simplified_distance_value_size[0];   // 当前精简样本的最大距离
    // todo:没有const 
    for (int j = 0; j < ${this.params ? this.params.u_frame_distance_value_size : 1}; j++) {
        for (int k = 0; k < ${this.params ? this.params.u_frame_distance_value_size : 1}; k++) {    // fixme:(改了)直接写k = j + 1 不行
            if(k >= j + 1){
                vec4 diatance_value=texture2D(u_frame_distance_value,vec2(float(k)/u_frame_distance_value_size[0],float(j)/u_frame_distance_value_size[1]));
                vec2 actual_distance_value=unpack(diatance_value);
                if (actual_distance_value.x <= max_distance) {
                    sum_z += pow(actual_distance_value.y, 2.0);
                    n_h++;
                }
            }
        }
    }
    vec2 simplified_distance_value;
    if (n_h!=0.0) {
        simplified_distance_value=vec2(max_distance,sum_z / n_h);
    }else{
        simplified_distance_value=vec2(max_distance,0.0);
    }
    gl_FragColor = pack(simplified_distance_value);
}`;
        // endregion

        // region fixme:(3)
        this.vert_matrix_K = `            // (1441*721+1)*(1441*721+1)
attribute vec2 a_position;
varying vec2 v_tex;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_tex = (a_position+1.0)/2.0;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

        this.frag_matrix_K = ` 
precision highp float;
uniform sampler2D u_frame_distance_value;   //  纹理单元==>存两两距离和值的矩阵=2
uniform vec2 u_frame_distance_value_size;   // 帧缓冲区宽度、高度=9,9
uniform vec2 u_frame_matrix_K_size;      // 帧缓冲区宽度、高度  (u_frame_distance_value_size.x+1)*(u_frame_distance_value_size.y+1)=10,10
uniform vec3 u_fitting_params;          // 拟合曲线参数 (nugget,range,sill)=(块金,变程,基台)
uniform vec2 u_lon_lat_min_max; // 经纬度距离的最小最大，(0,180*1.414)=0,254.55844
uniform vec2 u_value_min_max;   // 值的最小最大，如果是单通道就是(u_min[0],u_max[0]),双通道就是(0,max(length(max(u_min[0],u_max[0]),max(u_min[1],u_max[1]))))=218.5314,313.7214660
varying vec2 v_tex;
const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
float spherical(float h){   
    if (h > u_fitting_params[1]) {
        return u_fitting_params[2];
    }else if (h <= u_fitting_params[1] && h > 0.0) {
        return u_fitting_params[0] + (u_fitting_params[2] - u_fitting_params[0]) * ((3.0 * h) / (2.0 * u_fitting_params[1]) - pow(h, 3.0) / (2.0 * pow(u_fitting_params[1], 3.0)));
    }else {
        return 0.0;
    }
}  
float between(float min,float max,float val){
    return (val-min)/(max-min);
}    
vec4 pack(vec2 originalValue){    // 二通道变四通道
    vec2 originalValueRate=vec2(between(0.0,pow(u_fitting_params[2],0.5),pow(originalValue[0],0.5)),0.0);
    vec2 val1=floor(originalValueRate * 65535.0 / 256.0);
    vec2 val2=originalValueRate*65535.0-val1*256.0;
    return vec4(val1/255.0,val2/255.0);
}
vec2 unpack(vec4 originalValue){  // 四通道变二通道
    float distanceRate = (originalValue.x*256.0*255.0+originalValue.z*255.0)/65535.0; 
    float valueRate = (originalValue.y*256.0*255.0+originalValue.w*255.0)/65535.0; 
    return vec2(distanceRate*(u_lon_lat_min_max.y-u_lon_lat_min_max.x)+u_lon_lat_min_max.x,
                valueRate*((u_value_min_max.y-u_value_min_max.x)-0.0)+0.0);
}
void main(){
    // 当前点的片元索引
    vec2 point_index_self=floor(v_tex*u_frame_matrix_K_size);   
    // 矩阵K的各个元素
    float k=0.0;
    if(point_index_self[1]==u_frame_matrix_K_size[1]-1.0 && point_index_self[0]!=u_frame_matrix_K_size[0]-1.0){
        k=1.0;
    }else if(point_index_self[1]!=u_frame_matrix_K_size[1]-1.0 && point_index_self[0]==u_frame_matrix_K_size[0]-1.0){
        k=1.0;
    }else if(point_index_self[1]==u_frame_matrix_K_size[1]-1.0 && point_index_self[0]==u_frame_matrix_K_size[0]-1.0){
        k=0.0;
    }else{
        vec4 diatance_value=texture2D(u_frame_distance_value,point_index_self/u_frame_distance_value_size);
        float distance = unpack(diatance_value).x; 
        k=spherical(distance);
    }
//    gl_FragColor = pack(vec2(k,0.0));
    vec4 k_invert_pack = fract(between(0.0,u_fitting_params[2],k) * bitShift);
    k_invert_pack -= k_invert_pack.gbaa * bitMask; 
    gl_FragColor =k_invert_pack;
}`;
        //endregion

        // region fixme:(4)
        this.vert_invert_matrix_K = `            // (1441*721+1)*(1441*721+1)
attribute vec2 a_position;
varying vec2 v_tex;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_tex = (a_position+1.0)/2.0;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

        this.frag_invert_matrix_K = `   
precision highp float;
uniform sampler2D u_frame_matrix_K;   //  纹理单元==>矩阵K=4
uniform vec2 u_frame_matrix_K_size;   // 帧缓冲区宽度、高度==>矩阵K=16,16
uniform vec3 u_fitting_params;          // 拟合曲线参数 (nugget,range,sill)=(块金,变程,基台)
uniform vec2 u_min_max;                 // 矩阵K中所有元素的最大最小值，一般就是0-基台值
varying vec2 v_tex;
const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
float between(float min,float max,float val){
    return (val-min)/(max-min); 
}      
//vec2 unpack(vec4 originalValue){  // 四通道变二通道
//    float kRate = (originalValue.x*256.0*255.0+originalValue.z*255.0)/65535.0; 
//    return vec2(kRate*(pow(u_fitting_params[2],0.5)-0.0)+0.0,0.0);
//}
//float getKElementValue(int row,int column){
//    vec4 k_element=texture2D(u_frame_matrix_K,vec2(column,row)/u_frame_matrix_K_size);
//    return pow(unpack(k_element).x,2.0);
//}
float unpack(vec4 originalValue){  // 四通道变一通道
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float kRate = dot(originalValue, bitShift); 
    return kRate*(u_fitting_params[2]-0.0)+0.0;
}
float getKElementValue(int row,int column){
    vec4 k_element=texture2D(u_frame_matrix_K,vec2(column,row)/u_frame_matrix_K_size);
    return unpack(k_element);
}
void main(){
    // todo:没有const
    const int n=int(${this.params ? this.params.u_frame_distance_value_size + 1 : 1});
    const int m=n;
    float a[n*n],/*b[n*n],*/ipiv[n],big, dum, pivinv, temp;
    int icol,irow,indxc[n],indxr[n]; 
    for(int i=0;i<n;i++){
        for(int j=0;j<n;j++){
            a[i*n+j]=getKElementValue(i,j);
        }
    } 
//    for (int i = 0; i < n; i++) {
//        for (int j = 0; j < n; j++) {
//            if (i == j) {
//                b[i*n+j] = 1.0;
//            } else {
//                b[i*n+j] = 0.0;
//            }
//        }
//    }
    for (int j = 0; j < n; j++) {
        ipiv[j] = 0.0;
    }
    for (int i = 0; i < n; i++) {
        // 1、全选主元
        // 从第 k 行、第 k 列开始的右下角子阵中选取绝对值最大的元素，并记住次元素所在的行号和列号，在通过行交换和列交换将它交换到主元素位置上。这一步称为全选主元。
        big = 0.0;
        for (int j = 0; j < n; j++) {
            if (ipiv[j] != 1.0) {
                for (int k = 0; k < n; k++) {
                    if (ipiv[k] == 0.0) {
                        if (abs(a[j*n+k]) >= big) {
                            big = abs(a[j*n+k]);
                            irow = j;
                            icol = k;
                        }
                    }
                }
            }
        }
        // fixme:(改了)等价于++(ipiv[icol]);因为数组中的索引必须是const或者uniform，而这里的是变量，所以加了c_icol和c_irow，把后面的irow和icol都变成了c_irow和c_icol
        for(int c_irow=0;c_irow<n;c_irow++){
            if(c_irow==irow){
                for(int c_icol=0;c_icol<n;c_icol++){           
                    if(c_icol==icol){
                        ++(ipiv[c_icol]); 
                        if (c_irow != c_icol) {
                            for (int l = 0; l < n; l++) {
                                temp = a[c_irow*n+l];
                                a[c_irow*n+l] = a[c_icol*n+l];
                                a[c_icol*n+l] = temp;
                            }
//                            for (int l = 0; l < m; l++) {
//                                temp = b[c_irow*n+l];
//                                b[c_irow*n+l] = b[c_icol*n+l];
//                                b[c_icol*n+l] = temp;
//                            }
                        }
                        indxr[i] = c_irow;
                        indxc[i] = c_icol;
                        // 2、m(k, k) = 1 / m(k, k)
                        if (a[c_icol*n+c_icol] == 0.0) {  // Singular matrix 
                            break;
                        }
                        pivinv = 1.0 / a[c_icol*n+c_icol];
                
                        // 3、m(k, j) = m(k, j) * m(k, k)，j = 0, 1, ..., n-1；j != k
                        a[c_icol*n+c_icol] = 1.0;
                        for (int l = 0; l < n; l++) {
                            a[c_icol*n+l] *= pivinv;
                        }
//                        for (int l = 0; l < m; l++) {
//                            b[c_icol*n+l] *= pivinv;
//                        }
                
                        // 4、m(i, j) = m(i, j) - m(i, k) * m(k, j)，i, j = 0, 1, ..., n-1；i, j != k
                        for (int ll = 0; ll < n; ll++) {
                            if (ll != c_icol) {
                                dum = a[ll*n+c_icol];
                                a[ll*n+c_icol] = 0.0;
                                for (int l = 0; l < n; l++) {
                                    a[ll*n+l] -= a[c_icol*n+l] * dum;
                                }
//                                for (int l = 0; l < m; l++) {
//                                    b[ll*n+l] -= b[c_icol*n+l] * dum;
//                                }
                            }
                        }
                        break;
                    }
                }  
            }
        }
    }

    // 5、m(i, k) = -m(i, k) * m(k, k)，i = 0, 1, ..., n-1；i != k
    for (int l = (n - 1); l >= 0; l--) {
        if (indxr[l] != indxc[l]) {
            for (int k = 0; k < n; k++) {
                // fixme:(改了)因为数组中的索引必须是const或者uniform，而这里的是变量，所以加了c_indxr和c_indxc，把后面的indxr和indxc都变成了c_indxr和c_indxc
//                temp = a[k*n+indxr[l]];
//                a[k*n+indxr[l]] = a[k*n+indxc[l]];
//                a[k*n+indxc[l]] = temp;
                for(int c_indxr=0;c_indxr<n;c_indxr++){
                    if(c_indxr==indxr[l]){
                        for(int c_indxc=0;c_indxc<n;c_indxc++){
                            if(c_indxc==indxc[l]){
                                temp = a[k*n+c_indxr];
                                a[k*n+c_indxr] = a[k*n+c_indxc];
                                a[k*n+c_indxc] = temp;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    vec2 column_row=floor(v_tex*u_frame_matrix_K_size);
    // fixme:(改了)等价于float k_invert=a[int(column_row.y)*n+int(column_row.x)];因为数组中的索引必须是const或者uniform，而这里的是变量
//    float k_invert=a[int(column_row.y)*n+int(column_row.x)];
    float k_invert;
    for(int c_column_row_i=0;c_column_row_i < n;c_column_row_i++){
        if(c_column_row_i==int(column_row.x)){
            for(int c_column_row_j=0;c_column_row_j<n;c_column_row_j++){
                if(c_column_row_j==int(column_row.y)){
                    k_invert=a[c_column_row_j*n+c_column_row_i];
                    break;
                }
            }
        }
    }
    // todo:这个最小最大值不确定，暂以2*基台的值为正负最大最小值
    // todo:pow函数的第一个参数不能是负的？？？其余的pow也得检查一下
//    vec4 k_invert_pack = fract(between(-1.0*pow(u_fitting_params[2],1.0/3.0),1.0*pow(u_fitting_params[2],1.0/3.0),pow(k_invert,1.0/3.0)) * bitShift); 
    vec4 k_invert_pack = fract(between(-0.7,0.7,pow(k_invert,1.0/3.0)) * bitShift);
    k_invert_pack -= k_invert_pack.gbaa * bitMask; 
    gl_FragColor =k_invert_pack;
}`;
        // endregion

        // region fixme:(5)
        this.vert = `
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
    gl_Position = vec4(a_position,0,1);
    v_pos = a_position;     // 纹理坐标系和WebGL坐标系不一样，但是还是传进来了WebGL坐标点
}`;

        this.frag = `
precision highp float;
const float PREC = 255.0/250.0;
uniform mat4 u_matrix_invert;
uniform vec3 u_lon;         // 经度最小值、最大值、步长=-180,180,0.25
uniform vec3 u_lat;         // 纬度最小值、最大值、步长=-90,90,0.25
uniform sampler2D u_data;   //  图片纹理单元=1
uniform sampler2D u_color;  //  色卡纹理单元=0
uniform vec3 u_coord;
uniform vec2 u_min;         // 各通道像素最小值=218.531463,0
uniform vec2 u_max;         // 各通道像素最大值=313.7214660,0
uniform vec2 u_cmm;         // 色卡横坐标最小最大,横坐标等同于gfs等数据的大小=213.3,342.4
uniform float u_type;       // todo：用了几个通道？？=1.0
uniform float u_opacity;    // 1.0

uniform vec2 u_data_size;   // 图片大小(宽度、高度)=1441,721
uniform vec2 u_data_scale;   // 图片缩放倍数(宽度、高度)   =700,360
uniform sampler2D u_invert_matrix_K;    // 纹理单元：逆矩阵 =5
uniform vec2 u_invert_matrix_K_size;    // 逆矩阵大小（宽度、高度）=16,16
uniform vec3 u_fitting_params;          // 拟合曲线参数 (nugget,range,sill)=(块金,变程,基台)

varying vec2 v_pos;         // todo：传进来的WebGL坐标系的点，要在main()进行转换？？
bool isVector=!(u_min[1]==0.0&&u_max[1]==0.0);       // fixme：是否是双通道
float between(float min,float max,float val){
    return (val-min)/(max-min); 
}        
vec2 tilePos(vec2 pos){     
    vec4 p0 = u_matrix_invert*vec4(pos,0,1);
    vec4 p1 = u_matrix_invert*vec4(pos,1,1);    
    p0 = p0/p0.w;
    p1 = p1/p1.w;
    float t = p0.z==p1.z?0.0:(0.0 - p0.z)/(p1.z - p0.z);
    return mix(p0,p1,t).xy;     // todo:线性混合
}
vec2 coord(vec2 pos){   // pos:经纬度
    return vec2(between(u_lon[0],u_lon[1],mod(pos.x+180.0,360.0)-180.0),between(u_lat[0],u_lat[1],pos.y));
}
vec2 geoPos(vec2 pos){
    float lon = mix(-180.0,180.0,pos.x);
    float lat = degrees(atan((exp(180.0*radians(1.0-2.0*pos.y))-exp(-180.0*radians(1.0-2.0*pos.y)))/2.0));
    return vec2(lon,lat);
}
bool valid(vec2 pos){ 
    return pos.x>=0.0&&pos.x<=1.0&&pos.y>=0.0&&pos.y<=1.0;
}
float spherical(float h){ 
    if (h > u_fitting_params[1]) {
        return u_fitting_params[2];
    }else if (h <= u_fitting_params[1] && h > 0.0) {
        return u_fitting_params[0] + (u_fitting_params[2] - u_fitting_params[0]) * ((3.0 * h) / (2.0 * u_fitting_params[1]) - pow(h, 3.0) / (2.0 * pow(u_fitting_params[1], 3.0)));
    }else {
        return 0.0;
    }
} 
float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift); 
    // todo:这里得改，跟上个帧缓冲区对应
//    return depth*(2.0*u_fitting_params[2]-(-2.0*u_fitting_params[2]))+(-2.0*u_fitting_params[2]);
return depth*1.4-0.7;
}  
float lonDistance(float lon1,float lon2){
    lon1=mod(lon1+180.0,360.0)-180.0;
    lon2=mod(lon2+180.0,360.0)-180.0;
    float distance=0.0;
    if(abs(lon1-lon2)<=180.0){
        distance=abs(lon1-lon2);
    }else{
        if(lon1<lon2){
            distance=abs(lon1+360.0-lon2);
        }else{
            distance=abs(lon2+360.0-lon1);
        }
    }
    return distance;
}
void main(){
    vec2 tp = tilePos(v_pos); 
    if(tp.y<1.0&&tp.y>0.0){
        vec2 pos=geoPos(tp);    // 经纬度
        vec2 c = coord(pos);     // 获取图片的纹理坐标
        if(valid(c)){
        // todo：这个for循环不是const常量
            const int n=int(${this.params ? this.params.u_frame_distance_value_size + 1 : 1});
            float D[n];  // 矩阵D
            D[n-1]=1.0;     // 最后一个值是1.0
            for(int i=0;i<int(${this.meteo ? this.meteo.height : 1});i+=int(${this.u_data_scale ? this.u_data_scale[1] : 1})){
                for(int j=0;j<int(${this.meteo ? this.meteo.width : 1});j+=int(${this.u_data_scale ? this.u_data_scale[0] : 1})){
                    vec2 lon_lat=vec2(u_lon[0]+u_lon[2]*float(j),u_lat[0]+u_lat[2]*float(i));
                    // fixme:(改了)因为数组中的索引必须是const或者uniform，而这里的是变量
//                    D[i/int(u_data_scale.y)*int(floor((u_data_size.x-1.0)/u_data_scale.x)+1.0)+j/int(u_data_scale.x)]=length(vec2(lonDistance(lon_lat[0],pos[0]),lon_lat[1]-pos[1]));
                    D[i/int(${this.u_data_scale ? this.u_data_scale[1] : 1})*int(floor((float(${this.meteo ? this.meteo.width : 1})-1.0)/float(${this.u_data_scale ? this.u_data_scale[0] : 1}))+1.0)+j/int(${this.u_data_scale ? this.u_data_scale[0] : 1})]=length(vec2(lonDistance(lon_lat[0],pos[0]),lon_lat[1]-pos[1]));
                }
            }
            
            float sigema[n];    // 向量sigema
            for(int i=0;i<n;i++){
                float sum_sigema=0.0;
                for(int j=0;j<n;j++){
                    vec4 k_element=texture2D(u_invert_matrix_K,vec2(j,i)/u_invert_matrix_K_size);
                    float k_element_value=unpackDepth(k_element);
                    sum_sigema+=k_element_value*D[j];
                }
                sigema[i]=sum_sigema;
            } 
            vec2 eachValue;
            float sumSegima;
            for(int i=0;i<n-1;i++){
                vec2 sample_point=vec2(fract(float(i)*u_data_scale.x/u_data_size.x),floor(float(i)*u_data_scale.x/u_data_size.x)*u_data_scale.y/u_data_size.y);
                eachValue+=mix(u_min,u_max,texture2D(u_data, sample_point).xy*PREC)*sigema[i];
                sumSegima+=sigema[i];
            }
            float val;
            // fixme:如果是单通道，就得判断是正是负，如果是双通道，意味着是矢量，就不用管正负了
            if(isVector){       // fixme：双通道
                val = length(eachValue);
//                val = length(eachValue/sumSegima);
            }else{      // fixme：单通道
                val = eachValue[0];
//                val = eachValue[0]/sumSegima;
            }
            float colorPos = between(u_cmm[0],u_cmm[1],val);    // 通过色卡横坐标val得到色卡纹理坐标
            gl_FragColor = texture2D(u_color,vec2(colorPos,1.0))*u_opacity;     //vec4(color.rgb,color.a*u_opacity);//texture2D(u_color,vec2(colorPos,1.0));
        }
    }
}`;
        // endregion


        // console.log(this.frag_distance_value);
        // console.log(this.frag_simplified_distance_value);
        // console.log(this.frag_matrix_K);
        // console.log(this.frag_invert_matrix_K);
        // console.log(this.frag);
    }

    _init() {
        const map = this.map;
        const div = map.getCanvasContainer();
        const mapCanvas = map.getCanvas();
        const canvas = this.canvas = document.createElement("canvas");
        this.gl = canvas.getContext("webgl", {antialiasing: false});    // todo:???
        canvas.style.cssText = mapCanvas.style.cssText;
        canvas.style.pointerEvents = 'none';
        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        div.appendChild(canvas);
        map.on('resize', (e) => {
            const mc = e.target.getCanvas();
            canvas.style.width = mc.style.width;
            canvas.style.height = mc.style.height;
            canvas.style.pointerEvents = mc.style.pointerEvents;
            canvas.width = mc.width;
            canvas.height = mc.height;
            this._render();
        });
        map.on('move', (e) => {
            this._render();
        });
        map.on('load', () => {
            this._render();
        });
    }

    _initGL() {
        const gl = this.gl;

        const vertShaderDistanceValue = createShader(gl, gl.VERTEX_SHADER, this.vert_distance_value);
        const fragShaderDistanceValue = createShader(gl, gl.FRAGMENT_SHADER, this.frag_distance_value);
        this.programDistanceValue = createProgram(gl, vertShaderDistanceValue, fragShaderDistanceValue);

        const vertShaderSimplifiedDistanceValue = createShader(gl, gl.VERTEX_SHADER, this.vert_simplified_distance_value);
        const fragShaderSimplifiedDistanceValue = createShader(gl, gl.FRAGMENT_SHADER, this.frag_simplified_distance_value);
        this.programSimplifiedDistanceValue = createProgram(gl, vertShaderSimplifiedDistanceValue, fragShaderSimplifiedDistanceValue);

        const vertShaderMatrixK = createShader(gl, gl.VERTEX_SHADER, this.vert_matrix_K);
        const fragShaderMatrixK = createShader(gl, gl.FRAGMENT_SHADER, this.frag_matrix_K);
        this.programMatrix_K = createProgram(gl, vertShaderMatrixK, fragShaderMatrixK);

        const vertShaderInvertMatrixK = createShader(gl, gl.VERTEX_SHADER, this.vert_invert_matrix_K);
        const fragShaderInvertMatrixK = createShader(gl, gl.FRAGMENT_SHADER, this.frag_invert_matrix_K);
        this.programInvertMatrixK = createProgram(gl, vertShaderInvertMatrixK, fragShaderInvertMatrixK);

        const vertShader = createShader(gl, gl.VERTEX_SHADER, this.vert);
        const fragShader = createShader(gl, gl.FRAGMENT_SHADER, this.frag);
        this.program = createProgram(gl, vertShader, fragShader);

        //初始化静态信息
        this.posBuffer = createBuffer(gl, new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]));
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.program.u_opacity, 1.0);
    }

    initFrameBuffer() {
        this.u_data_scale = [700, 360]; // 宽度、高度
        this.params = {
            u_frame_distance_value_size: (Math.floor((this.meteo.width - 1.0) / this.u_data_scale[0]) + 1.0) * (Math.floor((this.meteo.height - 1.0) / this.u_data_scale[1]) + 1.0),
            u_frame_simplified_distance_value_size: [10, 1],
        };
        const fboDistanceValue = this.fboDistanceValue = this.initFramebufferObject(this.gl, this.params.u_frame_distance_value_size, this.params.u_frame_distance_value_size);
        if (!fboDistanceValue) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }

        const fboSimplifiedDistanceValue = this.fboSimplifiedDistanceValue = this.initFramebufferObject(this.gl, this.params.u_frame_simplified_distance_value_size[0], this.params.u_frame_simplified_distance_value_size[1]);
        if (!fboSimplifiedDistanceValue) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }

        const fboMatrixK = this.fboMatrixK = this.initFramebufferObject(this.gl, this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1);
        if (!fboMatrixK) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }

        const fboInvertMatrixK = this.fboInvertMatrixK = this.initFramebufferObject(this.gl, this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1);
        if (!fboInvertMatrixK) {
            console.log('Failed to intialize the framebuffer object (FBO)');
            return;
        }
    }

    show() {
        this.visiable = true;
        this._render();
    }

    setColor(color) {
        this.color = color;
        const color2D = createColorRamp(color); // 画色卡
        this.colorTexture = createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR);
    }

    load(url, vector) {
        return MeteoImage.load(url).then((meteo) => {
            this.meteo = meteo;
            this.initFrameBuffer();
            // 获得图片后再生成顶点着色器、片元着色器，从而生成着色器对象  每次都重新生成这些没什么影响
            this.initShader();
            this._initGL();
            // 形成数据纹理
            this.dataTexture=createTexture(this.gl, this.gl.LINEAR, meteo.data, meteo.width, meteo.height, TEXTURE_INDEX_DATA);
            // fixme:(1)
            this.gl.useProgram(this.programDistanceValue);
            this.gl.uniform3fv(this.programDistanceValue.u_lon, meteo.lon);
            this.gl.uniform3fv(this.programDistanceValue.u_lat, meteo.lat);
            this.gl.uniform2fv(this.programDistanceValue.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.programDistanceValue.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);
            this.gl.uniform2fv(this.programDistanceValue.u_lon_lat_min_max, [0, 180.0 * (2 ** 0.5)]);
            if (vector) {     // todo：是否双通道，放到项目中要改
                this.u_value_min_max = [0, Math.hypot(Math.max(Math.abs(meteo.minAndMax[0][0]), Math.abs(meteo.minAndMax[0][1])), Math.max(Math.abs(meteo.minAndMax[1][0]), Math.abs(meteo.minAndMax[1][1])))];
                this.gl.uniform2fv(this.programDistanceValue.u_value_min_max, this.u_value_min_max);
            } else {
                this.u_value_min_max = [meteo.minAndMax[0][0], meteo.minAndMax[0][1]];
                this.gl.uniform2fv(this.programDistanceValue.u_value_min_max, this.u_value_min_max);
            }
            this.gl.uniform1i(this.programDistanceValue.u_data, TEXTURE_INDEX_DATA);
            this.gl.uniform2fv(this.programDistanceValue.u_data_size, [meteo.width, meteo.height]);
            this.gl.uniform2fv(this.programDistanceValue.u_data_scale, this.u_data_scale);
            this.gl.uniform2fv(this.programDistanceValue.u_frame_distance_value_size, [this.params.u_frame_distance_value_size, this.params.u_frame_distance_value_size]);

            // fixme:(2)
            this.gl.useProgram(this.programSimplifiedDistanceValue);
            this.gl.uniform1i(this.programSimplifiedDistanceValue.u_frame_distance_value, TEXTURE_FRMAE_DISTANCE_VALUE);
            this.gl.uniform2fv(this.programSimplifiedDistanceValue.u_frame_distance_value_size, [this.params.u_frame_distance_value_size, this.params.u_frame_distance_value_size]);
            this.gl.uniform2fv(this.programSimplifiedDistanceValue.u_frame_simplified_distance_value_size, this.params.u_frame_simplified_distance_value_size);
            // todo:这个最大最小距离应该不对，也许要考虑180和-180是重合的
            // let cutoff = Math.hypot(meteo.lon[1] - meteo.lon[0], meteo.lat[1] - meteo.lat[0]) / 3;
            // todo：不知道为什么除以3，也许就1/3范围内的数据有效吧，先不除以3，测试效果，以后再改回来
            // let cutoff = 180.0 * (2 ** 0.5) / 3;
            let cutoff = 180.0 * (2 ** 0.5);
            this.gl.uniform1f(this.programSimplifiedDistanceValue.u_cut_off, cutoff);
            this.gl.uniform2fv(this.programSimplifiedDistanceValue.u_lon_lat_min_max, [0, 180.0 * (2 ** 0.5)]);
            this.gl.uniform2fv(this.programSimplifiedDistanceValue.u_value_min_max, this.u_value_min_max);

            // fixme:(3)
            this.gl.useProgram(this.programMatrix_K);
            this.gl.uniform1i(this.programMatrix_K.u_frame_distance_value, TEXTURE_FRMAE_DISTANCE_VALUE);
            this.gl.uniform2fv(this.programMatrix_K.u_frame_distance_value_size, [this.params.u_frame_distance_value_size, this.params.u_frame_distance_value_size]);
            this.gl.uniform2fv(this.programMatrix_K.u_frame_matrix_K_size, [this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1]);
            this.gl.uniform2fv(this.programMatrix_K.u_lon_lat_min_max, [0, 180.0 * (2 ** 0.5)]);
            this.gl.uniform2fv(this.programMatrix_K.u_value_min_max, this.u_value_min_max);

            // fixme:(4)
            this.gl.useProgram(this.programInvertMatrixK);
            this.gl.uniform1i(this.programInvertMatrixK.u_frame_matrix_K, TEXTURE_FRMAE_MATRIX_K);
            this.gl.uniform2fv(this.programInvertMatrixK.u_frame_matrix_K_size, [this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1]);

            // fixme:(5)
            this.gl.useProgram(this.program);
            this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_INDEX_COLOR);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTexture);
            this.gl.uniform1i(this.program.u_color, TEXTURE_INDEX_COLOR);
            this.gl.uniform2fv(this.program.u_cmm, new Float32Array([this.color[0][0], this.color[this.color.length - 1][0]]));
            this.gl.activeTexture(this.gl.TEXTURE0+TEXTURE_INDEX_DATA);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.dataTexture);
            this.gl.uniform1i(this.program.u_data, TEXTURE_INDEX_DATA);
            this.gl.uniform3fv(this.program.u_lon, meteo.lon);
            this.gl.uniform3fv(this.program.u_lat, meteo.lat);
            this.gl.uniform2fv(this.program.u_min, [meteo.minAndMax[0][0], vector ? meteo.minAndMax[1][0] : 0]);
            this.gl.uniform2fv(this.program.u_max, [meteo.minAndMax[0][1], vector ? meteo.minAndMax[1][1] : 0]);
            if (!vector) {
                this.gl.uniform1f(this.program.u_type, 1.0);
            } else {
                this.gl.uniform1f(this.program.u_type, 2.0);
            }
            this.gl.uniform2fv(this.program.u_data_size, [meteo.width, meteo.height]);
            this.gl.uniform2fv(this.program.u_data_scale, this.u_data_scale);
            this.gl.uniform1i(this.program.u_invert_matrix_K, TEXTURE_FRMAE_INVERT_MATRIX_K);
            this.gl.uniform2fv(this.program.u_invert_matrix_K_size, [this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1]);

            this.krigingInterpolation();
            this._render();
        });
    }

    krigingInterpolation() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;

        // fixme:(1)把样本中两点的距离和差值存到四通道
        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRMAE_DISTANCE_VALUE); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboDistanceValue.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboDistanceValue);
        gl.viewport(0, 0, this.params.u_frame_distance_value_size, this.params.u_frame_distance_value_size);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programDistanceValue);
        bindAttribute(gl, this.posBuffer, this.programDistanceValue.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.pexelsTest1 = new Uint8Array(this.params.u_frame_distance_value_size * this.params.u_frame_distance_value_size * 4);
        this.gl.readPixels(0, 0, this.params.u_frame_distance_value_size, this.params.u_frame_distance_value_size, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pexelsTest1);
        console.log(this.pexelsTest1);
        // fixme:(2)精简样本
        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRMAE_SIMPLIFIED_DISTANCE_VALUE); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboSimplifiedDistanceValue.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboSimplifiedDistanceValue);
        gl.viewport(0, 0, this.params.u_frame_simplified_distance_value_size[0], this.params.u_frame_simplified_distance_value_size[1]);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programSimplifiedDistanceValue);
        bindAttribute(gl, this.posBuffer, this.programSimplifiedDistanceValue.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        // fixme:取像素点算模型拟合参数
        this.pixelsSimplifiedDistanceValue = new Uint8Array(this.params.u_frame_simplified_distance_value_size[0] * this.params.u_frame_simplified_distance_value_size[1] * 4);
        this.gl.readPixels(0, 0, this.params.u_frame_simplified_distance_value_size[0], this.params.u_frame_simplified_distance_value_size[1], this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pixelsSimplifiedDistanceValue);
        console.log(this.pixelsSimplifiedDistanceValue);
        this.model = {
            distance: [],
            semivariance: [],
            nugget: 0,   //coef[0][0]; /* Intercept */     // 块金
            range: 0,  // 变程
            sill: 0,  //coef[0][1] * this.canvas.model.range;   // fixme:基台，不是偏基台值，这里原先写错了，写的偏基台值
        };
        for (let i = 0; i < this.pixelsSimplifiedDistanceValue.length; i += 4) {
            let simplifiedDistanceValueRate = [(this.pixelsSimplifiedDistanceValue[i] * 256.0 + this.pixelsSimplifiedDistanceValue[i + 2]) / 65535.0, (this.pixelsSimplifiedDistanceValue[i + 1] * 256.0 + this.pixelsSimplifiedDistanceValue[i + 3]) / 65535.0];
            this.model.distance.push(simplifiedDistanceValueRate[0] * (180.0 * (2 ** 0.5)));
            this.model.semivariance.push(Math.pow(simplifiedDistanceValueRate[1] * (this.u_value_min_max[1] - this.u_value_min_max[0]-0.0) + 0.0, 2.0));
        }
        // todo：这里用的是理论模型参数，以后得改
        this.model.range = Math.max(...this.model.distance);
        this.model.sill = Math.max(...this.model.semivariance);
        // fixme:(3)矩阵K
        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRMAE_MATRIX_K); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboMatrixK.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboMatrixK);
        gl.viewport(0, 0, this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programMatrix_K);
        gl.uniform3fv(this.programMatrix_K.u_fitting_params, [this.model.nugget, this.model.range, this.model.sill]);
        bindAttribute(gl, this.posBuffer, this.programMatrix_K.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.pexelsTest3 = new Uint8Array((this.params.u_frame_distance_value_size+1) * (this.params.u_frame_distance_value_size+1) * 4);
        this.gl.readPixels(0, 0, (this.params.u_frame_distance_value_size+1), (this.params.u_frame_distance_value_size+1), this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pexelsTest3);
        console.log(this.pexelsTest3);
        let k_matrix=[];
        for(let j=0;j<this.params.u_frame_distance_value_size+1;j++){
            for(let i=0;i<this.params.u_frame_distance_value_size+1;i++){
                let index=(j*(this.params.u_frame_distance_value_size+1)+i)*4;
                let kRate=(this.pexelsTest3[index]+this.pexelsTest3[index+1]/256+this.pexelsTest3[index+2]/256/256+this.pexelsTest3[index+3]/256/256/256)/255;
                k_matrix.push(kRate*this.model.sill);
            }
        }
        console.log(k_matrix);
        let k_inverse_matrix=R_solve(k_matrix);
        console.log(k_inverse_matrix);
        // fixme:(4)K的逆矩阵
        this.gl.activeTexture(this.gl.TEXTURE0 + TEXTURE_FRMAE_INVERT_MATRIX_K); // Set a texture object to the texture unit
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboInvertMatrixK.texture); // fixme:这里放的是帧缓冲区的纹理图像
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboInvertMatrixK);
        gl.viewport(0, 0, this.params.u_frame_distance_value_size + 1, this.params.u_frame_distance_value_size + 1);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.programInvertMatrixK);
        gl.uniform3fv(this.programInvertMatrixK.u_fitting_params, [this.model.nugget, this.model.range, this.model.sill]);
        gl.uniform2fv(this.programInvertMatrixK.u_min_max, [0, this.model.sill]);
        bindAttribute(gl, this.posBuffer, this.programInvertMatrixK.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.pexelsTest4 = new Uint8Array((this.params.u_frame_distance_value_size+1) * (this.params.u_frame_distance_value_size+1) * 4);
        this.gl.readPixels(0, 0, (this.params.u_frame_distance_value_size+1), (this.params.u_frame_distance_value_size+1), this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pexelsTest4);
        console.log(this.pexelsTest4);
    }

    _render() {
        if (!this.meteo) return;
        if (!this.visiable) return;
        const gl = this.gl;

        // fixme:(5)热力图
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // fixme:gl.viewport(x, y, width, height)==>用来设置视口，即指定从标准设备到窗口坐标的x、y仿射变换
        // x：GLint，用来设定视口的左下角水平坐标。默认值：0。
        // y：GLint，用来设定视口的左下角垂直坐标。默认值：0。
        // width：非负数Glsizei，用来设定视口的宽度。默认值：canvas的宽度。
        // height：非负数Glsizei，用来设定视口的高度。默认值：canvas的高度。
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.program.u_matrix_invert, false, this._matrixInvert());
        gl.uniform3fv(this.program.u_fitting_params, [this.model.nugget, this.model.range, this.model.sill]);
        bindAttribute(gl, this.posBuffer, this.program.a_position, 2);
        gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.pexelsTest5 = new Uint8Array(this.gl.canvas.width * this.gl.canvas.height * 4);
        this.gl.readPixels(0, 0, this.gl.canvas.width, this.gl.canvas.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.pexelsTest5);
        console.log(this.pexelsTest5);
    }

    _matrixInvert() {
        // 逆矩阵
        return mat4.invert(new Float32Array(16), this._matrix());
    }

    _matrix() { // mapbox坐标
        const scale = this.map.transform.worldSize;
        const matrix = mat4.identity(new Float32Array(16)); // 定义为单元阵
        mat4.scale(matrix, matrix, [scale, scale, 1]);
        mat4.multiply(matrix, this.map.transform.projMatrix, matrix);
        return matrix;
    }

    hide() {
        this.visiable = false;
        this.gl.clearColor(0, 0, 0, 0); //把清理缓冲区的值设置为黑色
        this.gl.clear(this.gl.COLOR_BUFFER_BIT); //调用clear方法，传入参数gl.COLOR_BUFFER_BIT告诉WebGL使用之前定义的颜色来填充相应区域。
    }

    setZIndex(z) {
        this.canvas.style.zIndex = z;
    }

    setOpacity(opacity) {
        this.gl.uniform1f(this.program.u_opacity, opacity);
    }

    initFramebufferObject(gl, textureWidth, textureHeight) {      // 指定纹理宽度高度
        let framebuffer, texture;

        // Create a frame buffer object (FBO)
        // fixme:(1)gl.createFramebuffer()：创建帧缓冲区对象
        framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            console.log('Failed to create frame buffer object');
            gl.deleteFramebuffer(framebuffer);
        }

        // Create a texture object and set its size and parameters
        // fixme:(2)创建纹理对象并设置其尺寸和参数
        texture = gl.createTexture(); // Create a texture object
        if (!texture) {
            console.log('Failed to create texture object');
            gl.deleteTexture(texture);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
        // fixme:将纹理的尺寸设为OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT，比<canvas>略小一些，以加快绘制的速度
        // fixme:gl.texImage2D()函数可以为纹理对象分配一块存储纹理图像的区域，供WebGL在其中进行绘制
        // fixme:调用该函数，将最后一个参数设为null，就可以创建一块空白的区域。第5章中这个参数是传入的纹理图像Image对象。
        // fixme:将创建出来的纹理对象存储在framebuffer.texture属性上，以便稍后访问
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // fixme:※※※这里一定要用gl.NEAREST，不能用LINEAR，因为这几步全是用于计算，而不是渲染，不需要它自动插值
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Attach the texture and the renderbuffer object to the FBO
        // fixme:(5)使用帧缓冲区对象的方式与使用渲染缓冲区类似：先将缓冲区绑定到目标上，然后通过操作目标来操作缓冲区对象，而不能直接操作缓冲区对象
        // fixme:gl.bindFramebuffer(target,framebuffer)：将framebuffer指定的帧缓冲区对象绑定到target目标上。如果framebuffer为null，那么已经绑定到target目标上的帧缓冲区对象将被解除绑定
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数framebuffer：指定被绑定的帧缓冲区对象
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);   // fixme：必须先绑定帧缓冲区(这步在步骤里是最后一步，但这里还是得用)
        // fixme:本例使用一个纹理对象来替代颜色缓冲区，所以就将这个纹理对象指定为帧缓冲区的颜色关联对象
        // fixme:gl.framebufferTexture2D(target,attachment,textarget,texture,level)：将texture指定的纹理对象关联到绑定在target目标上的帧缓冲区
        // fixme:参数target：必须是gl.FRAMEBUFFER
        // fixme:参数attachment：指定关联的类型
        // fixme:参数attachment=gl.COLOR_ATTACHMENT0时，表示texture是颜色关联对象
        // fixme:参数attachment=gl.DEPTH_ATTACHMENT时，表示texture是深度关联对象
        // fixme:参数textarget：同第二步的gl.texImage2D()的第1个参数(gl.TEXTURE_2D或gl.TEXTURE_CUBE)
        // fixme:参数texture：指定关联的纹理对象
        // fixme:参数level：指定为0(在使用MIPMAP时纹理时指定纹理的层级)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        framebuffer.texture = texture; // fixme:保存纹理对象 // Store the texture object

        // Check if FBO is configured correctly
        // fixme:(7)检查帧缓冲区是否正确配置
        // fixme:gl.checkFramebufferStatus(target)：检查绑定在target上的帧缓冲区对象的配置状态
        // fixme:参数target：必须是gl.FRAMEBUFFER
        let e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (gl.FRAMEBUFFER_COMPLETE !== e) {
            console.log('Frame buffer object is incomplete: ' + e.toString());
            return error();
        }

        // Unbind the buffer object
        // fixme:这里也是全清空了
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return framebuffer;
    }

}