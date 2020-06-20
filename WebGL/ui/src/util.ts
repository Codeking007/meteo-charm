export default {

    compileShader(gl:WebGLRenderingContext,type:number,source:string):WebGLShader|null{
        let shader:WebGLShader|null = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(shader);
        return shader;
    }
}