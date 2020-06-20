// using var to work around a WebKit bug
var canvas = document.getElementById('canvas'); // eslint-disable-line

const pxRatio = Math.max(Math.floor(window.devicePixelRatio) || 1, 2);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const gl = canvas.getContext('webgl', {antialiasing: false});

const wind = window.wind = new WindGL(gl);      // fixme:1、初始化
wind.numParticles = 65536;

function frame() {
    if (wind.windData) {
        wind.draw();    // fixme:4、画图
    }
    requestAnimationFrame(frame);
}
frame();

const gui = new dat.GUI();
gui.add(wind, 'numParticles', 1024, 589824);
gui.add(wind, 'fadeOpacity', 0.96, 0.999).step(0.001).updateDisplay();
gui.add(wind, 'speedFactor', 0.05, 1.0);
gui.add(wind, 'dropRate', 0, 0.1);
gui.add(wind, 'dropRateBump', 0, 0.2);

const windFiles = {
    0: '2016112000',
    6: '2016112006',
    12: '2016112012',
    18: '2016112018',
    24: '2016112100',
    30: '2016112106',
    36: '2016112112',
    42: '2016112118',
    48: '2016112200'
};

const meta = {
    '2016-11-20+h': 0,
    'retina resolution': true,
    'github.com/mapbox/webgl-wind': function () {
        window.location = 'https://github.com/mapbox/webgl-wind';
    }
};
gui.add(meta, '2016-11-20+h', 0, 48, 6).onFinishChange(updateWind);
if (pxRatio !== 1) {
    gui.add(meta, 'retina resolution').onFinishChange(updateRetina);
}
gui.add(meta, 'github.com/mapbox/webgl-wind');
updateWind(0);
updateRetina();

function updateWind(name) {     // fixme:2、初始化
    this.getJSON('wind/' + windFiles[name] + '.json', function (windData) {
        const windImage = new Image();
        windData.image = windImage;
        windImage.src = 'wind/' + windFiles[name] + '.png';
        windImage.onload = function () {
            wind.setWind(windData);
        };
    });
}

// fixme:Retina （一种新型高分辨率的显示标准）
// fixme:所谓“Retina”是一种显示标准，是把更多的像素点压缩至一块屏幕里，从而达到更高的分辨率并提高屏幕显示的细腻程度。
// fixme:由摩托罗拉公司研发。最初该技术是用于Moto Aura上。这种分辨率在正常观看距离下足以使人肉眼无法分辨其中的单独像素。也被称为视网膜显示屏。
function updateRetina() {   // fixme:3、超清高清那个东西，和resize
    const ratio = meta['retina resolution'] ? pxRatio : 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    wind.resize();
}

getJSON('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_coastline.geojson', function (data) {
    const canvas = document.getElementById('coastline');
    canvas.width = canvas.clientWidth * pxRatio;
    canvas.height = canvas.clientHeight * pxRatio;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = pxRatio;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';
    ctx.beginPath();

    for (let i = 0; i < data.features.length; i++) {
        const line = data.features[i].geometry.coordinates;
        for (let j = 0; j < line.length; j++) {
            ctx[j ? 'lineTo' : 'moveTo'](
                (line[j][0] + 180) * canvas.width / 360,
                (-line[j][1] + 90) * canvas.height / 180);
        }
    }
    ctx.stroke();
});

function getJSON(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('get', url, true);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            callback(xhr.response);
        } else {
            throw new Error(xhr.statusText);
        }
    };
    xhr.send();
}