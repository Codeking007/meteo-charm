import * as BABYLON from 'babylonjs';
import Vector4 = BABYLON.Vector4;
import Color4 = BABYLON.Color4;

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

export class Game {
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.FreeCamera;
    private _light: BABYLON.Light;

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

        // Create a FreeCamera, and set its position to (x:0, y:5, z:-10).
        this._camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(10, 10, 10), this._scene);

        // Target the camera to scene origin.
        this._camera.setTarget(BABYLON.Vector3.Zero());

        // Attach the camera to the canvas.
        this._camera.attachControl(this._canvas, false);

        // Create a basic light, aiming 0,1,0 - meaning, to the sky.
        // 半球形灯光
        this._light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(-1, -1, 10), this._scene);

        let boxOptions:CreateBoxOptions={
            height: 5,
            width: 2,
            depth: 0.5,
            faceColors:[new Color4(1,0,0,1),new Color4(0,1,0,1),new Color4(0,0,1,1),new Color4(1,0,0,1),new Color4(0,1,0,1),new Color4(0,0,1,1)],
            faceUV:[new Vector4(1,1,1,1)],
        };
        let box = BABYLON.MeshBuilder.CreateBox("myBox", boxOptions, this._scene);
        // Create a built-in "sphere" shape; with 16 segments and diameter of 2.
        let sphere = BABYLON.MeshBuilder.CreateSphere('sphere1',
            {segments: 16, diameter: 2,arc:0.8,slice:0.8}, this._scene);

        // Move the sphere upward 1/2 of its height.
        sphere.position.x = 1;
        sphere.position.y = 1;
        sphere.position.z = 1;

        // Create a built-in "ground" shape.
        let ground = BABYLON.MeshBuilder.CreateGround('ground1',
            {width: 10, height: 6, subdivisions: 5}, this._scene);


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