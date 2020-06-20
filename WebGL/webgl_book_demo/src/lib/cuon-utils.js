// cuon-utils.js (c) 2012 kanda and matsuda
/**
 * Create a program object and make current
 * @param gl GL context
 * @param vshader a vertex shader program (string)
 * @param fshader a fragment shader program (string)
 * @return true, if the program object was created and successfully made current
 */
// fixme:编译GLSL ES代码,创建和初始化着色器供WebGL使用,分为7个步骤:
// fixme:1、创建着色器对象==>gl.createShader()
// fixme:2、向着色器对象中填充着着色器程序的源代码==>gl.shaderSource()
// fixme:3、编译着色器==>gl.compileShader()
// fixme:4、创建程序对象==>gl.createProgram()
// fixme:5、为程序对象分配着色器对象==>gl.attachShader()
// fixme:6、连接程序对象==>gl.linkProgram()
// fixme:7、使用程序对象==>gl.useProgram()
// fixme:一个“程序对象”必须包含两个“着色器对象”，分别是顶点着色器和片元着色器
function initShaders(gl, vshader, fshader) {
  var program = createProgram(gl, vshader, fshader);
  if (!program) {
    console.log('Failed to create program');
    return false;
  }

  // fixme:7、使用程序对象==>gl.useProgram()
  // fixme:gl.useProgram(program)：告知WebGL系统绘制时使用哪个程序对象
  // fixme:参数program：指定代使用的程序对象
  // fixme:这个函数的存在使得WebGL具有了一个强大的特性，那就是在绘制前准备多个程序对象，然后在绘制的时候根据需要切换程序对象
  gl.useProgram(program);
  gl.program = program;

  return true;
}

/**
 * Create the linked program object
 * @param gl GL context
 * @param vshader a vertex shader program (string)
 * @param fshader a fragment shader program (string)
 * @return created program object, or null if the creation has failed
 */
function createProgram(gl, vshader, fshader) {
  // Create shader object
  var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
  var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
  if (!vertexShader || !fragmentShader) {
    return null;
  }

  // Create a program object
  // fixme:4、创建程序对象==>gl.createProgram()
  // fixme:之前用的gl.getAttribLocation()和gl.getUniformLocation()中的program就是这个程序对象
  var program = gl.createProgram();
  if (!program) {
    return null;
  }

  // Attach the shader objects
  // fixme:5、为程序对象分配着色器对象==>gl.attachShader()
  // fixme:gl.attachShader()：将shader指定的着色器对象分配给program指定的程序对象
  // fixme:参数program：指定程序对象
  // fixme:参数shader：指定着色器对象
  // fixme:类似地，可以用gl.datachShader(program,shader)来取消shader指定的着色器对象对program指定的程序对象的分配
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // Link the program object
  // fixme:6、连接程序对象，将着色器（顶点着色器和片元着色器）连接起来
  // fixme:gl.linkProgram(program):连接program指定的程序对象中的着色器
  // fixme:目的（1）：顶点着色器和片元着色器的varying变量同名同类型，且一一对应
  // fixme:目的（2）：顶点着色器对每个varying变量赋了值
  // fixme:目的（3）：顶点着色器和片元着色器中的同名uniform变量也是同类型的（无须一一对应，即某些uniform变量可以出现一个着色器中而不出现在另一个中）
  // fixme:目的（4）：着色器中的attribute变量、uniform变量、varying变量的个数没有超过着色器的上限（表6.14）
  gl.linkProgram(program);

  // Check the result of linking
  // fixme:在着色器连接之后，应当检查是否连接成功
  // fixme:gl.getProgramParameter(program, pname)：获取program指定的程序对象中pname指定的参数信息。返回值随着pname的不同而不同
  // fixme:参数program：指定程序对象
  // fixme:参数pname：指定待获取参数的类型
  // fixme:参数pname=gl.DELETE_STATUS,返回程序对象是否被删除成功(true或false)
  // fixme:参数pname=gl.LINK_STATUS,返回程序对象是否被连接成功(true或false)
  // fixme:参数pname=gl.VALIDATE_STATUS,返回程序对象是否验证成功(true或false)
  // fixme:参数pname=gl.ATTACHED_SHADERS,返回已被分配给程序的着色器数量
  // fixme:参数pname=gl.ACTIVE_ATTRIBUTES,返回顶点着色器中attribute变量的数量
  // fixme:参数pname=gl.ACTIVE_UNIFORMS,返回程序中uniform变量的数量
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    // fixme:如果程序连接失败，可以查看日志
    // fixme:gl.getProgramInfoLog(program)：获取program指定的程序对象的信息日志
    var error = gl.getProgramInfoLog(program);
    console.log('Failed to link program: ' + error);
    // fixme：删除程序对象 gl.deleteProgram(program)：如果该程序对象正在被使用，则不立即删除，而是等它不再被使用后再删除
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    return null;
  }
  program["uniforms"]={};
  var uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (var i = 0; i < uniformCount; i++) {
    var uniformName = gl.getActiveUniform(program, i).name;
    program.uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
  }
  return program;
}

