import { EnumMessage, ICallMethodMsgData, IInitMsgData, IMsgData } from "./EnumMessage";

export type WorkerObjectData = {
    data: any;
    funcData: any;
};
export const strToFunc = (funCode:string):Function => {
    return (new Function(`return ${funCode}`))();
};

export const funcToStr = (func:Function):string => {
    return typeof func === "function" ? func.toString() : "";
};
export const onmessage = (e:MessageEvent): void => {
    const msgData: IMsgData = e.data;
    const msgType: EnumMessage = msgData.type;
    const elmer:any = self["elmer"];
    const dataType: string = Object.prototype.toString.call(msgData.data);
    let tmpFn: Function;
    try {
        if(msgType === "InitObject") {
            self[(<IInitMsgData>msgData).globalName] = self["workerDataToObject"](msgData.data);
            elmer.sendMsg({
                id:msgData.id,
                message: "success",
                statusCode: 200,
                type: msgType
            });
            return;
        } else if(msgType === "InitFunction") {
            self[(<IInitMsgData>msgData).globalName] = self["strToFunc"](msgData.data);
            elmer.sendMsg({
                id:msgData.id,
                message: "success",
                statusCode: 200,
                type: msgType
            });
            return;
        } else if(msgType === "CallObjMethod" || msgType === "CallMethod") {
            tmpFn = msgType === "CallObjMethod" ? elmer.getValue(self, (<ICallMethodMsgData>msgData).obj)[(<ICallMethodMsgData>msgData).method] : self[(<ICallMethodMsgData>msgData).method];
            if(typeof tmpFn === "function") {
                let callResult = null;
                if(dataType === "[object Array]") {
                    callResult = tmpFn.apply(self, msgData.data);
                } else {
                    callResult = tmpFn(msgData.data);
                }
                elmer.sendMsg({
                    data: callResult,
                    id: msgData.id,
                    message: "",
                    statusCode: 200,
                    type: msgType
                });
            } else {
                elmer.sendMsg({
                    id: msgData.id,
                    message: tmpFn === undefined ? "The calling method is not defined" : "The specified object is not a function",
                    type: "CallObjMethod"
                });
            }
            return;
        }
    } catch (e) {
        // tslint:disable-next-line: no-console
        console.error(e);
        elmer.sendMsg({
            data: undefined,
            error: e,
            id: msgData.id,
            message: e.message,
            statusCode: 500,
            type: msgType
        });
    }
};

export const objectToWorkerData = (obj:object): WorkerObjectData => {
    const result:WorkerObjectData = {
        data: {},
        funcData: {}
    };
    if(typeof obj === "object") {
        for(const key in obj) {
            if(typeof obj[key] === "function") {
                result.funcData[key] = (<Function>obj[key]).toString();
            } else {
                result.data[key] = obj[key];
            }
        }
    }
    return result;
};
export const objectToWorkerCode = (obj:object, className:string): WorkerObjectData => {
    const innerObjKey = className + (new Date()).format("YYYYMMDDHisms");
    let result:any = "(function(){\r\n";
    result += `    function ${className}(){};\r\n`;
    if(typeof obj === "object") {
        // tslint:disable-next-line:forin
        for(const key in obj) {
            const tmpValue = obj[key];
            const tmpType = Object.prototype.toString.call(tmpValue);
            if(typeof tmpValue === "function") {
                const code = (<Function>tmpValue).toString();
                result += `    ${className}.prototype.${key} = ${code};\r\n`;
            } else if(tmpType === "[object RegExp]") {
                const regCode = (<RegExp>tmpValue).toString();
                result += `    ${className}.prototype.${key} = ${regCode};\r\n`;
            } else if(tmpType === "[object Array]") {
                const tmpResult = [];
                (<any[]>tmpValue).map((tmpItem:any) => {
                    if(Object.prototype.toString.call(tmpItem) === "[object RegExp]") {
                        tmpResult.push((<RegExp>tmpItem).toString());
                    } else {
                        tmpResult.push(JSON.stringify(tmpItem));
                    }
                });
                result += `    ${className}.prototype.${key} = [${tmpResult.join(",")}];\r\n` ;
            } else {
                result += `    ${className}.prototype.${key} = ${JSON.stringify(obj[key])};\r\n`;
            }
        }
    }
    result += `    var ${innerObjKey} = new ${className}();\r\n`;
    result += `    return ${innerObjKey};`;
    result += "})();\r\n";
    result = result.replace(/\sthis\./g, [" ", innerObjKey, "."].join(""))
        .replace(/\!this\./g, ["!", innerObjKey, "."].join(""))
        .replace(/([\(\&\|\=\;])this\./g, ["$1", innerObjKey, "."].join(""))
        ;
    return result;
};

export const workerDataToObject = (eventData:WorkerObjectData) => {
    const result = {};
    if(eventData) {
        if(eventData.data) {
            // tslint:disable-next-line:forin
            for(const key in eventData.data) {
                result[key] = eventData.data[key];
            }
        }
        if(eventData.funcData) {
            // tslint:disable-next-line:forin
            for(const key in eventData.funcData) {
                result[key] = self["strToFunc"](eventData.funcData[key]);
            }
        }
    }
    return result;
};

// tslint:disable-next-line: only-arrow-functions variable-name no-var-keyword
export const __spreadArrays = function():any[] {
    const il = arguments.length;
    let s = 0;
    for (let z = 0; z < il; z++) {
        s += arguments[z].length;
    }
    const r = Array(s);
    for (let k = 0, i = 0; i < il; i++) {
        for (let a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) {
            r[k] = a[j];
        }
    }
    return r;
};
