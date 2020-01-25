import { objectToWorkerCode, objectToWorkerData, workerDataToObject } from "./StaticFunc";

export * from "./ElmerWorkerType";
export * from "./ElmerWorker";
export * from "./EnumMessage";

export const objectToWorkerCodeFn = objectToWorkerCode;
export const objectToWorkerDataFn = objectToWorkerData;
export const workerDataToObjectFn = workerDataToObject;
