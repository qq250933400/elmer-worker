import { Common } from "elmer-common";

export class ElmerWorkerCore extends Common {
    sendMsg(msg:any): void {
        (<any>self["postMessage"])(msg);
    }
}
