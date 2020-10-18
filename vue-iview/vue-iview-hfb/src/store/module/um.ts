import types, {PagePayload} from "../mutationType";

export interface State {
    pageOpenedList: PagePayload[],
    unreadMessage: any,
}

const state: State = {
    pageOpenedList: [
        {
            path: "/home",
            name: "home",
            title: "Home",
            current: false,
        },
        {
            path: "/tools",
            name: "tools",
            title: "Tools",
            current: false
        },
    ],
    unreadMessage: {
        applyAudit: 0,
        dynamicEta: 0
    },
};
const getters = {
    allUnreadMessagesNum: (state: State) => {
        return state.unreadMessage.applyAudit + state.unreadMessage.dynamicEta
    }
};
const mutations = {
    [types.openPage](state: State, page: PagePayload) {
        // 查找当前所在的业务主页面
        state.pageOpenedList.map(value => {
            value.current = page.path === value.path;
        });
    },
    [types.unreadMessageNum](state: State, payload: any) {
        payload.map(value => {
            state.unreadMessage[value.key] = value.num;
        })
    },
};
export default {
    state,
    getters,
    mutations
};
