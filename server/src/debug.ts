// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

import {IError} from "./types";


/**
 * @file debug.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/17 12:47
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */


export function methodDebug(cb: (obj: any, fnName: string, ...cbArgs: any[]) => void, ...cbArgs: any[]) {
    return function (target: Function, context: ClassMethodDecoratorContext) {
        return function (this: object, ...args: any[]): any {
            cb(this, context.name as string, ...cbArgs);

            return target.apply(this, args);
        }
    }
}


/** @function regexStack
 * @desc 解析错误栈
 * @param {string} stack - 错误栈字符串
 * @returns {object} - 包含错误信息和错误栈的对象
 * @example
 * try {
 * 	// 可能产生异常的代码
 * } catch (e) {
 * 	const {msg, stack} = regexStack(e.stack);
 * 	console.error(`Traceback (most recent call last):`);
 * 	console.error(`    File "${stack[0].file}", line ${stack[0].line}, in <${stack[0].func}>\n\t${msg}`);
 * }
 * */
export function regexStack(stack: string): {
    msg: string;
    stack: IError[];
} {
    const stackRegex: RegExp = /(?<=at)\s+([^(]+?)\s+[(]([^)]+):(\d+):(\d+)[)]/g;  // 如: at Function.main (server.ts:12:13)

    const matches: IError[] = [];
    let match: RegExpExecArray | null;

    while ((match = stackRegex.exec(stack)) !== null) {
        matches.push({
            func: match[1] || "main",
            file: match[2] || "unknown",
            line: match[3]
        });
    }

    return {msg: stack.match(/^(.*?)(?=\n)/)?.[1] || "", stack: matches};
}


export function getStackTrace(): { file: string, line: number } {
    const err = new Error();
    const stacks = err.stack?.split("\n");

    if (stacks && stacks.length > 2) {
        const line = stacks[2];
        const match = line.match(/at\s+.*\((.*):(\d+):(\d+)\)/);

        if (match) return {file: match[1], line: parseInt(match[2])};
    }

    return {file: "unknown", line: 0};
}


let FIRST: boolean = true;

/**
 * @func traceback
 * @summary 异常捕获装饰器
 * @desc 捕获异常并打印异常栈信息
 * @param {boolean} [exit=false] - 是否退出程序
 * @returns {function} - 装饰器函数
 * @example
 * class A {
 * 	@traceback()
 * 	method() {
 * 		// 异常发生时会打印异常栈信息
 * 	}
 * }
 * */
export function traceback(exit: boolean = false) {
    return function (orgMth: Function, context: ClassMethodDecoratorContext) {
        return function (this: any, ...args: any[]) {
            try {
                return orgMth.apply(this, args);
            } catch (e: any) {
                if (!this.raise)
                    throw e;

                const {msg, stack} = regexStack(e.stack);

                if (FIRST) {  // 确保仅在第一次调用时打印
                    console.error(`Traceback (most recent call last):`);
                    FIRST = false;
                }

                console.error(`    File "${stack[0].file}", line ${stack[0].line}, in <${orgMth.name}>\n\t${e.message}`);

                if (exit) process.exit(1);
            }
        }
    }
}
