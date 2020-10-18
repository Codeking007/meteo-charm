export default {
    // 打开页面
    openPage: "openPage",
    // 未读消息数量:审核通过通知+船舶动态提醒
    unreadMessageNum: "unreadMessageNum",
}

/**
 * 页面payload
 */
export interface PagePayload {
    path: string,
    name: string,
    title: string,
    current?: boolean,
    home?: boolean,
}
