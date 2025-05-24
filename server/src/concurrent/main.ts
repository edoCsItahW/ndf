// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn

/**
 * @file main.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/30 11:20
 * @desc 并行框架
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { fork, ChildProcess } from "child_process";
import {
    DataProtocol,
    ConcurrentConfig,
    Nullable, ProcRequData, ProcRequEnd, ProcRequTask, ProcRespData, ProcRespEnd, ProcRespResult,
    ProcRespTask, ThreadRequData, ThreadRequEnd,
    ThreadRequTask, ThreadRespData, ThreadRespEnd, ThreadRespError,
    ThreadRespResult
} from "../types";
import { join } from "node:path";
import { deserialize as utilDeserialize, serialize as utilSerialize, serializeSafe, deserializeSafe, Queue } from "../utils";
import { parentPort, Worker, workerData } from "node:worker_threads";
import { cpus } from "os";
import { regexStack } from "../debug";



export function serialize<T extends DataProtocol>(msg: T): string {
    return utilSerialize(msg);
}

export function deserialize<T extends DataProtocol>(msg: string): T {
    return utilDeserialize(msg) as T;
}


const DefaultGBConfig: ConcurrentConfig = {
    processNum: Math.floor(cpus().length / 2),
    threadNum: Math.floor(cpus().length / 2),
    asyncNum: 10,
    threadUpload: true,
    debug: false
};


export class Master<T> {
    private processes: ChildProcess[] = [];
    private queue = new Queue<T>();
    private endFlag = false;
    private active: number;
    private readonly cfg: ConcurrentConfig;
    private sucessCb: Nullable<Function>;

    constructor(private processor: (task: T) => any | Promise<any>, cfg?: Partial<ConcurrentConfig>) {
        this.cfg = Object.assign(DefaultGBConfig, cfg);

        this.active = this.cfg.processNum;

        this.init();
        this.setup();
    }

    private init() {
        this.processes = Array.from({ length: this.cfg.processNum }, (_, i) =>
            fork(join(__dirname, "process.js"), [i.toString(), serializeSafe(this.processor), serializeSafe(this.cfg)])
        );
    }

    private setup() {
        // 监听子进程消息
        this.processes.forEach((process, pid) => {
            process.on("message", async (msg: string) => {
                const data = deserialize<ProcRespData>(msg);

                switch (data.type) {
                    // 子进程请求分发任务
                    case "task":
                        if (this.endFlag && await this.queue.empty())
                            this._shutdown();

                        else {
                            const task = await this.queue.get();

                            if (this.cfg.debug)
                                console.log(`[Main Process -> pid: ${pid}] task: { tid: ${data.data}, task: ${task} }`);

                            process.send(serialize<ProcRequTask>({ type: "task", data: { tid: data.data, task: task } }));
                        }

                        break;

                    case "result":
                        this.cfg.processHandler?.(data.data);

                        break;

                    case "end":
                        if (data.data === "yes") {
                            this.active--;
                            process.kill();
                        }

                        if (this.active === 0)
                            this.sucessCb?.();

                        break;
                }
            });

            process.on("error", err => {
                const info = regexStack(err.stack || "");

                console.error(`[Main Process] error: ${err.message}, ${info.stack.map(e => `\n${e.file}, line ${e.line} in ${e.func}`)}`);
            });
        });
    }

    submit(task: T) {
        this.queue.putNoWait(task);
    }

    private _shutdown() {
        this.processes.forEach((process, pid) => {
            if (process.connected && !process.killed) {
                if (this.cfg.debug)
                    console.log(`[Main Process -> pid: ${pid}] end`);

                process.send(serialize<ProcRequEnd>({ type: "end" }));
            }
        });
    }

    shutdown(cb?: Function) {
        this.endFlag = true;
        this.sucessCb = cb;
    }
}


export class ProcessWorker {
    private threads: Worker[] = [];
    private active: number;
    private readonly cfg: ConcurrentConfig;
    private readonly pid: number;
    private readonly _processorLiteral: string;
    private readonly _cfgLiteral: string;

    constructor() {
        const [pidLiteral, processorLiteral, cfgLiteral] = process.argv.slice(2);
        this.pid = parseInt(pidLiteral);
        this._cfgLiteral = cfgLiteral;
        this._processorLiteral = processorLiteral;

        this.cfg = deserializeSafe(cfgLiteral);
        this.active = this.cfg.threadNum;

        this.init();
        this.setup();
    }

    private init() {
        this.threads = Array.from({ length: this.cfg.threadNum }, (_, i) =>
            new Worker(join(__dirname, "thread.js"), {
                workerData: {
                    pid: this.pid, tid: i, cfg: this._cfgLiteral, processor: this._processorLiteral
                }
            })
        );
    }

    private setup() {
        // 监听父进程消息
        process.on("message", (msg: string) => {
            const data = deserialize<ProcRequData>(msg);

            switch (data.type) {
                // 父进程发回任务
                case "task":
                    for (const task of this.cfg.threadDisruptor ? this.cfg.threadDisruptor(data.data.task) : [data.data.task]) {
                        if (task) {
                            if (this.cfg.debug)
                                console.log(`[pid: ${this.pid} -> tid: ${data.data.tid}] task: ${task}`);

                            this.threads[data.data.tid].postMessage(serialize<ThreadRequTask>({ type: "task", data: task }));

                        }
                    }

                    break;

                case "end":
                    this.threads.forEach((thread, tid) => {

                        if (this.cfg.debug)
                            console.log(`[pid: ${this.pid} -> tid: ${tid}] end`);

                        thread.postMessage(serialize<ThreadRequEnd>({ type: "end" }));
                    });

                    break;
            }
        });

        // 监听子线程消息
        this.threads.forEach((thread, tid) => {
                thread.on("message", (msg: string) => {
                    const data = deserialize<ThreadRespData>(msg);

                    switch (data.type) {
                        // 子线程请求分发任务
                        case "task":
                            if (this.cfg.debug)
                                console.log(`[pid: ${this.pid} -> Main Process] task: ${tid}`);

                            // @ts-ignore
                            process.send(serialize<ProcRespTask>({ type: "task", data: tid }));

                            break;

                        case "result":
                            const result = this.cfg.threadHandler?.(data.data) || data.data;

                            if (this.cfg.threadUpload) {
                                if (this.cfg.debug)
                                    console.log(`[pid: ${this.pid} -> Main Process] result: ${result}`);

                                // @ts-ignore
                                process.send(serialize<ProcRespResult>({ type: "result", data: result }));
                            }

                            break;

                        case "error":
                            console.error(`error: ${data.data}`);

                            break;

                        case "end":
                            if (data.data === "yes") {
                                this.active--;
                                thread.terminate();
                            }

                            if (this.active <= 0) {
                                if (this.cfg.debug)
                                    console.log(`[pid: ${this.pid} -> Main Process] end: yes`);

                                // @ts-ignore
                                process.send(serialize<ProcRespEnd>({ type: "end", data: "yes" }));
                            }
                    }
                });

                thread.on("error", err => {
                    const info = regexStack(err.stack || "");

                    console.error(`[pid: ${this.pid}] error: ${err.message}, ${info.stack.map(e => `${e.file}, line ${e.line} in ${e.func}\n`)}`);
                });
            }
        );
    }
}


export class ThreadWorker {
    private queue = new Queue();
    private freeCount = 0;
    private endFlag = false;
    private taskCount = new SharedArrayBuffer(16);
    private taskCountView = new Int32Array(this.taskCount);
    private readonly cfg: ConcurrentConfig;
    private readonly tid: number;
    private readonly pid: number;
    private readonly processor: (task: any) => any | Promise<any>;

    constructor() {
        this.pid = workerData.pid;
        this.tid = workerData.tid;
        this.cfg = deserializeSafe(workerData.cfg);
        this.processor = deserializeSafe(workerData.processor);
        this.freeCount = this.cfg.asyncNum;

        this.setup();
    }

    get endAble(): boolean {
        this.queue.empty().then(flag => {
            return flag && this.freeCount === this.cfg.asyncNum && this.taskCountView[0] <= 0;
        });

        return true;
    }

    private setup() {
        if (this.cfg.debug)
            console.log(`[tid: ${this.tid} -> pid: ${this.pid}] task: ${this.tid}`);

        parentPort?.postMessage(serialize<ThreadRequTask>({ type: "task", data: this.tid }));

        // 监听父进程消息
        parentPort?.on("message", async (msg: string) => {
            const data = deserialize<ThreadRequData>(msg);

            switch (data.type) {
                // 父进程发回任务
                case "task":
                    for (const task of this.cfg.asyncDisruptor ? this.cfg.asyncDisruptor(data.data) : [data.data]) {
                        if (task) {
                            Atomics.add(this.taskCountView, 0, 1);

                            await this.queue.put(task);

                        }
                    }

                    // TODO: 需要更改,这里队列中传入了任务，结果又单独拿这个任务进行了处理，造成了重复，使用next()
                    this.process(data.data);

                    break;

                case "end":
                    this.endFlag = true;

                    const flag = this.endAble ? "yes" : "no";

                    if (this.cfg.debug)
                        console.log(`[tid: ${this.tid} -> pid: ${this.pid}] end: ${flag}`);

                    parentPort?.postMessage(serialize<ThreadRespEnd>({ type: "end", data: flag }));
            }
        });
    }

    private async next() {
        if (this.endFlag && this.endAble) {
            if (this.cfg.debug)
                console.log(`[tid: ${this.tid} -> pid: ${this.pid}] end: yes`);

            parentPort?.postMessage(serialize<ThreadRespEnd>({ type: "end", data: "yes" }));

            return;
        }

        if (!await this.queue.empty() && this.freeCount > 0) {
            const task = await this.queue.get();

            if (task)
                this.process(task);
        }

        else {
            if (this.cfg.debug)
                console.log(`[tid: ${this.tid} -> pid: ${this.pid}] task: ${this.tid}`);

            parentPort?.postMessage(serialize<ThreadRequTask>({ type: "task", data: this.tid }));
        }
    }

    private response(result: any) {
        if (this.cfg.debug)
            console.log(`[tid: ${this.tid} -> pid: ${this.pid}] result: ${result}`);

        parentPort?.postMessage(serialize<ThreadRespResult>({
            type: "result",
            data: result
        }));
    }

    private async process(task: any) {
        this.freeCount--;

        try {
            const result = this.processor(task);

            if (result) {
                if (result instanceof Promise) {
                    const res = await result;

                    this.response(res);
                }
                else
                    this.response(result);
            }
        } catch (e) {
            if (this.cfg.debug)
                console.log(`[tid: ${this.tid} -> pid: ${this.pid}] error: ${(e as Error).message}`);

            const info = regexStack((e as Error).stack || "");

            parentPort?.postMessage(serialize<ThreadRespError>({
                type: "error",
                data: `${(e as Error).message}, ${info.stack.map(e => `\n${e.file}, line ${e.line} in ${e.func}`)}`
            }));

        } finally {
            this.freeCount++;
            Atomics.sub(this.taskCountView, 0, 1);
            this.next();
        }
    }
}


//if (require.main === module) {
//    const gb = new Master<number>(task => -task, { debug: true, processNum: 1, threadNum: 1,
//        processHandler: result => console.log(`process result: ${result}`),
//        threadHandler: result => console.log(`thread result: ${result}`)
//    });
//
//    for (let i = 0; i < 100; i++)
//        gb.submit(i);
//
//    gb.shutdown();
//}
