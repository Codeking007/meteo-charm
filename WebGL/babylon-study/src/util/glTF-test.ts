import * as BABYLON from 'babylonjs';
import "babylonjs-loaders";
import Vector4 = BABYLON.Vector4;
import Color4 = BABYLON.Color4;
import Mesh = BABYLON.Mesh;

interface CreateBoxOptions {
    size?: number;
    width?: number;
    height?: number;
    depth?: number;
    faceUV?: Vector4[];
    faceColors?: Color4[];
    sideOrientation?: number;
    frontUVs?: Vector4;
    backUVs?: Vector4;
    updatable?: boolean;
}

export class glTFUtil {
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.ArcRotateCamera;
    private _light: BABYLON.Light;
    private _light1: BABYLON.Light;

    constructor(canvasElement: string) {
        // Create canvas and engine.
        this._canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
        // 加载BABYLON 3D 引擎
        this._engine = new BABYLON.Engine(this._canvas, true);
    }

    // fixme:坐标系：x向左，y向上，z由左手定则判断
    createScene(): void {
        // Create a basic BJS Scene object.
        this._scene = new BABYLON.Scene(this._engine);

        // Create a basic light, aiming 0,1,0 - meaning, to the sky.
        this._light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), this._scene);
        this._light1 = new BABYLON.HemisphericLight('light2', new BABYLON.Vector3(0, -1, 0), this._scene);

        // Create a FreeCamera, and set its position to (x:0, y:5, z:-10).
        this._camera = new BABYLON.ArcRotateCamera('camera1', 0/180*Math.PI, 90/180*Math.PI, 200, new BABYLON.Vector3(0, 0, 0), this._scene);
        // Target the camera to scene origin.
        // this._camera.setTarget(BABYLON.Vector3.Zero());

        // Attach the camera to the canvas.
        this._camera.attachControl(this._canvas, true);

        // 把 glTF 对象附加在现有的场景对象上
        // 可以从文件夹中选取对象，也可以给出一个 URL
        BABYLON.SceneLoader.Append("./satellite/", "scene.gltf", this._scene);

        // 圆环
        let torus: BABYLON.Mesh = BABYLON.Mesh.CreateTorus("torus", 100, 0.1, 64, this._scene, false);
        torus.position.x = 50;
        torus.position.y = 50;
        torus.position.z = 50;

        let boxOptions:CreateBoxOptions={
            height: 5,
            width: 2,
            depth: 0.5,
            faceColors:[new Color4(1,0,0,1),new Color4(0,1,0,1),new Color4(0,0,1,1),new Color4(1,0,0,1),new Color4(0,1,0,1),new Color4(0,0,1,1)],
            faceUV:[new Vector4(1,1,1,1)],
        };
        let box = BABYLON.MeshBuilder.CreateBox("myBox", boxOptions, this._scene);

       /* let alpha = 0;
        this._scene.registerBeforeRender(() => {
            // torus.rotation.x += 1/180*Math.PI;
            this._camera.setPosition(new BABYLON.Vector3(100 * Math.cos(alpha)+50, 100 * Math.sin(alpha), 500));
            // this._camera.setPosition(new BABYLON.Vector3( 0,alpha, 200));
            alpha = (alpha + 0.01) % (2 * Math.PI);
            // alpha = (alpha + 1)%500 ;
        });*/
    }

    doRender(): void {
        // Run the render loop.
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });

        // The canvas/window resize event handler.
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }
}