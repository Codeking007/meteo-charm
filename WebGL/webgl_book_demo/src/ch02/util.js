export default {
  createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }
    gl.deleteShader(shader);
  },

  createProgram(gl, vertexShader, fragmentShader) {
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
  },

  createTexture(gl, filter, data, width, height,index) {
    // gl.activeTexture(gl.TEXTURE0 + index);
    const texture = gl.createTexture();
    if(index !== undefined)
      gl.activeTexture(gl.TEXTURE0+index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    if (data instanceof Uint8Array) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    // gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  },

  bindTexture(gl, texture, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  },

  createBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
  },

  bindAttribute(gl, buffer, attribute, numComponents) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
  },

  bindFramebuffer(gl, framebuffer, texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    if (texture) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }
  },

  createColorRamp(colors){
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
    return new Uint8Array(ctx.getImageData(0, 0, length, 1).data);
    function fract(min,max,val){
      return (val-min)/(max-min);
    }
    function toColor(c){
      return "RGBA("+c[0]+","+c[1]+","+c[2]+","+c[3]+")";
    }
  },


}
