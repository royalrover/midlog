'use strict';
import {Interfaces} from "@vdian/rocker";
let logFactory = require('./reqContainer');

declare type MidlogConfig = { 
    env: string,
    appender: {
        app: {
            type: string,
            logdir: string,
            pattern: string,
            rollingFile?: boolean,
            duation?: number,
            name: string,
            nameformat?: string,
            tokens?: object,
            cacheSize?: number,
            flushTimeout?: number
        }[],
        [propName: string]: {
            type: string,
            logdir: string,
            pattern: string,
            rollingFile?: boolean,
            duation?: number,
            name: string,
            nameformat?: string,
            tokens?: object,
            cacheSize?: number,
            flushTimeout?: number
        }[]
    }
};

export class MidLog extends Interfaces.Logger {

    constructor(){
        super();
    }

    public static singleton: {info: Function, trace: Function, error: Function};

    public static config (op: MidlogConfig){
        let Env = op.env || process.env.NODE_ENV || "development";
        let {Log} = logFactory(op);
        MidLog.singleton = Log({
            env: Env,
            appender: op.appender
        }).generate();
    }

    public info(data: string){
        MidLog.singleton.info(data);
    }

    public trace(data: string){
        MidLog.singleton.trace(data);
    }

    public error(data: string){
        MidLog.singleton.error(data);
    }

    public warn(data: string){
        MidLog.singleton.trace(data);
    }
}