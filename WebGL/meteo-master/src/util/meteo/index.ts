export default interface IWebGL{
    setColor(color:Array<any>):void;
    load(url:string):Promise<any>;
    loadMeteo(meteo:any, params:any, precision:any):void;
    show(clear?:boolean):void;
    hide():void;
    setZIndex(z:string):void;
    setOpacity(opacity:number):void;
    removeContext():void;
}