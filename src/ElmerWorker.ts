import { Common, StaticCommon } from "elmer-common";
import { ElmerWorkerCore } from "./ElmerWorkerCore";
import { ElmerWorkerMsgEvent } from "./ElmerWorkerType";
import { ICallMethodMsgData,ICallMethodResponse, IInitMsgData, IInitMsgResponse, IMsgData } from "./EnumMessage";
import {
    __spreadArrays,
    funcToStr,
    classToWorkerCode,
    objectToWorkerCode,
    objectToWorkerData,
    onmessage,
    strToFunc,
    workerDataToObject
} from "./StaticFunc";

export type MessageHandler<T> = (event: ElmerWorkerMsgEvent<T>) => void;
export type WorkerEventListeners = {
    error?: MessageHandler<any>;
    message?:  MessageHandler<any>;
    callMethodResponse?: MessageHandler<any>;
    initResponse?:MessageHandler<any>;
};

type WorkerPromiseInfo = {
    resolve: Function;
    reject: Function;
};

export class ElmerWorker extends Common {
    private worker:Worker;
    private listener:WorkerEventListeners = {};
    private promiseData: any = {};
    constructor(private props?:any) {
        super();
        this.createWorker();
        this.bindEvent();
    }
    callMethod(methodName: string, ...params:any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.getRandomID();
            this.sendMsg(<ICallMethodMsgData>{
                data: params,
                id,
                method: methodName,
                type: "CallMethod"
            });
            this.promiseData[id] = {
                reject,
                resolve
            };
        });
    }
    callObjMethod(objKey: string, methodName: string, ...params: any[]):Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.getRandomID();
            this.sendMsg({
                data: params,
                id,
                method: methodName,
                obj: objKey,
                type: "CallObjMethod"
            });
            this.promiseData[id] = {
                reject,
                resolve
            };
        });
    }
    addFunc(globalName: string, fn:Function):Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.getRandomID();
            this.sendMsg({
                data: funcToStr(fn),
                globalName,
                id,
                type: "InitFunction"
            });
            this.promiseData[id] = {
                reject,
                resolve
            };
        });
    }
    addObject(globalName: string, obj:object):Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.getRandomID();
            this.sendMsg({
                data: objectToWorkerData(obj),
                globalName,
                id,
                type: "InitObject"
            });
            this.promiseData[id] = {
                reject,
                resolve
            };
        });
    }
    dispose(): void {
        this.worker.terminate();
        this.worker = null;
    }
    on<T>(eventName:keyof WorkerEventListeners, callBack:MessageHandler<T>): void {
        this.listener[eventName] = callBack;
    }
    private getInitPropsCode(): string {
        let result = "";
        if(this.props) {
            // tslint:disable-next-line:forin
            for(const key in this.props) {
                let tmpValue = this.props[key];
                if(this.isObject(tmpValue)) {
                    result += `var ${key} = ` + objectToWorkerCode(this.props[key], key) + "\r\n";
                } else if(this.isNumeric(tmpValue)) {
                    result += `var ${key} = ${tmpValue};\r\n`;
                } else if(this.isFunction(tmpValue)) {
                    tmpValue = tmpValue.toString();
                    result += `var ${key} = ${tmpValue};\r\n`;
                } else if(this.isArray(tmpValue) || this.isString(tmpValue)) {
                    tmpValue = JSON.stringify(tmpValue);
                    result += `var ${key} = ${tmpValue};\r\n`;
                } else if(this.isRegExp(tmpValue)) {
                    tmpValue = tmpValue.source;
                    result += `var ${key} = ${tmpValue};\r\n`;
                } else {
                    throw new Error("不支持的数据类型");
                }
            }
        }
        return result;
    }
    private createWorker(): void {
        const myBlob = new Blob([this.initBlobCode()]);
        this.worker = new Worker(window.URL.createObjectURL(myBlob));
    }
    private bindEvent(): void {
        this.worker.addEventListener("message", this.message.bind(this));
        this.worker.addEventListener("error", this.error.bind(this));
    }
    private error(err:ErrorEvent): void {
        if(typeof this.listener.message === "function") {
            const eventData:ElmerWorkerMsgEvent<any> = {
                cancel: false,
                message: err.message,
                srcEvent: err
            };
            this.listener.message(eventData);
            if(eventData.cancel) {
                return;
            }
        }
    }
    private message(event:MessageEvent): void {
        const data: IMsgData = event.data;
        const id: string = data.id;
        if(typeof this.listener.message === "function") {
            const eventData:ElmerWorkerMsgEvent<any> = {
                cancel: false,
                data: event.data,
                srcEvent: event
            };
            this.listener.message(eventData);
            if(eventData.cancel) {
                return;
            }
        }
        if(data.type === "CallMethod" || data.type === "CallObjMethod") {
            if(this.promiseData[id]) {
                const methodResponse:ICallMethodResponse = <ICallMethodResponse>data;
                if(methodResponse.statusCode === 200) {
                    (<WorkerPromiseInfo>this.promiseData[id]).resolve(methodResponse);
                } else {
                    (<WorkerPromiseInfo>this.promiseData[id]).reject(methodResponse);
                }
                delete this.promiseData[id]; // recive data an the promise object is exists, then delete it
            } else {
                typeof this.listener.callMethodResponse === "function" && this.listener.callMethodResponse({
                    cancel: false,
                    data,
                    srcEvent: event
                });
            }
        } else if (data.type === "InitObject" || data.type === "InitFunction") {
            if(this.promiseData[id]) {
                const initResponse:IInitMsgResponse = <IInitMsgResponse>data;
                if(initResponse.statusCode === 200) {
                    (<WorkerPromiseInfo>this.promiseData[id]).resolve(initResponse);
                } else {
                    (<WorkerPromiseInfo>this.promiseData[id]).reject(initResponse);
                }
                delete this.promiseData[id]; // recive data an the promise object is exists, then delete it
            } else {
                typeof this.listener.initResponse === "function" && this.listener.initResponse({
                    cancel: false,
                    data,
                    srcEvent: event
                });
            }
        }
    }
    private sendMsg(msg:IMsgData|ICallMethodMsgData|IInitMsgData): void {
        this.worker.postMessage(msg);
    }
    private initBlobCode(): string {
        const strToFuncCode = strToFunc.toString();
        const coreCode = objectToWorkerCode(new ElmerWorkerCore(), "ElmerWorkerCore");
        const staticCode = classToWorkerCode(StaticCommon);
        const code = [];
        code.push("var strToFunc = " + strToFuncCode);
        code.push("var __spreadArrays = " + funcToStr(__spreadArrays));
        code.push("var workerDataToObject = " + funcToStr(workerDataToObject));
        code.push("var utils = " + staticCode);
        code.push("var elmer = " + coreCode);
        code.push(this.getInitPropsCode());
        code.push("onmessage = " + funcToStr(onmessage));
        return code.join("\r\n");
    }
}
