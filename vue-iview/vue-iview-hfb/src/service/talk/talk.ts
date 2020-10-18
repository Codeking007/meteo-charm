import UmService from "../um/UmService";
import TalkEntity from "../../entity/talk/TalkEntity";
import http from "@/util/http";

const SELECTTALKCONTENT = "/selectTalkContent.do";

class TalkService<TalkEntity> extends UmService<TalkEntity> {

    constructor(urlHead: string) {
        super(urlHead);
    }

    public selectTalkContent(entity: TalkEntity): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            http.post<any>(this.urlHead + SELECTTALKCONTENT, entity).then((data) => {
                resolve(data);
            }, (reason) => {
                reject(reason);
            });
        });
    }
}

export default new TalkService<TalkEntity>("/talk");
