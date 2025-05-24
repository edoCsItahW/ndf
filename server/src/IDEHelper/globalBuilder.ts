/*
 * Copyright (c) 2025. All rights reserved.
 * This source code is licensed under the CC BY-NC-SA
 * (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
 * This software is protected by copyright law. Reproduction, distribution, or use for commercial
 * purposes is prohibited without the author's permission. If you have any questions or require
 * permission, please contact the author: 2207150234@st.sziit.edu.cn
 */

/**
 * @file main.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/28 02:15
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import { join, basename, extname } from "node:path";
import { Master } from "../concurrent";
import { glob } from "fast-glob";
import { GBConfig, LowercaseAlphabet, MiddleData, Nullable, SymbolInfo } from "../types";
import { existsSync, promises, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { serializeFuncWarpper } from "../utils";
import { analyze } from "../parser";
import { cpus } from "os";
import { RadixTree } from "../utils";


let cacheDir: string;
let cacheHashFile: string;
let prjRoot: string;
let ext: string;
let master: Master<MiddleData & { cacheDir: string }>;
let cfg: GBConfig;
let instance: GlobalBuilderIns;
const VERSION = "2.4.5";


/**
 * @constructor GlobalBuilder
 * @param prjRoot {string} 项目根目录
 * @param cfg {GBConfig} 配置项
 * @desc GlobalBuilder 构造函数
 * @return {GlobalBuilderIns} 返回 GlobalBuilder 实例
 * @remarks 单例模式
 * */
export const GlobalBuilder: GlobalBuilderConstructor = function(this: GlobalBuilderIns, prjRoot: string, cfg?: Partial<GBConfig>) {
    if (instance)
        return instance;

    GlobalBuilder.init.call(this, prjRoot, cfg);

    return instance = this;
} as unknown as GlobalBuilderConstructor;


/**
 * @method init
 * @desc 初始化 GlobalBuilder 实例
 * @param _prjRoot {string} 项目根目录
 * @param _cfg {GBConfig} 配置项
 * @return {void}
 * */
GlobalBuilder.init = function(this: GlobalBuilderIns, _prjRoot: string, _cfg?: Partial<GBConfig>): void {
    prjRoot = _prjRoot;
    cfg = Object.assign(DEFAULT_GBCONFIG, _cfg);
    cacheDir = join(prjRoot, cfg.cacheDirName);

    if (existsSync(cacheDir)) {
        if (!existsSync(join(cacheDir, VERSION))) {  // 旧版本缓存目录,删除
            readdirSync(cacheDir).forEach(file => unlinkSync(join(cacheDir, file)));
            // 创建版本标识文件
            writeFileSync(join(cacheDir, VERSION), "", "utf-8");
        }
    }

    else {
        mkdirSync(cacheDir);
        // 创建版本标识文件
        writeFileSync(join(cacheDir, VERSION), "", "utf-8");
    }

    cacheHashFile = join(cacheDir, "hash.json");
    ext = cfg.ext;

    master = new Master<MiddleData & { cacheDir: string }>(serializeFuncWarpper(processor, __filename), {
        debug: false,
        processNum: cfg.processNum,
        threadNum: cfg.threadNum,
        asyncNum: cfg.asyncNum,
        threadUpload: false,
        threadHandler: serializeFuncWarpper(threadHandler, __filename)
    });
};


/**
 * @method build
 * @desc 构建项目
 * @param cb {Function} 构建完成回调函数
 * @return {Promise<void>} 返回 Promise<void>
 * */
GlobalBuilder.prototype.build = async function(this: GlobalBuilderIns, cb?: Function): Promise<void> {
    const files = await glob(`**/*${ext}`, {
        cwd: prjRoot,
        absolute: true,
        ignore: ["**/node_modules/**", "**/*.json"]
    });

    let hashMap: Nullable<{ [key: string]: string }>;
    if (existsSync(cacheHashFile))
        hashMap = JSON.parse(readFileSync(cacheHashFile, "utf-8"));

    for (const file of files)
        master.submit({ filePath: file, cacheDir: cacheDir, hash: hashMap?.[file] });

    master.shutdown(() => {
        this.sucessCB();
        cb?.();
    });
};


