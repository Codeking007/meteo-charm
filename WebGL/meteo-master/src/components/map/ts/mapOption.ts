
const BoxMap = {
    COLOR: {
        "background": 'rgba(0, 0, 0, 1)',
            "land": 'rgba(100, 100, 100, 1)',
            "border": 'rgba(255,255,255,1)'
    },
    UNIMETLAYER: "unimet",     //1最里层。谷歌地图、谷歌位图等
        BASELAYER: "base",        //2示意图。天气等图层在其上或其下
        SKYLAYER: "sky",		   //3最外层。点线面在其上。
}
let options={
    container:'mapContainer',
    center:[121.6,38.9],
    zoom:2,
    // maxZoom:10,
    // minZoom:2,
    attributionControl:false,
    preserveDrawingBuffer:true,         //缓存
    dragRotate:false,
    style:{
        version:8,
        glyphs:"./map/font/{fontstack}/{range}.pbf",        //自定义字体文件位置
        sources:{
            "gTiles":{        //谷歌地图
                type:'raster',
                tiles:['https://mt0.google.cn/vt/v=w2.114&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}'],
                tileSize:256
            },
            "gsTiles":{       //谷歌位图
                type:'raster',
                tiles:['https://mt0.google.cn/vt/lyrs=s@148,h@183000000&x={x}&y={y}&z={z}'],
                tileSize:256
            },
            "defTiles3": { // 工作图
                type:'raster',
                'tiles': ["/unimet-map/{z}/{x}/{y}.png"],
                tileSize:256
            },
            "skyS": {
                "type": "geojson",
                "data": {
                    "type": "FeatureCollection",
                    "features": []
                }
            }
        },
        layers:[
            {
                id:BoxMap.UNIMETLAYER,
                type:'raster',
                source:'gTiles',
                layout:{
                    visibility:'none'
                }
            },
            {
                id:BoxMap.BASELAYER,
                type:'raster',
                source:'defTiles3',
                layout:{
                    visibility:'visible'
                }
            },

            {
                "id": BoxMap.SKYLAYER,
                "type": "fill",
                "source": "skyS",
                "paint": {}
            }
        ]
    }
};
export default options
export {BoxMap}
