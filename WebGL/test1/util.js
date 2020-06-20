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

function createTexture(gl, filter, data, width, height, index) {
    // gl.activeTexture(gl.TEXTURE0 + index);
    const texture = gl.createTexture();
    // todo：这里改了
    if (index !== undefined) {
        gl.activeTexture(gl.TEXTURE0 + index);    // 666，还能这么写
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

function createColorRamp(colors,isolineValue, dataOffset) {
    const min = colors[0][0];
    const max = colors[colors.length - 1][0];
    let length = 250;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = length;
    canvas.height = 1;
    // fixme:色卡渐变
    const gradient = ctx.createLinearGradient(0, 0, length, 0);
    for (let m = 0; m < colors.length; m++) {
        gradient.addColorStop(fract(min, max, colors[m][0]), toColor(colors[m][1]));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, length, 1);
    // fixme:色卡不渐变
    /*let num = 0;
    for (let i = 0; i < length; i++) {
        let x = i / (length - 1) * (max - min) + min;
        if (x < colors[((num + 1 >= length - 1) ? (length - 1) : (num + 1))][0]) {

        } else {
            num++;
        }
        ctx.fillStyle = toColor(colors[num][1]);
        ctx.fillRect(i, 0, 1, 1);
    }*/
    // fixme:色卡不渐变==>(3)做出来的色卡要按间距分，比如间距是2，如果从0开始算，色卡有个35，那么它的颜色按34的来，新的颜色从36开始
    /*let dataMin = Math.floor((min + dataOffset) / isolineValue) * isolineValue - dataOffset;
    let dataMax = Math.ceil((max + dataOffset) / isolineValue) * isolineValue - dataOffset;
    // 重新改变
    length = (dataMax - dataMin) / isolineValue + 1;
    // let colors1 = JSON.parse(JSON.stringify(colors));
     let colors1 = [...colors];  // ES6深拷贝数组，要不reverse()会改变原数组
    let num = 0;
    for (let i = 0; i < length; i++) {
        let x = i / (length - 1) * (dataMax - dataMin) + dataMin;
        if (x < colors1[num + 1][0]) {

        } else {
            num++;
        }
        ctx.fillStyle = toColor(colors1[num][1]);
        ctx.fillRect(i, 0, 1, 1);
    }*/
    return new Uint8Array(ctx.getImageData(0, 0, length, 1).data);  // todo:获取从0-length的所有像素值
    function fract(min, max, val) {
        return (val - min) / (max - min);
    }

    function toColor(c) {
        return "RGBA(" + c[0] + "," + c[1] + "," + c[2] + "," + c[3] + ")";
    }
}
