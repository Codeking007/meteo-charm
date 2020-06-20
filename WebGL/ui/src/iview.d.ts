import Vue from "vue";
declare interface MessageConfig{
  content:string,
  render?:(h:any)=>any,
  duration?:number
  onClose?:()=>void,
  closable?:boolean
}
/**
 * Message定义
 */
declare interface Message{
  info(config:string|MessageConfig):void;
  success(config:string|MessageConfig):void;
  warning(config:string|MessageConfig):void;
  error(config:string|MessageConfig):void;
  loading(config:string|MessageConfig):void;
}

export interface ValidateCallback {
  (isValid: boolean): void
}
export declare class IForm extends Vue{
  validate (callback: ValidateCallback): void
  validate (): Promise<boolean>
}

export declare class IMenu extends Vue{
  updateOpened():void
  updateActiveName():void
}

declare interface SpinConfig{
  render?:(h:any)=>any,
}

declare interface Spin{
  show(config?:SpinConfig):void;
  hide(config?:SpinConfig):void;
}

declare module "vue/types/vue" {
  interface Vue {
    $Message:Message,
    $Spin:Spin
  }
}
