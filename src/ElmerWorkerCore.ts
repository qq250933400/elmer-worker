export class ElmerWorkerCore {
    sendMsg(msg:any): void {
        (<any>self["postMessage"])(msg);
    }
}
