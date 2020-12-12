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
            const objKey = (<ICallMethodMsgData>msgData).obj;
            const callbackName = (<ICallMethodMsgData>msgData).method;
            let selfFunc:Function;
            if(msgType === "CallObjMethod") {
                let runCode = `var fn = ${objKey}.${callbackName};\r\n`;
                if(dataType === "[object Array]") {
                    runCode += `return fn.apply(${objKey}, argv);\r\n`;
                } else {
                    runCode += `return fn(argv);\r\n`;
                }
                selfFunc = new Function("argv", runCode);
            } else {
                if(dataType === "[object Array]") {
                    selfFunc = new Function('argv', `return ${callbackName}.apply(self, argv);`);
                } else {
                    selfFunc = new Function('argv', `return ${callbackName}(argv);`);
                }
            }
            if(typeof selfFunc === "function") {
                let callResult = selfFunc(msgData.data);
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
export const objectToWorkerCode = (obj:object, className:string): string => {
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
    result += `    return ${innerObjKey};\r\n`;
    result += "})();\r\n";
    result = result.replace(/\sthis\./g, [" ", innerObjKey, "."].join(""))
        .replace(/\!this\./g, ["!", innerObjKey, "."].join(""))
        .replace(/([\(\&\|\=\;])this\./g, ["$1", innerObjKey, "."].join(""))
        ;
    return result;
};

export const classToWorkerCode = (func:Function): string => {
    // const innerObjKey = className + (new Date()).format("YYYYMMDDHisms");
    const coreCode = func.toString().replace(/^function\s[a-z0-9\_]{1,}\s*\(/i,"");
    const defineName = func.name;
    let code = `(function(){\r\n`;
    code += `    function ${defineName}(${coreCode};\r\n`;
    Object.keys(func).map((funcKey: string) => {
        let fCode = func[funcKey];
        if(typeof fCode === "object") {
            fCode = JSON.stringify(fCode, null, 4);
        } else if(typeof fCode === "function") {
            fCode = fCode.toString();
        }
        code += `    ${defineName}.${funcKey} = ${fCode};\r\n`;
    });
    code += `    return ${defineName};\r\n`;
    code += "})();";
    return code;
} 

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
