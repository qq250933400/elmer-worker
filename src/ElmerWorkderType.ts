export type ElmerWorkerMsgEvent<T> = {
    cancel?: boolean;
    srcEvent?: MessageEvent|ErrorEvent;
    data?: T;
    message?: any;
};
