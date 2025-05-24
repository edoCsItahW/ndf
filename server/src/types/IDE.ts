// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//


/**
 * @file IDE.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 20:48
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { ISymbolJSON } from "./analysis";
import { Nullable } from "./other";
import { Symbol } from "../parser";


export type Language = "en-US" | "zh-CN";

export type Level = "strict" | "loose" | "ignore";

export type PartialLocalet = (key: string, ...args: string[]) => string;


export interface ILocalePack {
    [file: string]: {
        [id: string]: {
            [lang in Language]: string;
        }
    };
}


export interface Pending {
    file: string;
    id: string;
    lang: Language;
}


export interface SymbolInfo {
    info: ISymbolJSON;
    file: string;
}


export interface DataProtocol {
    readonly type: string;
    readonly data?: any;
}


export type MiddleData = {
    filePath: string;
    hash: Nullable<string>;
};


// 父进程 -> 子进程 请求数据类型


export interface ProcRequTask extends DataProtocol {
    type: "task";
    data: {
        tid: number;
        task: any;
    };
}


export interface ProcRequEnd extends DataProtocol {
    type: "end";
}


export type ProcRequData = ProcRequTask | ProcRequEnd;


// 子进程 -> 父进程 请求数据类型


export interface ProcRespTask extends DataProtocol {
    type: "task";
    data: number;
}


export interface ProcRespResult extends DataProtocol {
    type: "result";
    data: any;
}


export interface ProcRespEnd extends DataProtocol {
    type: "end";
    data: "yes" | "no";
}


export type ProcRespData = ProcRespTask | ProcRespResult | ProcRespEnd;


// 父线程 -> 子线程 请求数据类型


export interface ThreadRequTask extends DataProtocol {
    type: "task";
    data: any;
}


export interface ThreadRequEnd extends DataProtocol {
    type: "end";
}


export type ThreadRequData = ThreadRequTask | ThreadRequEnd;


// 子线程 -> 父线程 响应数据类型


export interface ThreadRespTask extends DataProtocol {
    type: "task";
    data: number;
}


export interface ThreadRespResult extends DataProtocol {
    type: "result";
    data: any;
}


export interface ThreadRespError extends DataProtocol {
    type: "error";
    data: any;
}


export interface ThreadRespEnd extends DataProtocol {
    type: "end";
    data: "yes" | "no";
}


export type ThreadRespData = ThreadRespTask | ThreadRespResult | ThreadRespError | ThreadRespEnd;


export interface ConcurrentConfig {
    processNum: number;
    threadNum: number;
    asyncNum: number;
    threadUpload: boolean;
    threadDisruptor?: Disruptor;
    asyncDisruptor?: Disruptor;
    processHandler?: Handler;
    threadHandler?: Handler;
    debug: boolean;
}


export interface GBConfig {
    ext: string;
    cacheDirName: string;
    processNum: number;
    threadNum: number;
    asyncNum: number;
}


export type Disruptor = (data: any) => any | Promise<any>;

export type Handler = (data: any) => Nullable<any>;

type _alphabet<T extends string, Acc extends string = ""> =
    T extends `${infer Head}${infer Tail}`
        ? _alphabet<Tail, Acc | Head>
        : Acc;  // 最后会多出一个""

export type LowercaseAlphabet = Exclude<_alphabet<"abcdefghijklmnopqrstuvwxyz">, "">;
export type UppercaseAlphabet = Uppercase<LowercaseAlphabet>;
export type Letter = LowercaseAlphabet | UppercaseAlphabet;


export enum CompletionKind {
    Variable,
    Template,
    Keyword,
    Field,
    Operator
}

export interface CompletionItem {
    label: string;
    kind: CompletionKind;
    detail: string;
    documentation?: string;
    sortText?: string;
}

export interface CompletionContext {
    isNewStmt: boolean,
    isGlobalCompletion: boolean;
    isMemberCompletion: boolean;
    parentObject: Nullable<Symbol>;
}