/**
 * Create a shader object
 * @param gl GL context
 * @param type the type of the shader object to be created
 * @param source shader program (string)
 * @return created shader object, or null if the creation has failed.
 */
function loadShader(gl, type, source) {
  // Create shader object
  // fixme:1、创建着色器对象==>gl.createShader()
  // fixme:gl.createShader(type):创建由type指定的着色器对象
  // fixme:参数type：指定创建着色器的类型
  // fixme:参数type=gl.VERTEX_SHADER时，表示顶点着色器
  // fixme:参数type=gl.gl.FRAGMENT_SHADER时，表示片元着色器
  var shader = gl.createShader(type);
  if (shader == null) {
    console.log('unable to create shader');
    return null;
  }

  // Set the shader program
  // fixme:2、向着色器对象中填充着着色器程序的源代码==>gl.shaderSource()
  // fixme:gl.shaderSource(shader, source):将source指定的字符串形式的代码传入shader指定的着色器。如果之前已经向shader传入过代码了，旧的代码将会被替换掉
  // fixme:参数shader：指定需要传入代码的着色器对象
  // fixme:参数source：指定字符串形式的代码
  gl.shaderSource(shader, source);

  // Compile the shader
  // fixme:3、编译着色器==>gl.compileShader()
  // fixme:gl.compileShader(shader)：GLSL ES语言在使用之前需要编译成二进制的可执行格式，WebGL真正使用的是这种可执行格式
  // fixme：参数shader：待编译的着色器对象
  gl.compileShader(shader);

  // Check the result of compilation
  // fixme:当调用gl.compileShader()时，如果着色器源代码中存在错误，那么就会出现编译错误。可以调用gl.getShaderParameter()来检查着色器的状态
  // fixme:gl.getShaderParameter(shader, pname)：采取shader指定的着色器中，pname指定的参数信息
  // fixme:参数shader：指定待获取参数的着色器对象
  // fixme:参数pname：指定待获取参数的类型
  // fixme:参数pname=gl.SHADER_TYPE，返回顶点着色器(gl.VERTEX_SHADER)还是片元着色器(gl.FRAGMENT_SHADER)
  // fixme:参数pname=gl.DELETE_STATUS,返回着色器是否被删除成功(true或false)
  // fixme:参数pname=gl.COMPILE_STATUS,返回着色器是否被编译成功(true或false)
  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    // fixme:如果编译失败，可以查看日志
    // fixme:gl.getShaderInfoLog(shader)：获取shader指定的着色器对象的信息日志
    var error = gl.getShaderInfoLog(shader);
    console.log('Failed to compile shader: ' + error);
    // fixme：如果不再需要这个着色器，可以使用gl.deleteShader(shader)删除着色器，shader为着色器对象
    // fixme:注意，如果着色器对象还在使用（已经使用gl.attachShader()使之附加在了程序对象上），那么删除函数不会立刻删除着色器，而是要等到程序对象不再使用该着色器，并将其删除
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Initialize and get the rendering for WebGL
 * @param canvas <cavnas> element
 * @param opt_debug flag to initialize the context for debugging
 * @return the rendering context for WebGL
 */
// fixme:第一个参数指定<canvas>元素，第二个元素默认为false，如果为true，js中发生的错误将被显示在控制台中
function getWebGLContext(canvas, opt_debug) {
  // Get the rendering context for WebGL
  var gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) return null;

  // if opt_debug is explicitly false, create the context for debugging
  if (arguments.length < 2 || opt_debug) {
    gl = WebGLDebugUtils.makeDebugContext(gl);
  }

  return gl;
}
