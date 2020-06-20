// HelloCanvas.js (c) 2012 matsuda
function main() {
  /*// Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
    // fixme:getWebGLContext()==>在获取WebGL绘图上下文时，canvas.getContext()函数接收的参数，在不同浏览器中会不同，所以写了getWebGLContext()来隐藏不同浏览器之间的差异
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Set clear color
    // fixme: gl.clearColor(r, g, b, a)==>清空绘图区==>遵循OpenGL颜色分量的取值范围，所以rgba都是0-1之间的
  gl.clearColor(0.0, 0.0, 1.0, 1.0);

  // Clear <canvas>
    // fixme:gl.clear(buffer)==>将指定缓冲区设定为预定值,如果清空的是颜色缓冲区，那么将使用gl.clearColor()指定的值作为预定值，如果没调用gl.clearColor()的话，就用默认值
    // fixme:参数buffer：指定带清空的缓冲区，位操作符OR(|)可用来指定多个缓冲区
    // fixme:参数buffer=gl.COLOR_BUFFER_BIT时，指定颜色缓存区，默认值(0.0,0.0,0.0,0.0)，相关函数gl.clearColor(r, g, b, a)
    // fixme:参数buffer=gl.DEPTH_BUFFER_BIT时，指定深度缓冲区，默认值1.0，相关函数gl.clearDepth(depth)
    // fixme:参数buffer=gl.STENCIL_BUFFER_BIT时，指定模板缓冲区，默认值0，相关函数gl.clearStencil(s)
  gl.clear(gl.COLOR_BUFFER_BIT);*/

  //读取图片
  const width=500;
  const height=500;
  // const canvas = document.createElement('canvas');
  const canvas = document.getElementById('webgl');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;

  debugger
  const color2D = createColorRamp(c); // 画色卡
  debugger

  for(let y=0;y<canvas.height;y++){
    for(let x=0;x<canvas.width;x++){
      // todo
      // let value=a[y*canvas.width+x];
      let value=Math.ceil(Math.random()*200);
      ctx.fillStyle = "RGBA("+x+","+0+","+0+","+255+")";
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // const colorTexture = createTexture(this.gl, this.gl.LINEAR, color2D, color2D.length / 4, 1, TEXTURE_INDEX_COLOR);


}

const c = [
  [0, [0,0,0, 0]],
  [0.75, [59,123,161, 0]],
  [1.5, [59,126,161, 1]],
  [2, [58,132,162, 1]],
  [2.5, [58,136,162, 1]],
  [3, [58,153,161, 1]],
  [5, [50,166,110, 1]],
  [7, [74,163,57, 1]],
  [8.5, [129,161,58, 1]],
  [10, [161,161,59, 1]],
  [15, [161,59,59, 1]],
  [20, [170,54,107, 1]],
  [25, [164,57,154, 1]],
  [30, [164,57,154, 1]]
];

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
  return new Uint8Array(ctx.getImageData(0, 0, length, 1).data);

}

function fract(min,max,val){
  return (val-min)/(max-min);
}
function toColor(c){
  return "RGBA("+c[0]+","+c[1]+","+c[2]+","+c[3]+")";
}


