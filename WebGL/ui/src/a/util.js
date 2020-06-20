function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const attribute = gl.getActiveAttrib(program, i);
            program[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const uniform = gl.getActiveUniform(program, i);
            program[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        return program;
    }
    gl.deleteProgram(program);
}

function createTexture(gl, filter, data, width, height,index) {
    // gl.activeTexture(gl.TEXTURE0 + index);
    const texture = gl.createTexture();
    // todo：这里改了
    if(index !== undefined){
        gl.activeTexture(gl.TEXTURE0+index);    // 666，还能这么写
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    if (data instanceof Uint8Array) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);    // todo 怎么参数变多了
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    // todo:这里加了句
    // gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function bindTexture(gl, texture, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
}

function createBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
}

function bindAttribute(gl, buffer, attribute, numComponents) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
}

function bindFramebuffer(gl, framebuffer, texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    if (texture) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }
}

function createColorRamp(colors){
    const min = colors[0][0];
    const max = colors[colors.length-1][0];
    const length = 250;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = length;
    canvas.height = 1;
    const gradient = ctx.createLinearGradient(0, 0, length, 0);
    for (let m=0;m<colors.length;m++) {
        gradient.addColorStop(fract(min,max,colors[m][0]), toColor(colors[m][1]));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, length, 1);
    return new Uint8Array(ctx.getImageData(0, 0, length, 1).data);  // todo:获取从0-length的所有像素值
    function fract(min,max,val){
        return (val-min)/(max-min);
    }
    function toColor(c){
        return "RGBA("+c[0]+","+c[1]+","+c[2]+","+c[3]+")";
    }
}

function computeTextureByData(){
    const lon=[119.882,124.202,0.01];   // todo
    const lat=[28.687,33.007,0.01];     // todo
    const minmax=[[0.0,100.0],[0.0,100.0]];
    const width=Math.round((lon[1]-lon[0])/lon[2]+1);    // todo:宽度为经度相减+1
    const height=Math.round((lat[1]-lat[0])/lat[2]+1);   // todo：高度为纬度相减+1

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    for(let y=0;y<canvas.height;y++){
        for(let x=0;x<canvas.width;x++){
            // todo：获取对应位置气象值：转换字节
            // let value=a[y*canvas.width+x];
            let value=Math.ceil(Math.random()*250);
            ctx.fillStyle = "RGBA("+Math.round(x)+","+0+","+0+","+255+")";
            ctx.fillRect(x, y, 1, 1);
        }
    }
    const re = {};
    // 形成数据纹理
    re.width = canvas.width;
    re.height = canvas.height;
    re.data = new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data);   // 图片像素数据
    re.minAndMax = minmax;          // 图片左下角范围像素数据
    re.lon = new Float32Array([lon[0],lon[1],lon[2]]);                    // 图片左下角经度范围像素数据
    re.lat = new Float32Array([lat[0],lat[1],lat[2]]);                    // 图片左下角纬度范围像素数据
    return re;
}
