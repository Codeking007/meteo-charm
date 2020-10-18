import UmEntity from "../um/UmEntity"

/**
 * (ts)
 * @author unimet
 * @date 2018-12-01 09:57
 */
export default class extends UmEntity {
    // 未读
    public static STATUS_UNREAD = 10;
    // 已读
    public static STATUS_READ = 20;
    // 操作类型==>qq聊天
    public static TYPE_TALK: string = "1";
    // 操作类型==>task审核通过通知
    public static TYPE_APPLY: string = "2";
    // 操作类型==>船舶动态提醒：目的港/ETA变更提醒
    public static TYPE_ETA: string = "3";
    // 操作类型==>意见反馈
    public static TYPE_FEEDBACK: string = "4";
    //发送时间
    public sendTime?: Date;
    //接收时间
    public receiveTime?: Date;
    //发送人
    public sender?: string;
    //接收人
    public receiver?: string;
    //文本信息
    public text?: string;
    //状态:10为未读,20为已读
    public status?: number;
    //文本信息
    public subject?: string;
    //操作类型
    public type?: string;
    //标题
    public remark?: string;
    //创建人
    public creatUser?: string;
    //创建时间
    public creatTime?: Date;
}