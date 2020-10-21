// import * as turf from "@turf/turf";

export default class {
    // 时间戳转换成utc时间显示，数据库里是时间戳；
    static utcDisplay(time: number): Date {
        return new Date(new Date().getTimezoneOffset() * 60 * 1000 + time);
    }
}

