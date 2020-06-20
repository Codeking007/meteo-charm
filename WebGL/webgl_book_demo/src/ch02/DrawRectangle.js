// DrawTriangle.js (c) 2012 matsuda
function main() {
  // Retrieve <canvas> element
  /*var canvas = document.getElementById('example');
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');  // fixme：指定上下文类型（二维或三维），将绘图上下文存到ctx变量中待使用

  // Draw a blue rectangle
  ctx.fillStyle = 'rgba(0, 0, 255, 1.0)'; // Set color to blue
  ctx.fillRect(120, 10, 150, 150);   // fixme：前两个参数指定了待绘制矩形的左上顶点在<canvas>中的坐标，后两个参数指定了矩形的宽度和高度（以像素为单位）     // Fill a rectangle with the color
*/

  let gl=this.gl={
    canvas:{
      width:256,
      height:256
    }
  };
  const canvasBorder = document.getElementById('example');
  const contextBorder = canvasBorder.getContext('2d');
  canvasBorder.width = this.gl.canvas.width;
  canvasBorder.height =this.gl.canvas.height;
  contextBorder.fillStyle = "rgba(0,0,0,255)";
  contextBorder.fillRect(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  contextBorder.beginPath();
  contextBorder.arc(this.gl.canvas.width/2, this.gl.canvas.height/2, ((this.gl.canvas.width<this.gl.canvas.height)?(this.gl.canvas.width/2):(this.gl.canvas.height/2)), 0, Math.PI * 2, true);
  //不关闭路径路径会一直保留下去
  contextBorder.closePath();
  contextBorder.fillStyle = 'rgba(255,0,0,255)';
  contextBorder.fill();
  contextBorder.beginPath();
  contextBorder.arc(this.gl.canvas.width/2, this.gl.canvas.height/2, ((this.gl.canvas.width<this.gl.canvas.height)?(this.gl.canvas.width/4):(this.gl.canvas.height/4)), 0, Math.PI * 2, true);
  //不关闭路径路径会一直保留下去
  contextBorder.closePath();
  contextBorder.fillStyle = "rgba(0,0,0,255)";
  contextBorder.fill();
}