export async function processor(this: GlobalBuilderIns, task: MiddleData & { cacheDir: string }) {
    const content = await promises.readFile(task.filePath, "utf-8");

    const hash = createHash("md5").update(content).digest("hex");

    if (task.hash === hash)
        return;

    const { scope } = analyze(content);

    return { filePath: task.filePath, cacheDir: task.cacheDir, symbols: scope.toJSON(true).symbols, hash: hash };
}


GlobalBuilder.prototype.processor = processor;


type ResultType = Awaited<ReturnType<typeof processor>>;


export function threadHandler(this: GlobalBuilderIns, data: ResultType) {
    if (!data)
        return;

    const fileHash = createHash("md5").update(data.filePath).digest("hex");

    const cacheFilePath = join(data.cacheDir, `${fileHash}.json`);

    const { cacheDir, ...rest } = data;

    writeFileSync(cacheFilePath, JSON.stringify(rest, null, 4), "utf-8");
}


GlobalBuilder.prototype.threadHandler = threadHandler;


Object.defineProperty(GlobalBuilder.prototype, "cacheDir", {
    get() {
        return cacheDir;
    },
    enumerable: true,
    configurable: true
});


GlobalBuilder.prototype.sucessCB = function(this: GlobalBuilderIns) {
    const hashMap: { [key: string]: string } = {};
    const procssResult = new Map<LowercaseAlphabet, RadixTree<SymbolInfo>>();

    for (const file of readdirSync(cacheDir)) {
        if (file.endsWith(".json") && basename(file).replace(extname(file), "").length === 32) {
            const filePath = join(cacheDir, file);

            const data = JSON.parse(readFileSync(filePath, "utf-8")) as NonNullable<ResultType>;

            hashMap[data.filePath] = data.hash;

            for (const name in data.symbols) {
                const prefix = name[0].toLowerCase() as LowercaseAlphabet;

                if (procssResult.has(prefix))
                    procssResult.get(prefix)!.insert(name, { info: data.symbols[name], file: data.filePath });

                else {
                    let tree = new RadixTree<SymbolInfo>();
                    const treePath = join(cacheDir, `${prefix.toLowerCase()}.json`);

                    if (existsSync(join(treePath)))
                        tree = RadixTree.deserialize<SymbolInfo>(readFileSync(treePath, "utf-8"));

                    tree.insert(name, { info: data.symbols[name], file: data.filePath });
                    procssResult.set(prefix, tree);
                }
            }

            unlinkSync(filePath);
        }
    }

    if (Object.keys(hashMap).length)
        if (existsSync(cacheHashFile)) {
            const oldMap = JSON.parse(readFileSync(cacheHashFile, "utf-8"));
            Object.assign(oldMap, hashMap);
            writeFileSync(cacheHashFile, JSON.stringify(oldMap, null, 4), "utf-8");

        } else
            writeFileSync(cacheHashFile, JSON.stringify(hashMap, null, 4), "utf-8");

    for (const [prefix, tree] of procssResult)
        writeFileSync(join(cacheDir, `${prefix.toLowerCase()}.json`), tree.serialize(), "utf-8");
};


export interface GlobalBuilderIns {
    readonly cacheDir: string;
    readonly prjRoot: string;
    readonly ext: string;
    master: Master<MiddleData & { cacheDir: string }>;
    readonly cfg: GBConfig;

    sucessCB(this: GlobalBuilderIns): void;

    build(this: GlobalBuilderIns, cb?: Function): Promise<void>;

    processor(this: GlobalBuilderIns, task: MiddleData & { cacheDir: string }): Promise<Nullable<ResultType>>;

    threadHandler(this: GlobalBuilderIns, data: ResultType): void;
}


export interface GlobalBuilderConstructor {
    new(prjRoot: string, cfg?: Partial<GBConfig>): GlobalBuilderIns;

    init: (this: GlobalBuilderIns, prjRoot: string, cfg?: Partial<GBConfig>) => void;
}


const DEFAULT_GBCONFIG: GBConfig = {
    ext: ".ndf",
    cacheDirName: ".ndf-cache",
    processNum: 3,
    threadNum: cpus().length / 2,
    asyncNum: 10
};

