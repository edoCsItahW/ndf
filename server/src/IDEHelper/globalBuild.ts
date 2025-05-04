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
import { join} from "node:path";
import { Master } from "../concurrent";
import { glob } from "fast-glob";
import { IFileCache, IGlobalCache, MiddleData, Nullable } from "../types";
import { existsSync, promises, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { serializeFuncWarpper } from "../utils";
import { analyze } from "../parser";
import { cpus } from "os";


export async function processor(task: MiddleData & { cacheDir: string }) {
    const content = await promises.readFile(task.filePath, "utf-8");

    const hash = createHash("md5").update(content).digest("hex");

    if (task.hash === hash)
        return;

    const { scope } = analyze(content);

    return { filePath: task.filePath, cacheDir: task.cacheDir, result: { symbols: scope.toJSON(true).symbols, hash: hash } };
}

type ResultType = Awaited<ReturnType<typeof processor>>;

export function processHandler(data: ResultType) {
    if (data) {
        console.log(`'${data.filePath}' -> '${data.result.hash}.json'`);

        writeFileSync(join(data.cacheDir, `${data.result.hash}.json`), JSON.stringify((({ cacheDir, ...prop}) => prop)(data), null, 4));
    }
}

type GBConfig = {
    ext: string;
    cacheDirName: string;
    cacheFileName: string;
    processNum: number;
    threadNum: number;
    asyncNum: number;
}

const DEFAULT_GBCONFIG: GBConfig = {
    ext: ".ndf",
    cacheDirName: ".ndf-cache",
    cacheFileName: "ndf",
    processNum: 3,
    threadNum: cpus().length / 2,
    asyncNum: 10
};

export class GlobalBuilder {
    readonly cacheDir: string;
    readonly cacheFile: string;
    readonly prjRoot: string;
    private readonly ext: string;
    private master: Master<MiddleData & { cacheDir: string }>;
    private readonly cfg: GBConfig;

    constructor(prjRoot: string, cfg?: Partial<GBConfig>) {
        this.cfg = Object.assign(DEFAULT_GBCONFIG, cfg);
        this.prjRoot = prjRoot;
        this.cacheDir = join(prjRoot, this.cfg.cacheDirName);

        if (!existsSync(this.cacheDir))
            mkdirSync(this.cacheDir);

        this.cacheFile = join(this.cacheDir, `${this.cfg.cacheFileName}.json`);
        this.ext = this.cfg.ext;

        this.master = new Master<MiddleData & { cacheDir: string }>(serializeFuncWarpper(processor, __filename), {
            debug: false,
            processNum: this.cfg.processNum,
            threadNum: this.cfg.threadNum,
            asyncNum: this.cfg.asyncNum,
            processHandler: serializeFuncWarpper(processHandler, __filename)
        });
    }

    private successCB() {
        const files = readdirSync(this.cacheDir);

        const results: IGlobalCache = {};

        files.forEach(file => {
            if (file.endsWith(".json")) {
                const fileCache: { filePath: string, result: IFileCache } = JSON.parse(readFileSync(join(this.cacheDir, file), "utf8"));

                results[fileCache.filePath] = fileCache.result;

                unlinkSync(join(this.cacheDir, file));
            }
        });

        if (existsSync(this.cacheFile)) {
            const cache: IGlobalCache = JSON.parse(readFileSync(this.cacheFile, "utf8"));

            for (const [key, value] of Object.entries(results))
                cache[key] = value;
        }

        writeFileSync(this.cacheFile, JSON.stringify(results, null, 4));

        console.log("Successfully generated file");
    }

    async build(cb?: Function) {
        const files = await glob(`**/*${this.ext}`, {
            cwd: this.prjRoot,
            absolute: true,
            ignore: ["**/node_modules/**", "**/*.json"]
        });

        let hashMap: Nullable<{ [key: string]: string }>;
        if (existsSync(this.cacheFile))
            hashMap = Object.entries(JSON.parse(readFileSync(this.cacheFile, "utf-8")) as IGlobalCache).reduce(
                (acc, [key, value]) => {
                    acc[key] = value.hash;
                    return acc;
                },
                {} as { [key: string]: string }
            );

        for (const file of files)
            this.master.submit({ filePath: file, hash: hashMap?.[file], cacheDir: this.cacheDir });

        this.master.shutdown(() => {
            this.successCB();
            cb?.();
        });
    }
}
