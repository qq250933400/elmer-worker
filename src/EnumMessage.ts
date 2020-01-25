export type EnumMessage = "InitObject" | "InitFunction" | "CallMethod" | "CallObjMethod";

export interface IMsgData {
    id: string;
    type: EnumMessage;
    data: any;
}

export interface ICallMethodMsgData extends IMsgData {
    obj?: any;
    method: string;
}

export interface IInitMsgData  extends IMsgData {
    globalName?: string;
}
export interface IWorkerResponse extends IMsgData {
    message: string;
    statusCode: number;
}
export interface IInitMsgResponse extends IMsgData {
    message: string;
    statusCode: number;
}
export interface ICallMethodResponse extends IMsgData {
    statusCode: number | string;
    message?: string;
}

export interface IWorkerErrorResponse  extends ICallMethodResponse {
    error?: Error;
}

export default {};
