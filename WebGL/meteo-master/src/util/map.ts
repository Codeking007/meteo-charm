import mapboxgl from "mapbox-gl";

export default class {
    private _map!: mapboxgl.Map;

    initMapbox(containerId: string) {
        let options: any = {};
        options.container = containerId;
        options.attributionControl = false;
        options.center = [121.6, 38.9];
        // options.center = [0, 0];
        options.zoom = 0;
        options.minZoom = 0;
        options.maxZoom = 100;
        options.preserveDrawingBuffer = true;
        options.style = {
            "version": 8,
            // todo:发布要改
            // "glyphs": "http://app.unmeteo.com/app/static/{fontstack}/{range}.pbf",
            "glyphs": "./map/font/{fontstack}/{range}.pbf", // fixme 不要提交
            "sources": {
                "gTiles": {
                    "type": "raster",
                    'tiles': ['http://mt0.google.cn/vt/v=w2.114&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}'],
                    'tileSize': 256
                },
                "gsTiles": {
                    "type": "raster",
                    'tiles': ['http://mt0.google.cn/vt/lyrs=s@148,h@183000000&x={x}&y={y}&z={z}'],
                    'tileSize': 256
                },
                "defTiles3": {
                    "type": "raster",
                    'tiles': ["http://www.unmeteo.com/tiles/unimet/{z}/{x}/{y}.png"],
                    'tileSize': 256
                },
                "bTiles": {
                    "type": "raster",
                    'tiles': ['http://chart1.boloomo.com/Chinese/base/{z}/{x}/{y}.png'],
                    'tileSize': 256
                },
            },
            "layers": [
                {
                    "id": "unimet",
                    "type": "raster",
                    "source": "defTiles3",
                    "layout": {
                        'visibility': 'visible'
                    }
                },
            ]
        };

        this._map = new mapboxgl.Map(options);
        this._map.getCanvasContainer().style.cursor = 'default';
        this._map.on("load", () => {

        });
    }


    get map(): mapboxgl.Map {
        return this._map;
    }

    set map(value: mapboxgl.Map) {
        this._map = value;
    }
}